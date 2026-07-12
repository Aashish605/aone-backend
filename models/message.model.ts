import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class Message extends Model {
  declare id: string;
  declare conversation_id: string;
  declare sender_type: 'customer' | 'agent' | 'bot';
  declare sender_id: string | null;
  declare external_message_id: string | null;
  declare content: string | null;
  declare message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template';
  declare media_url: string | null;
  declare status: 'sent' | 'delivered' | 'read' | 'failed';
  declare raw_payload: object | null;
  declare readonly created_at: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_type: {
      type: DataTypes.ENUM('customer', 'agent', 'bot'),
      allowNull: false,
    },
    sender_id: DataTypes.UUID,
    external_message_id: DataTypes.STRING,
    content: DataTypes.TEXT,
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file', 'template'),
      allowNull: false,
      defaultValue: 'text',
    },
    media_url: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
      allowNull: false,
      defaultValue: 'sent',
    },
    raw_payload: DataTypes.JSONB,
  },
  {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default Message;
