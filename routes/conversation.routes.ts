import { Router } from 'express';
import { listAll } from '../controllers/conversation.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router();

router.use(requireSession);
router.get('/', listAll);

export default router;
