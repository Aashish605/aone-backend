import '../config/env.config.js';
import db from '../models/index.js';

db.sequelize.sync({ alter: true })
  .then(() => {
    console.log('Tables synced successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
