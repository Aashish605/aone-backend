import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError } from '../utils/AppError.js';
import db from '../models/index.js';

const list = catchAsync(async (req: Request, res: Response) => {
  const channelId = req.params.channelId as string;

  const where: Record<string, unknown> = {};
  if (channelId) where.channel_id = channelId;

  const events = await db.WebhookEvent.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  res.json({ success: true, data: events });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const event = await db.WebhookEvent.findByPk(req.params.id as string);
  if (!event) throw new NotFoundError('WebhookEvent');
  res.json({ success: true, data: event });
});

export { list, getById };
