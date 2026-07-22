import axios from 'axios';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendFacebookMessage(
  pageToken: string,
  psid: string,
  content: string | null,
  messageType: string,
  mediaUrl: string | null,
): Promise<{ externalMessageId: string | null }> {
  const msgBody: any = { messaging_type: 'RESPONSE', recipient: { id: psid } };

  if (messageType === 'image' && mediaUrl) {
    msgBody.message = {
      attachment: { type: 'image', payload: { url: mediaUrl } },
    };
  } else {
    msgBody.message = { text: content || '' };
  }

  const res = await axios.post(`${GRAPH_BASE}/me/messages`, msgBody, {
    params: { access_token: pageToken },
  });

  return { externalMessageId: res.data.message_id || null };
}
