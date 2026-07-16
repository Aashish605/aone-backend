import express, { Request, Response } from 'express';
import cors from 'cors';
import helmetFn from 'helmet';
const helmet = helmetFn as unknown as () => any;
import morgan from 'morgan';
import env from './config/env.config.js';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.js';
import db from './models/index.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));

app.all('/api/auth/{*path}', toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use(errorHandler);

if (!process.env.VERCEL) {
  const start = async (): Promise<void> => {
    try {
      app.listen(env.port, () => {
        console.log(`Server running on port ${env.port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  start();
}

export default app;
