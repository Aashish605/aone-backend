import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import env from './config/env.config.js';
import db from './models/index.js';
import routes from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth.js';
import db from './models/index.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/auth/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({ error: 'No valid session' });
      return;
    }

    const accessToken = jwt.sign(
      { id: session.user.id },
      process.env.BETTER_AUTH_SECRET!,
      { expiresIn: '15m' },
    );

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh failed' });
  }
});

app.all('/api/auth/{*path}', toNodeHandler(auth));

app.use('/api', routes);

app.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server running successfully',
  });
});

app.use(errorHandler);

const start = async (): Promise<void> => {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully');
    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync();
      console.log('Database synced');
    }
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
