import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import db from '../models/index.js';
import { encrypt } from '../utils/crypto.js';
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
        return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/settings/channels?reconnected=true&channelId=${target.id}`);
      }
    }

    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:3000'}/settings/channels?connected=true&count=${updatedChannels.length}`);
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
  console.log('[WEBHOOK] body:', JSON.stringify(req.body));
  console.log('[WEBHOOK] rawBody exists:', !!(req as any).rawBody);
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

  res.sendStatus(200);

  try {
    const body = req.body;
    if (!body || (body.object !== 'page' && body.object !== 'instagram')) return;

    await db.WebhookEvent.create({
      channel_id: null,
      payload: body,
      processed: false,
    });

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (event.message) {
          console.log('Message event:', JSON.stringify(event, null, 2));
        } else if (event.postback) {
          console.log('Postback event:', JSON.stringify(event, null, 2));
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Webhook processing error:', message);
  }
});

export default router;
