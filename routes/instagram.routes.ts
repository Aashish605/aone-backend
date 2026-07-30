import { Router } from 'express';
import { connect, callback } from '../controllers/instagram.controller.js';

const router = Router();

router.get('/connect', connect);
router.get('/callback', callback);

export default router;
