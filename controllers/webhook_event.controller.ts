import { Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const list = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const channelId = req.params.channelId as string;
  const channel = await db.Channel.findOne({
    where: { id: channelId, user_id: req.user!.id },
  });
  if (!channel) throw new NotFoundError('Channel');

  const events = await db.WebhookEvent.findAll({
    where: { channel_id: channelId },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  res.json({ success: true, data: events });
});

const getById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const channelId = req.params.channelId as string;
  const channel = await db.Channel.findOne({
    where: { id: channelId, user_id: req.user!.id },
  });
  if (!channel) throw new NotFoundError('Channel');

  const event = await db.WebhookEvent.findOne({
    where: { id: req.params.id as string, channel_id: channelId },
  });
  if (!event) throw new NotFoundError('WebhookEvent');
  res.json({ success: true, data: event });
});

export { list, getById };
