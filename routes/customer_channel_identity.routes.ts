import { Router } from 'express';
import { list, create, remove } from '../controllers/customer_channel_identity.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireSession);

router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

export default router;
