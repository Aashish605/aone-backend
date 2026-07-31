import { Request, Response } from 'express';
import { Op } from 'sequelize';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError, ForbiddenError } from '../utils/AppError.js';
import db from '../models/index.js';
import { decrypt } from '../utils/crypto.js';
import { sendFacebookMessage } from '../services/facebook.service.js';
import { sendInstagramMessage } from '../services/instagram.service.js';
import { triggerConversationEvent } from '../services/pusher.service.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const list = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const conversation = await db.Conversation.findByPk(conversationId, {
    include: [{ model: db.Channel, as: 'channel' }],
  });
  if (!conversation) throw new NotFoundError('Conversation');
  if ((conversation as any).channel?.user_id !== req.user!.id) {
    throw new ForbiddenError('Not your channel');
  }

  const { limit, page = '1', search } = req.query;

  const where: any = { conversation_id: conversationId };
  if (search) {
    where.content = { [Op.iLike]: `%${search}%` };
  }

  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || Number.MAX_SAFE_INTEGER));
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const offset = limitNum === Number.MAX_SAFE_INTEGER ? 0 : (pageNum - 1) * limitNum;

  const { count: total, rows: messages } = await db.Message.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: limitNum,
    offset,
  });

  const totalPages =
    limitNum === Number.MAX_SAFE_INTEGER ? 1 : Math.ceil(total / limitNum);

  res.json({
    success: true,
    data: messages.reverse(),
    meta: { total, page: pageNum, limit: limitNum === Number.MAX_SAFE_INTEGER ? total : limitNum, totalPages },
  });
});

const getById = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const conversation = await db.Conversation.findByPk(conversationId, {
    include: [{ model: db.Channel, as: 'channel' }],
  });
  if (!conversation) throw new NotFoundError('Conversation');
  if ((conversation as any).channel?.user_id !== req.user!.id) {
    throw new ForbiddenError('Not your channel');
  }

  const message = await db.Message.findOne({
    where: {
      id: req.params.id as string,
      conversation_id: conversationId,
    },
  });

  if (!message) throw new NotFoundError('Message');
  res.json({ success: true, data: message });
});

const create = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const conversation = await db.Conversation.findByPk(conversationId, {
    include: [{ model: db.Channel, as: 'channel' }],
  });
  if (!conversation) throw new NotFoundError('Conversation');
  if ((conversation as any).channel?.user_id !== req.user!.id) {
    throw new ForbiddenError('Not your channel');
  }

  const {
    sender_type,
    sender_id,
    content,
    message_type,
    media_url,
    raw_payload,
  } = req.body;

  let externalMessageId: string | null = null;
  let messageStatus = 'sent';
  const channel = (conversation as any).channel;

  if (channel?.type === 'facebook' && sender_type !== 'customer' && channel.access_token) {
    const identity = await db.CustomerChannelIdentity.findOne({
      where: { customer_id: conversation.customer_id, channel_id: conversation.channel_id },
    });

    if (identity) {
      const pageToken = decrypt(channel.access_token);
      try {
        const result = await sendFacebookMessage(
          pageToken,
          identity.external_user_id,
          content || null,
          message_type || 'text',
          media_url || null,
        );
        externalMessageId = result.externalMessageId;
        messageStatus = 'sent';
      } catch (err) {
        console.error('Facebook send failed:', err);
        messageStatus = 'failed';
      }
    }
  }

  if (channel?.type === 'instagram' && sender_type !== 'customer' && channel.access_token) {
    const identity = await db.CustomerChannelIdentity.findOne({
      where: { customer_id: conversation.customer_id, channel_id: conversation.channel_id },
    });

    if (identity) {
      const accessToken = decrypt(channel.access_token);
      try {
        const result = await sendInstagramMessage(
          accessToken,
          identity.external_user_id,
          content || null,
          message_type || 'text',
          media_url || null,
        );
        externalMessageId = result.externalMessageId;
        messageStatus = 'sent';
      } catch (err) {
        console.error('Instagram send failed:', err);
        messageStatus = 'failed';
      }
    }
  }

  const message = await db.Message.create({
    conversation_id: conversationId,
    sender_type: sender_type || 'agent',
    sender_id: sender_id || null,
    external_message_id: externalMessageId,
    content: content || null,
    message_type: message_type || 'text',
    media_url: media_url || null,
    status: messageStatus,
    raw_payload: raw_payload || null,
  });

  await conversation.update({ last_message_at: new Date() });

  await triggerConversationEvent(conversationId, 'message:new', message);

  res.status(201).json({ success: true, data: message });
});

export { list, getById, create };
