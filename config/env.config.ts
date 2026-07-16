import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env') });

interface DbConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

interface EnvConfig {
  port: number;
  databaseUrl: string;
  db: DbConfig;
  fbAppId: string;
  fbAppSecret: string;
  fbRedirectUri: string;
  encryptionKey: string;
}

const env: EnvConfig = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'aone',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  fbAppId: process.env.FB_APP_ID || '',
  fbAppSecret: process.env.FB_APP_SECRET || '',
  fbRedirectUri: process.env.FB_REDIRECT_URI || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
};

export default env;
