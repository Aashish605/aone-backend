import { Router } from 'express';
import { list, getById, create, update, remove } from '../controllers/conversation.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireSession);

router.get('/', list);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
