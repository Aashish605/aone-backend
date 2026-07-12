import { Router } from 'express';
import channelRoutes from './channel.routes.js';

const router = Router();

router.use('/channels', channelRoutes);

export default router;
