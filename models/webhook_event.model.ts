import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class WebhookEvent extends Model {
  declare id: string;
  declare channel_id: string | null;
  declare payload: object;
  declare processed: boolean;
  declare readonly created_at: Date;
}

WebhookEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channel_id: DataTypes.UUID,
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    processed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'WebhookEvent',
    tableName: 'webhook_events',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

export default WebhookEvent;
