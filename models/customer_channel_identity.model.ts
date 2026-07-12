import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class CustomerChannelIdentity extends Model {
  declare id: string;
  declare customer_id: string;
  declare channel_id: string;
  declare external_user_id: string;
  declare raw_profile: object | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

CustomerChannelIdentity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'customers', key: 'id' },
      onDelete: 'CASCADE',
    },
    channel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'channels', key: 'id' },
      onDelete: 'CASCADE',
    },
    external_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    raw_profile: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'CustomerChannelIdentity',
    tableName: 'customer_channel_identities',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        name: 'uq_channel_external_user',
        fields: ['channel_id', 'external_user_id'],
      },
    ],
  }
);

export default CustomerChannelIdentity;
