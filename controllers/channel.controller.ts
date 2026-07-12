import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError, ValidationError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const getAll = catchAsync(async (_req: Request, res: Response) => {
  const channels = await db.Channel.findAll({
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, data: channels });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const channel = await db.Channel.findByPk(req.params.id as string);
  if (!channel) throw new NotFoundError('Channel');
  res.json({ success: true, data: channel });
});

const create = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { type, name, external_account_id, access_token, webhook_verify_token } = req.body;

  if (!type || !name || !external_account_id) {
    throw new ValidationError([
      { field: 'type', message: 'Type is required' },
      { field: 'name', message: 'Name is required' },
      { field: 'external_account_id', message: 'External account ID is required' },
    ]);
  }

  const validTypes = ['facebook', 'instagram', 'whatsapp'];
  if (!validTypes.includes(type)) {
    throw new ValidationError([
      { field: 'type', message: `Type must be one of: ${validTypes.join(', ')}` },
    ]);
  }

  const channel = await db.Channel.create({
    type,
    name,
    external_account_id,
    access_token: access_token || null,
    webhook_verify_token: webhook_verify_token || null,
  });

  res.status(201).json({ success: true, data: channel });
});

const update = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const channel = await db.Channel.findByPk(req.params.id as string);
  if (!channel) throw new NotFoundError('Channel');

  const { type, name, external_account_id, access_token, webhook_verify_token, status } = req.body;

  if (type) {
    const validTypes = ['facebook', 'instagram', 'whatsapp'];
    if (!validTypes.includes(type)) {
      throw new ValidationError([
        { field: 'type', message: `Type must be one of: ${validTypes.join(', ')}` },
      ]);
    }
    channel.type = type;
  }
  if (name) channel.name = name;
  if (external_account_id) channel.external_account_id = external_account_id;
  if (access_token !== undefined) channel.access_token = access_token;
  if (webhook_verify_token !== undefined) channel.webhook_verify_token = webhook_verify_token;
  if (status) {
    const validStatuses = ['active', 'disconnected'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError([
        { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` },
      ]);
    }
    channel.status = status;
  }

  await channel.save();
  res.json({ success: true, data: channel });
});

const remove = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const channel = await db.Channel.findByPk(req.params.id as string);
  if (!channel) throw new NotFoundError('Channel');

  await channel.destroy();
  res.json({ success: true, message: 'Channel deleted successfully' });
});

export { getAll, getById, create, update, remove };
