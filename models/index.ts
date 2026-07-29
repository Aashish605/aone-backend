import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/db.config.js';
import Channel from './channel.model.js';
import Customer from './customer.model.js';
import CustomerChannelIdentity from './customer_channel_identity.model.js';
import Conversation from './conversation.model.js';
import Message from './message.model.js';
import WebhookEvent from './webhook_event.model.js';
import User from './user.model.js';
import defineAssociations from './associations.js';

defineAssociations();

// Dev only: auto-create/update tables for local development
if (process.env.NODE_ENV !== 'production') {
  sequelizeInstance.sync({ alter: true }).catch((err) =>
    console.error('Sequelize dev sync failed:', err)
  );
}

interface Db {
  sequelize: Sequelize;
  Channel: typeof Channel;
  Customer: typeof Customer;
  CustomerChannelIdentity: typeof CustomerChannelIdentity;
  Conversation: typeof Conversation;
  Message: typeof Message;
  WebhookEvent: typeof WebhookEvent;
  User: typeof User;
}

const db: Db = {
  sequelize: sequelizeInstance,
  Channel,
  Customer,
  CustomerChannelIdentity,
  Conversation,
  Message,
  WebhookEvent,
  User,
};

export default db;
