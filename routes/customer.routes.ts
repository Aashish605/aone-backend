import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/customer.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router();

router.use(requireSession);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
