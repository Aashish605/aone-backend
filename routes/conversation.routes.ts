import { Router } from 'express';
import { listAll, markAsRead, sendTyping } from '../controllers/conversation.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router();

router.use(requireSession);
router.get('/', listAll);
router.put('/:conversationId/read', markAsRead);
router.post('/:conversationId/typing', sendTyping);

export default router;
