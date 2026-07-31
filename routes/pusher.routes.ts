import { Router } from 'express';
import pusher from '../services/pusher.service.js';
import { requireSession } from '../middlewares/session.middleware.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';
import db from '../models/index.js';

const router = Router();

router.post('/auth', requireSession, async (req: AuthenticatedRequest, res) => {
  const { socket_id: socketId, channel_name: channelName } = req.body;

  if (!socketId || !channelName) {
    return res.status(400).json({ success: false, message: 'socket_id and channel_name required' });
  }

  const prefix = 'private-conversation-';
  if (!channelName.startsWith(prefix)) {
    return res.status(400).json({ success: false, message: 'Invalid channel' });
  }

  const conversationId = channelName.slice(prefix.length);

  try {
    const conversation = await db.Conversation.findByPk(conversationId, {
      include: [{ model: db.Channel, as: 'channel' }],
    });
    if (!conversation || (conversation as any).channel?.user_id !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Not your conversation' });
    }

    const auth = pusher.authenticate(socketId, channelName);
    res.status(200).json(auth);
  } catch (err) {
    console.error('Pusher auth failed:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ success: false, message: 'Auth failed' });
  }
});

export default router;
