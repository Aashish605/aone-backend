import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config.js';

class User extends Model {
  declare id: string;
  declare name: string;
  declare email: string;
  declare emailVerified: boolean;
  declare image: string | null;
  declare isAdmin: boolean;
  declare contact: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.TEXT,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    image: DataTypes.TEXT,
    isAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    contact: DataTypes.TEXT,
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'user',
    underscored: false,
    timestamps: true,
    freezeTableName: true,
  }
);

export default User;
