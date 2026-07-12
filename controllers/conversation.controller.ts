import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const list = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await db.Customer.findByPk(customerId);
  if (!customer) throw new NotFoundError('Customer');

  const conversations = await db.Conversation.findAll({
    where: { customer_id: customerId },
    include: [
      { model: db.Channel, as: 'channel' },
    ],
    order: [['last_message_at', 'DESC']],
  });

  res.json({ success: true, data: conversations });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const conversation = await db.Conversation.findOne({
    where: {
      id: req.params.id as string,
      customer_id: req.params.customerId as string,
    },
    include: [
      { model: db.Channel, as: 'channel' },
    ],
  });

  if (!conversation) throw new NotFoundError('Conversation');
  res.json({ success: true, data: conversation });
});

const create = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await db.Customer.findByPk(customerId);
  if (!customer) throw new NotFoundError('Customer');

  const { channel_id, assigned_agent_id, status } = req.body;

  if (!channel_id) {
    throw new ValidationError([
      { field: 'channel_id', message: 'Channel ID is required' },
    ]);
  }

  const channel = await db.Channel.findByPk(channel_id);
  if (!channel) throw new NotFoundError('Channel');

  const conversation = await db.Conversation.create({
    customer_id: customerId,
    channel_id,
    assigned_agent_id: assigned_agent_id || null,
    status: status || 'open',
  });

  res.status(201).json({ success: true, data: conversation });
});

const update = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await db.Conversation.findOne({
    where: {
      id: req.params.id as string,
      customer_id: req.params.customerId as string,
    },
  });

  if (!conversation) throw new NotFoundError('Conversation');

  const { status, assigned_agent_id, last_message_at } = req.body;

  const validStatuses = ['open', 'pending', 'closed', 'snoozed'];
  if (status) {
    if (!validStatuses.includes(status)) {
      throw new ValidationError([
        { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` },
      ]);
    }
    conversation.status = status;
  }
  if (assigned_agent_id !== undefined) conversation.assigned_agent_id = assigned_agent_id;
  if (last_message_at !== undefined) conversation.last_message_at = last_message_at;

  await conversation.save();
  res.json({ success: true, data: conversation });
});

const remove = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const conversation = await db.Conversation.findOne({
    where: {
      id: req.params.id as string,
      customer_id: req.params.customerId as string,
    },
  });

  if (!conversation) throw new NotFoundError('Conversation');

  await conversation.destroy();
  res.json({ success: true, message: 'Conversation deleted successfully' });
});

export { list, getById, create, update, remove };
