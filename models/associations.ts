import Channel from './channel.model.js';
import Customer from './customer.model.js';
import CustomerChannelIdentity from './customer_channel_identity.model.js';
import Conversation from './conversation.model.js';
import Message from './message.model.js';
import WebhookEvent from './webhook_event.model.js';
import User from './user.model.js';

export default function defineAssociations(): void {
  Channel.hasMany(CustomerChannelIdentity, {
    foreignKey: 'channel_id',
    as: 'identities',
  });

  Channel.hasMany(Conversation, {
    foreignKey: 'channel_id',
    as: 'conversations',
  });

  Channel.hasMany(WebhookEvent, {
    foreignKey: 'channel_id',
    as: 'webhookEvents',
  });

  Customer.hasMany(CustomerChannelIdentity, {
    foreignKey: 'customer_id',
    as: 'identities',
  });

  Customer.hasMany(Conversation, {
    foreignKey: 'customer_id',
    as: 'conversations',
  });

  CustomerChannelIdentity.belongsTo(Channel, {
    foreignKey: 'channel_id',
    as: 'channel',
  });

  CustomerChannelIdentity.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer',
  });

  Conversation.belongsTo(Customer, {
    foreignKey: 'customer_id',
    as: 'customer',
  });

  Conversation.belongsTo(Channel, {
    foreignKey: 'channel_id',
    as: 'channel',
  });

  Conversation.hasMany(Message, {
    foreignKey: 'conversation_id',
    as: 'messages',
  });

  Conversation.belongsTo(User, {
    foreignKey: 'assigned_agent_id',
    as: 'agent',
  });

  Message.belongsTo(Conversation, {
    foreignKey: 'conversation_id',
    as: 'conversation',
  });

  WebhookEvent.belongsTo(Channel, {
    foreignKey: 'channel_id',
    as: 'channel',
  });
}
