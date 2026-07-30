import { Router } from 'express';
import { listAll, markAsRead } from '../controllers/conversation.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router();

router.use(requireSession);
router.get('/', listAll);
router.put('/:conversationId/read', markAsRead);

export default router;
