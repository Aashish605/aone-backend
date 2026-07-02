import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/db.config.js';

interface Db {
  sequelize: Sequelize;
}

const db: Db = {
  sequelize: sequelizeInstance,
};

export default db;
