import { Router } from 'express';
import { connect, callback, verifyWebhook, handleWebhook } from '../controllers/instagram.controller.js';

const router = Router();

router.get('/connect', connect);
router.get('/callback', callback);
router.get('/webhook', verifyWebhook);
router.post('/webhook', handleWebhook);

export default router;
