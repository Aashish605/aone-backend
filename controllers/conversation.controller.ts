import { Op } from 'sequelize';
import { Request } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';
import db from '../models/index.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';
import { decrypt } from '../utils/crypto.js';
import { sendSenderAction } from '../services/facebook.service.js';
import { triggerConversationEvent } from '../services/pusher.service.js';

const listAll = catchAsync(async (req: Request, res) => {
  const authReq = req as AuthenticatedRequest;
  const { type, search, page = '1', limit = '20' } = authReq.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const customerInclude: any = { model: db.Customer, as: 'customer' };

  if (search) {
    customerInclude.where = { name: { [Op.iLike]: `%${search}%` } };
    customerInclude.required = true;
  }

  const channelInclude: any = {
    model: db.Channel,
    as: 'channel',
    where: { user_id: authReq.user!.id },
    required: true,
  };

  if (type && ['facebook', 'instagram', 'whatsapp'].includes(type as string)) {
    channelInclude.where = { ...channelInclude.where, type };
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

const markAsRead = catchAsync(async (req: AuthenticatedRequest, res) => {
  const conversation = await db.Conversation.findByPk(req.params.conversationId as string, {
    include: [{ model: db.Channel, as: 'channel' }],
  });
  if (!conversation) throw new NotFoundError('Conversation');
  if ((conversation as any).channel?.user_id !== req.user!.id) {
    throw new ForbiddenError('Not your channel');
  }

  const [updated] = await db.Message.update(
    { status: 'read' },
    {
      where: {
        conversation_id: conversation.id,
        sender_type: 'customer',
        status: { [Op.ne]: 'read' },
      },
    },
  );

  const channel = (conversation as any).channel;
  if (channel?.type === 'facebook' && channel.access_token) {
    const identity = await db.CustomerChannelIdentity.findOne({
      where: { customer_id: conversation.customer_id, channel_id: conversation.channel_id },
    });
    if (identity) {
      const pageToken = decrypt(channel.access_token);
      sendSenderAction(pageToken, identity.external_user_id, 'mark_seen').catch((err) =>
        console.error('mark_seen failed:', err),
      );
    }
  }

  res.json({ success: true, data: { updated } });

  await triggerConversationEvent(conversation.id, 'messages:updated', {
    conversationId: conversation.id,
    reason: 'agent_read',
  });
});

const sendTyping = catchAsync(async (req: AuthenticatedRequest, res) => {
  const { action } = req.body;
  if (!action || !['typing_on', 'typing_off'].includes(action)) {
    throw new ValidationError([
      { field: 'action', message: 'Must be typing_on or typing_off' },
    ]);
  }

  const conversation = await db.Conversation.findByPk(req.params.conversationId as string, {
    include: [{ model: db.Channel, as: 'channel' }],
  });
  if (!conversation) throw new NotFoundError('Conversation');
  if ((conversation as any).channel?.user_id !== req.user!.id) {
    throw new ForbiddenError('Not your channel');
  }

  const channel = (conversation as any).channel;
  if (channel?.type !== 'facebook' || !channel.access_token) {
    return res.json({ success: true, data: { sent: false, reason: 'not_facebook' } });
  }

  const identity = await db.CustomerChannelIdentity.findOne({
    where: { customer_id: conversation.customer_id, channel_id: conversation.channel_id },
  });
  if (!identity) {
    return res.json({ success: true, data: { sent: false, reason: 'no_identity' } });
  }

  const pageToken = decrypt(channel.access_token);
  await sendSenderAction(pageToken, identity.external_user_id, action);
  res.json({ success: true, data: { sent: true } });
});

export { listAll, markAsRead, sendTyping };
