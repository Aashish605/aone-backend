import { Router } from 'express';
import channelRoutes from './channel.routes.js';
import customerRoutes from './customer.routes.js';
import identityRoutes from './customer_channel_identity.routes.js';
import conversationRoutes from './conversation.routes.js';
import messageRoutes from './message.routes.js';
import webhookEventRoutes from './webhook_event.routes.js';
import facebookRoutes from './facebook.routes.js';

const router = Router();

router.use('/channels/facebook', facebookRoutes);
router.use('/channels', channelRoutes);
router.use('/customers', customerRoutes);
router.use('/customers/:customerId/identities', identityRoutes);
router.use('/customers/:customerId/conversations', conversationRoutes);
router.use('/conversations/:conversationId/messages', messageRoutes);
router.use('/channels/:channelId/webhook-events', webhookEventRoutes);

export default router;
