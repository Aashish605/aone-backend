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

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', toNodeHandler(auth));

// Debug endpoints
// Debug endpoints
app.get('/api/ping', (_req, res) => res.json({ ok: true }));
app.get('/api/debug-env', (_req, res) => {
  res.json({
    fbAppIdSet: !!process.env.FB_APP_ID,
    fbAppSecretSet: !!process.env.FB_APP_SECRET,
    fbRedirectUriSet: !!process.env.FB_REDIRECT_URI,
    encryptionKeySet: !!process.env.ENCRYPTION_KEY,
    corsOriginSet: !!process.env.CORS_ORIGIN,
    databaseUrlSet: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
});
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
