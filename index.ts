import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.config';
import routes from './routes/index';
import errorHandler from './middlewares/error.middleware';
import db from './models/index';
import catchAsync from './utils/catchAsync';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use(errorHandler);


app.get('/', catchAsync(async (req, res) => {
  res.send('Hello World!');
}));

const start = async (): Promise<void> => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully');

    await db.sequelize.sync();
    console.log('Database synced');

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
