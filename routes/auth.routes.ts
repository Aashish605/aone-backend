import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { registerRules, loginRules } from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', authenticate, getMe);

export default router;
