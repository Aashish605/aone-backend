import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const getAll = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customers = await db.Customer.findAll({
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
    order: [['created_at', 'DESC']],
    distinct: true,
  });
  res.json({ success: true, data: customers });
});

const getById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customer = await db.Customer.findOne({
    where: { id: req.params.id as string },
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
  res.json({ success: true, data: customer });
});

const create = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, phone, avatar_url } = req.body;

  const customer = await db.Customer.create({
    name: name || null,
    email: email || null,
    phone: phone || null,
    avatar_url: avatar_url || null,
  });

  res.status(201).json({ success: true, data: customer });
});

const update = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customer = await db.Customer.findOne({
    where: { id: req.params.id as string },
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

  const { name, email, phone, avatar_url } = req.body;

  if (name !== undefined) customer.name = name;
  if (email !== undefined) customer.email = email;
  if (phone !== undefined) customer.phone = phone;
  if (avatar_url !== undefined) customer.avatar_url = avatar_url;

  await customer.save();
  res.json({ success: true, data: customer });
});

const remove = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const customer = await db.Customer.findOne({
    where: { id: req.params.id as string },
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

  await customer.destroy();
  res.json({ success: true, message: 'Customer deleted successfully' });
});

export { getAll, getById, create, update, remove };
