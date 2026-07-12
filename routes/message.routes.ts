import { Router } from 'express';
import { list, getById, create } from '../controllers/message.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireSession);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);

export default router;
