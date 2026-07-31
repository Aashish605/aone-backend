import axios from 'axios';
import db from '../models/index.js';

const GRAPH_BASE = 'https://graph.instagram.com/v21.0';

export async function subscribeInstagramAccount(igUserId: string, accessToken: string): Promise<void> {
  try {
    await axios.post(`${GRAPH_BASE}/${igUserId}/subscribed_apps`, null, {
      params: {
        access_token: accessToken,
        subscribed_fields: 'messages',
      },
    });
    console.log(`Subscribed IG account ${igUserId} to webhooks`);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: unknown }; message?: string };
    console.error(`Failed to subscribe IG account ${igUserId}:`, axiosErr.response?.data || axiosErr.message);
  }
}

export async function sendInstagramMessage(
  accessToken: string,
  igScopedId: string,
  content: string | null,
  messageType: string,
  mediaUrl: string | null,
): Promise<{ externalMessageId: string | null }> {
  const msgBody: any = { messaging_type: 'RESPONSE', recipient: { id: igScopedId } };

  if ((messageType === 'image' || messageType === 'video') && mediaUrl) {
    msgBody.message = {
      attachment: { type: messageType, payload: { url: mediaUrl } },
    };
  } else {
    msgBody.message = { text: content || '' };
  }

  const res = await axios.post(`${GRAPH_BASE}/me/messages`, msgBody, {
    params: { access_token: accessToken },
  });

  return { externalMessageId: res.data.message_id || null };
}

export async function resolveInstagramCustomer(channel: any, igUserId: string, accessToken: string): Promise<any> {
  const existingIdentity = await db.CustomerChannelIdentity.findOne({
    where: { channel_id: channel.id, external_user_id: igUserId },
    include: [{ model: db.Customer, as: 'customer' }],
  });
  if (existingIdentity) return (existingIdentity as any).customer;

  let name: string | null = null;
  let avatarUrl: string | null = null;
  try {
    const userRes = await axios.get(`${GRAPH_BASE}/${igUserId}`, {
      params: { fields: 'id,username,name,profile_picture_url', access_token: accessToken },
    });
    name = userRes.data.name || userRes.data.username || null;
    avatarUrl = userRes.data.profile_picture_url || null;
  } catch {
    console.log(`Could not fetch IG profile for ${igUserId}`);
  }

  const customer = await db.Customer.create({ name, avatar_url: avatarUrl });
  await db.CustomerChannelIdentity.create({
    customer_id: customer.id,
    channel_id: channel.id,
    external_user_id: igUserId,
  });
  return customer;
}
