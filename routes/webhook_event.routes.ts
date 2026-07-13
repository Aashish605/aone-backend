import { Router } from 'express';
import { list, getById } from '../controllers/webhook_event.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireSession);

router.get('/', list);
router.get('/:id', getById);

export default router;
