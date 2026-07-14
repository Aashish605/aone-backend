import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class Conversation extends Model {
  declare id: string;
  declare customer_id: string;
  declare channel_id: string;
  declare assigned_agent_id: string | null;
  declare status: 'open' | 'pending' | 'closed' | 'snoozed';
  declare last_message_at: Date | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    channel_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigned_agent_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('open', 'pending', 'closed', 'snoozed'),
      allowNull: false,
      defaultValue: 'open',
    },
    last_message_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Conversation;
