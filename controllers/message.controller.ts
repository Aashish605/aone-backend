import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError } from '../utils/AppError.js';
import db from '../models/index.js';
import { decrypt } from '../utils/crypto.js';
import { sendFacebookMessage } from '../services/facebook.service.js';
import { AuthenticatedRequest } from '../middlewares/session.middleware.js';

const list = catchAsync(async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const conversation = await db.Conversation.findByPk(conversationId);
  if (!conversation) throw new NotFoundError('Conversation');

  const messages = await db.Message.findAll({
    where: { conversation_id: conversationId },
    order: [['created_at', 'ASC']],
  });

  res.json({ success: true, data: messages });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const message = await db.Message.findOne({
    where: {
      id: req.params.id as string,
      conversation_id: req.params.conversationId as string,
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

  res.status(201).json({ success: true, data: message });
});

export { list, getById, create };
