import { Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const list = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await db.Customer.findOne({
    where: { id: customerId },
    include: [{
      model: db.Conversation,
      as: 'conversations',
      required: true,
      include: [{
        model: db.Channel,
        as: 'channel',
        where: { user_id: req.user!.id },
        required: true,
      }],
    }],
  });
  if (!customer) throw new NotFoundError('Customer');

  const identities = await db.CustomerChannelIdentity.findAll({
    where: { customer_id: customerId },
    include: [{
      model: db.Channel,
      as: 'channel',
      where: { user_id: req.user!.id },
      required: true,
    }],
    order: [['created_at', 'DESC']],
  });

  res.json({ success: true, data: identities });
});

const create = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await db.Customer.findOne({
    where: { id: customerId },
    include: [{
      model: db.Conversation,
      as: 'conversations',
      required: true,
      include: [{
        model: db.Channel,
        as: 'channel',
        where: { user_id: req.user!.id },
        required: true,
      }],
    }],
  });
  if (!customer) throw new NotFoundError('Customer');

  const { channel_id, external_user_id, raw_profile } = req.body;

  if (!channel_id || !external_user_id) {
    throw new ValidationError([
      { field: 'channel_id', message: 'Channel ID is required' },
      { field: 'external_user_id', message: 'External user ID is required' },
    ]);
  }

  const channel = await db.Channel.findOne({
    where: { id: channel_id, user_id: req.user!.id },
  });
  if (!channel) throw new NotFoundError('Channel');

  const identity = await db.CustomerChannelIdentity.create({
    customer_id: customerId,
    channel_id,
    external_user_id,
    raw_profile: raw_profile || null,
  });

  res.status(201).json({ success: true, data: identity });
});

const remove = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const identity = await db.CustomerChannelIdentity.findOne({
    where: {
      id: req.params.id as string,
      customer_id: req.params.customerId as string,
    },
    include: [{
      model: db.Channel,
      as: 'channel',
      where: { user_id: req.user!.id },
      required: true,
    }],
  });

  if (!identity) throw new NotFoundError('Identity');

  await identity.destroy();
  res.json({ success: true, message: 'Identity removed successfully' });
});

export { list, create, remove };
