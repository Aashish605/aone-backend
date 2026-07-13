import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class Customer extends Model {
  declare id: string;
  declare name: string | null;
  declare email: string | null;
  declare phone: string | null;
  declare avatar_url: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Customer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    avatar_url: DataTypes.STRING,
  },
  {
    sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Customer;
