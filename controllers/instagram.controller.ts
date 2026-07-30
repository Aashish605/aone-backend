import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import db from '../models/index.js';
import { encrypt } from '../utils/crypto.js';

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

export { connect, callback };
