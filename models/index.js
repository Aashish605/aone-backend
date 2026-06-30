import sequelize from '../config/db.config.js';
import User from './user.model.js';

const db = {
  sequelize,
  User,
};

export default db;
