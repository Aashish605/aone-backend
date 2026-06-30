import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { registerRules, loginRules } from '../validators/auth.validator.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', authenticate, getMe);

export default router;
