import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import env from './config/env.config.js';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import db from './models/index.js';
import catchAsync from './utils/catchAsync.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', routes);
app.use(errorHandler);

app.get('/', catchAsync(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Server running successfully',
  });
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
