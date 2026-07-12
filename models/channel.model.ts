import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class Channel extends Model {
  declare id: string;
  declare type: 'facebook' | 'instagram' | 'whatsapp';
  declare name: string;
  declare external_account_id: string;
  declare access_token: string | null;
  declare webhook_verify_token: string | null;
  declare status: 'active' | 'disconnected';
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Channel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('facebook', 'instagram', 'whatsapp'),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    external_account_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    access_token: DataTypes.TEXT,
    webhook_verify_token: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('active', 'disconnected'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    modelName: 'Channel',
    tableName: 'channels',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Channel;
