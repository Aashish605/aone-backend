import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import db from '../models/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { requireSession, AuthenticatedRequest } from '../middlewares/session.middleware.js';

const router = Router();

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function subscribePage(pageId: string, accessToken: string) {
  try {
    await axios.post(`${GRAPH_BASE}/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages,messaging_postbacks,message_deliveries',
      },
    });
    console.log(`Subscribed page ${pageId} to webhooks`);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    console.error(`Failed to subscribe page ${pageId}:`, axiosErr.response?.data || axiosErr.message);
  }
}

async function resolveFacebookCustomer(channel: any, psid: string, pageToken: string): Promise<any> {
  const existingIdentity = await db.CustomerChannelIdentity.findOne({
    where: { channel_id: channel.id, external_user_id: psid },
    include: [{ model: db.Customer, as: 'customer' }],
  });
  if (existingIdentity) return (existingIdentity as any).customer;

  let name: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const userRes = await axios.get(`${GRAPH_BASE}/${psid}`, {
      params: { fields: 'name,picture', access_token: pageToken },
    });
    name = userRes.data.name || null;
    avatarUrl = userRes.data.picture?.data?.url || null;
  } catch {
    console.log(`Could not fetch profile for PSID ${psid}`);
  }

  const customer = await db.Customer.create({ name, avatar_url: avatarUrl });
  await db.CustomerChannelIdentity.create({
    customer_id: customer.id,
    channel_id: channel.id,
    external_user_id: psid,
  });
  return customer;
}

router.get('/connect', (req: Request, res: Response) => {
  const state = req.query.channelId ? JSON.stringify({ channelId: req.query.channelId }) : '';

  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID!,
    redirect_uri: process.env.FB_REDIRECT_URI!,
    scope: 'pages_show_list,pages_messaging,pages_manage_metadata,instagram_basic,instagram_manage_messages',
    response_type: 'code',
  });

  if (state) params.set('state', state);

  res.redirect(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, error, state } = req.query;

  if (error) {
    console.error('Facebook OAuth error:', error);
    return res.status(400).send('Facebook connection was cancelled or failed.');
  }

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  let reconnectChannelId: string | null = null;
  if (state) {
    try {
      const parsed = JSON.parse(state as string);
      reconnectChannelId = parsed.channelId || null;
    } catch {
      // invalid state, ignore
    }
  }

  try {
    const tokenRes = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
      params: {
        client_id: process.env.FB_APP_ID!,
        client_secret: process.env.FB_APP_SECRET!,
        redirect_uri: process.env.FB_REDIRECT_URI!,
        code: code as string,
      },
    });
    const shortLivedToken = tokenRes.data.access_token;

    const longTokenRes = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FB_APP_ID!,
        client_secret: process.env.FB_APP_SECRET!,
        fb_exchange_token: shortLivedToken,
      },
    });
    const longLivedUserToken = longTokenRes.data.access_token;

    const pagesRes = await axios.get(`${GRAPH_BASE}/me/accounts`, {
      params: { access_token: longLivedUserToken },
    });
    const pages = pagesRes.data.data as Array<{
      id: string;
      name: string;
      access_token: string;
      category: string;
    }>;

    if (!pages.length) {
      return res.status(400).send('No Facebook Pages found for this account.');
    }

    const updatedChannels = [];

    for (const page of pages) {
      const existing = await db.Channel.findOne({
        where: { external_account_id: page.id },
      });

      if (existing) {
        existing.access_token = encrypt(page.access_token);
        existing.status = 'active';
        await existing.save();
        updatedChannels.push(existing);
        await subscribePage(page.id, page.access_token);
        continue;
      }

      const channel = await db.Channel.create({
        type: 'facebook' as const,
        name: page.name,
        external_account_id: page.id,
        access_token: encrypt(page.access_token),
        webhook_verify_token: crypto.randomBytes(16).toString('hex'),
        status: 'active' as const,
      });

      updatedChannels.push(channel);
      await subscribePage(page.id, page.access_token);
    }

    if (reconnectChannelId) {
      const target = updatedChannels.find(c => c.id === reconnectChannelId);
      if (target) {
        return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/chats?reconnected=true&channelId=${target.id}`);
      }
    }

    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/chats?connected=true&count=${updatedChannels.length}`);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    console.error('Facebook connect error:', axiosErr.response?.data || axiosErr.message);
    res.status(500).send('Failed to connect Facebook account.');
  }
});

router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verify:', { mode, token, challenge, verifyToken: process.env.FB_WEBHOOK_VERIFY_TOKEN });

  if (mode === 'subscribe' && token === process.env.FB_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.put('/:channelId/disconnect', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  const channel = await db.Channel.findByPk(req.params.channelId as string);
  if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

  channel.access_token = null;
  channel.status = 'disconnected';
  await channel.save();

  res.json({ success: true, message: 'Channel disconnected' });
});

router.put('/:channelId/reconnect', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  const channel = await db.Channel.findByPk(req.params.channelId as string);
  if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });

  res.redirect(`/api/channels/facebook/connect?channelId=${channel.id}`);
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (signature) {
      const expectedHash = crypto
        .createHmac('sha256', process.env.FB_APP_SECRET!)
        .update((req as any).rawBody)
        .digest('hex');
      const expected = `sha256=${expectedHash}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.sendStatus(403);
      }
    }

    const body = req.body;
    if (!body || (body.object !== 'page' && body.object !== 'instagram')) {
      return res.sendStatus(200);
    }

    await db.WebhookEvent.create({
      channel_id: null,
      payload: body,
      processed: false,
    });

    for (const entry of body.entry || []) {
      const channel = await db.Channel.findOne({
        where: { external_account_id: entry.id, type: 'facebook' },
      });
      if (!channel || !channel.access_token) continue;

      const pageToken = decrypt(channel.access_token);

      for (const event of entry.messaging || []) {
        if (event.message) {
          const psid = event.sender.id;
          const customer = await resolveFacebookCustomer(channel, psid, pageToken);

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

          const messageType = event.message.attachments?.[0]?.type === 'image' ? 'image' : 'text';
          const mediaUrl = event.message.attachments?.[0]?.payload?.url || null;

          await db.Message.create({
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
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err instanceof Error ? err.message : String(err));
    res.sendStatus(200);
  }
});

export default router;
