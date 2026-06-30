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

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

interface EnvConfig {
  port: number;
  db: DbConfig;
  jwt: JwtConfig;
}

const config: EnvConfig = {
  port: Number(process.env.PORT) || 5000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'aone',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

export default config;
