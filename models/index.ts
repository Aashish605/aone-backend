import { Sequelize } from 'sequelize';
import sequelizeInstance from '../config/db.config.js';
import Channel from './channel.model.js';

interface Db {
  sequelize: Sequelize;
  Channel: typeof Channel;
}

const db: Db = {
  sequelize: sequelizeInstance,
  Channel,
};

export default db;
