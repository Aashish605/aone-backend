<<<<<<< HEAD
import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/db.config.js';
import User from './user.model.js';

interface Db {
  sequelize: Sequelize;
  User: typeof User;
}

const db: Db = {
  sequelize: sequelizeInstance,
=======
import sequelize from '../config/db.config';
import User from './user.model';

const db = {
  sequelize,
>>>>>>> 1c6214728892e0e5d4d5697c40117bd211de0b28
  User,
};

export default db;
