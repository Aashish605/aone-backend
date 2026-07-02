import { Router } from 'express';
import { signup, login, getMe, refresh } from '../controllers/auth.controller';
import { registerRules, loginRules } from '../validators/auth.validator';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.post('/signup', registerRules, signup);
router.post('/login', loginRules, login);
router.get('/me', authenticate, getMe);
router.post('/refresh', refresh)

export default router;
