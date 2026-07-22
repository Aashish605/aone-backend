import { Router } from 'express';
import * as facebookController from '../controllers/facebook.controller.js';
import { requireSession } from '../middlewares/session.middleware.js';

const router = Router();

router.get('/connect', facebookController.connect);
router.get('/callback', facebookController.callback);
router.get('/webhook', facebookController.verifyWebhook);
router.post('/webhook', facebookController.handleWebhook);
router.put('/:channelId/disconnect', requireSession, facebookController.disconnect);
router.put('/:channelId/reconnect', requireSession, facebookController.reconnect);

export default router;
