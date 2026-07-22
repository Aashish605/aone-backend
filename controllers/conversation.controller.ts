import { Op } from 'sequelize';
import { Request } from 'express';
import catchAsync from '../utils/catchAsync.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const listAll = catchAsync(async (req: Request, res) => {
  const authReq = req as AuthenticatedRequest;
  const { type, search, page = '1', limit = '20' } = authReq.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const customerInclude: any = { model: db.Customer, as: 'customer' };
  const channelInclude: any = { model: db.Channel, as: 'channel' };

  if (search) {
    customerInclude.where = { name: { [Op.iLike]: `%${search}%` } };
    customerInclude.required = true;
  }

  if (type && ['facebook', 'instagram', 'whatsapp'].includes(type as string)) {
    channelInclude.where = { type };
    channelInclude.required = true;
  }

  const { count: total, rows: conversations } = await db.Conversation.findAndCountAll({
    include: [customerInclude, channelInclude],
    order: [['last_message_at', 'DESC']],
    limit: limitNum,  
    offset,
  }); 

  const convIds = conversations.map(c => c.id);
  const lastMessages = convIds.length
    ? await db.Message.findAll({
        attributes: ['conversation_id', 'content', 'sender_type', 'created_at'],
        where: { conversation_id: convIds },
        order: [['created_at', 'DESC']],
      })
    : [];

  const lastMsgMap = new Map<string, any>();
  for (const msg of lastMessages) {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, msg);
    }
  }

    const data = conversations.map(conv => ({
      id: conv.id,
      status: conv.status,
      last_message_at: conv.last_message_at,
      customer: (conv as any).customer
        ? {
            id: (conv as any).customer.id,
            name: (conv as any).customer.name,
            avatar_url: (conv as any).customer.avatar_url,
          }
        : null,
      channel: (conv as any).channel
        ? {
            id: (conv as any).channel.id,
            name: (conv as any).channel.name,
            type: (conv as any).channel.type,
          }
        : null,
      lastMessage: lastMsgMap.get(conv.id)
        ? {
            content: lastMsgMap.get(conv.id).content,
            sender_type: lastMsgMap.get(conv.id).sender_type,
            created_at: lastMsgMap.get(conv.id).created_at,
          }
        : null,
    }));

  res.json({
    success: true,
    data,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

export { listAll };
