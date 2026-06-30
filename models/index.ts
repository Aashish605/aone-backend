import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/db.config.js';
import User from './user.model.js';

interface Db {
  sequelize: Sequelize;
  User: typeof User;
}

const db: Db = {
  sequelize: sequelizeInstance,
  User,
};

export default db;
