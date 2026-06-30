import sequelize from '../config/db.config';
import User from './user.model';

const db = {
  sequelize,
  User,
};

export default db;
