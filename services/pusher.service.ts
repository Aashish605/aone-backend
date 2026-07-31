import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function triggerConversationEvent(
  conversationId: string,
  event: string,
  data: unknown,
): Promise<void> {
  try {
    await pusher.trigger(`private-conversation-${conversationId}`, event, data);
  } catch (err) {
    console.error(`Pusher trigger failed [${event}]:`, err instanceof Error ? err.message : String(err));
  }
}

export default pusher;
