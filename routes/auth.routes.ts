import { Router } from 'express';
import { signup, login, getMe, refresh } from '../controllers/auth.controller.js';
import { registerRules, loginRules } from '../validators/auth.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', registerRules, signup);
router.post('/login', loginRules, login);
router.get('/me', authenticate, getMe);
router.post('/refresh', refresh)

export default router;
