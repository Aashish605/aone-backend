import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { Op } from 'sequelize';
import db from '../models/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { triggerConversationEvent } from '../services/pusher.service.js';
import { subscribeInstagramAccount, resolveInstagramCustomer } from '../services/instagram.service.js';

const GRAPH_BASE = 'https://graph.instagram.com/v21.0';

function connect(req: Request, res: Response) {
  if (!req.query.userId) {
    return res.status(400).send('Missing userId parameter');
  }

  const state = JSON.stringify({ userId: req.query.userId as string });

  const params = new URLSearchParams({
    client_id: process.env.INSTA_APP_ID!,
    redirect_uri: process.env.INSTA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_manage_messages',
  });
  if (state) params.set('state', state);

  res.redirect(`https://www.instagram.com/oauth/authorize?${params.toString()}`);
}

async function callback(req: Request, res: Response) {
  const { code, error, state } = req.query;

  if (error) {
    console.error('Instagram OAuth error:', error);
    return res.status(400).send('Instagram connection was cancelled or failed.');
  }
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  let userId: string | null = null;
  if (state) {
    try {
      const parsed = JSON.parse(state as string);
      userId = parsed.userId || null;
    } catch {
      // invalid state, ignore
    }
  }

  if (!userId) {
    return res.status(400).send('Missing userId in state — connect must include ?userId=');
  }

  try {
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      new URLSearchParams({
        client_id: process.env.INSTA_APP_ID!,
        client_secret: process.env.INSTA_APP_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTA_REDIRECT_URI!,
        code: code as string,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const accessToken = tokenRes.data.access_token;
    const igUserId = tokenRes.data.user_id;

    let name = String(igUserId);
    let username = '';
    try {
      const profileRes = await axios.get(`${GRAPH_BASE}/${igUserId}`, {
        params: { fields: 'id,username,name,profile_picture_url', access_token: accessToken },
      });
      name = profileRes.data.name || profileRes.data.username || String(igUserId);
      username = profileRes.data.username || '';
    } catch {
      console.log('Could not fetch IG profile');
    }

    const where: any = { external_account_id: String(igUserId) };
    if (userId) where.user_id = userId;

    const existing = await db.Channel.findOne({ where });

    if (existing) {
      existing.access_token = encrypt(accessToken);
      existing.name = name;
      existing.status = 'active';
      await existing.save();
    } else {
      await db.Channel.create({
        type: 'instagram' as const,
        name,
        user_id: userId,
        external_account_id: String(igUserId),
        access_token: encrypt(accessToken),
        webhook_verify_token: crypto.randomBytes(16).toString('hex'),
        status: 'active' as const,
      });
    }

    await subscribeInstagramAccount(String(igUserId), accessToken);

    res.redirect(
      `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/chats?instagram_connected=true`,
    );
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    const detail = axiosErr.response?.data || axiosErr.message;
    console.error('Instagram connect error:', detail);
    res.status(500).json({ error: 'Failed to connect Instagram account', detail });
  }
}

function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('IG Webhook verify:', { mode, token, verifyToken: process.env.INSTA_WEBHOOK_VERIFY_TOKEN });

  if (mode === 'subscribe' && token === process.env.INSTA_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature) {
      const expectedHash = crypto
        .createHmac('sha256', process.env.INSTA_APP_SECRET!)
        .update((req as any).rawBody)
        .digest('hex');
      const expected = `sha256=${expectedHash}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.sendStatus(403);
      }
    }

    const body = req.body;
    if (!body || body.object !== 'instagram') {
      return res.sendStatus(200);
    }

    await db.WebhookEvent.create({
      channel_id: null,
      payload: body,
      processed: false,
    });

    for (const entry of body.entry || []) {
      const channel = await db.Channel.findOne({
        where: { external_account_id: String(entry.id), type: 'instagram' },
      });
      if (!channel || !channel.access_token) {
        console.log(`IG webhook: no channel for entry ${entry.id}`);
        continue;
      }

      const accessToken = decrypt(channel.access_token);

      for (const event of entry.messaging || []) {
        if (event.message) {
          const igUserId = event.sender.id;
          const customer = await resolveInstagramCustomer(channel, igUserId, accessToken);

          let conversation = await db.Conversation.findOne({
            where: { customer_id: customer.id, channel_id: channel.id, status: 'open' },
          });
          if (!conversation) {
            conversation = await db.Conversation.create({
              customer_id: customer.id,
              channel_id: channel.id,
              status: 'open',
            });
          }

          const attachmentType = event.message.attachments?.[0]?.type;
          const messageType = attachmentType === 'image' || attachmentType === 'video' ? attachmentType : 'text';
          const mediaUrl = event.message.attachments?.[0]?.payload?.url || null;

          const message = await db.Message.create({
            conversation_id: conversation.id,
            sender_type: 'customer',
            sender_id: customer.id,
            external_message_id: event.message.mid,
            content: event.message.text || null,
            message_type: messageType,
            media_url: mediaUrl,
            status: 'sent',
            raw_payload: event,
          });

          conversation.last_message_at = new Date();
          await conversation.save();

          await triggerConversationEvent(conversation.id, 'message:new', message);
        }

        if (event.postback) {
          const igUserId = event.sender.id;
          const customer = await resolveInstagramCustomer(channel, igUserId, accessToken);

          let conversation = await db.Conversation.findOne({
            where: { customer_id: customer.id, channel_id: channel.id, status: 'open' },
          });
          if (!conversation) {
            conversation = await db.Conversation.create({
              customer_id: customer.id,
              channel_id: channel.id,
              status: 'open',
            });
          }

          await db.Message.create({
            conversation_id: conversation.id,
            sender_type: 'customer',
            sender_id: customer.id,
            content: event.postback.title || event.postback.payload || null,
            message_type: 'text',
            status: 'sent',
            raw_payload: event,
          });

          conversation.last_message_at = new Date();
          await conversation.save();
        }

        if (event.read) {
          const identity = await db.CustomerChannelIdentity.findOne({
            where: { channel_id: channel.id, external_user_id: event.sender.id },
          });
          if (identity) {
            const conversation = await db.Conversation.findOne({
              where: { customer_id: identity.customer_id, channel_id: channel.id },
              order: [['created_at', 'DESC']],
            });
            if (conversation) {
              await db.Message.update(
                { status: 'read' },
                {
                  where: {
                    conversation_id: conversation.id,
                    sender_type: 'agent',
                    status: { [Op.ne]: 'read' },
                  },
                },
              );
              await triggerConversationEvent(conversation.id, 'messages:updated', {
                conversationId: conversation.id,
                reason: 'read',
              });
            }
          }
        }

        if (event.delivery) {
          const mids = event.delivery.mids;
          if (mids?.length) {
            await db.Message.update(
              { status: 'delivered' },
              { where: { external_message_id: mids, status: 'sent' } },
            );
            const deliveredMsg = await db.Message.findOne({
              where: { external_message_id: mids },
            });
            if (deliveredMsg) {
              await triggerConversationEvent(deliveredMsg.conversation_id, 'messages:updated', {
                conversationId: deliveredMsg.conversation_id,
                reason: 'delivery',
              });
            }
          } else if (event.sender?.id) {
            const identity = await db.CustomerChannelIdentity.findOne({
              where: { channel_id: channel.id, external_user_id: event.sender.id },
            });
            if (identity) {
              const conversation = await db.Conversation.findOne({
                where: { customer_id: identity.customer_id, channel_id: channel.id },
                order: [['created_at', 'DESC']],
              });
              if (conversation) {
                await db.Message.update(
                  { status: 'delivered' },
                  {
                    where: {
                      conversation_id: conversation.id,
                      sender_type: 'agent',
                      created_at: { [Op.lte]: new Date(event.delivery.watermark) },
                      status: 'sent',
                    },
                  },
                );
                await triggerConversationEvent(conversation.id, 'messages:updated', {
                  conversationId: conversation.id,
                  reason: 'delivery',
                });
              }
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('IG Webhook error:', err instanceof Error ? err.message : String(err));
    res.sendStatus(200);
  }
};

export { connect, callback, verifyWebhook, handleWebhook };
