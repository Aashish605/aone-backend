import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import env from './env.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
});

export default async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    const migrationPath = resolve(__dirname, '..', 'migrations', 'to_be_migrated');
    console.log(`Running migrations from ${migrationPath}`);
    const files = ['2026-07-13T17-26-59.780Z.sql'];
    for (const file of files) {
      const sql = readFileSync(resolve(migrationPath, file), 'utf-8');
      const statements = sql
        .replace(/create table /g, 'CREATE TABLE IF NOT EXISTS ')
        .replace(/create index /g, 'CREATE INDEX IF NOT EXISTS ')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await client.query(stmt);
        } catch (err: any) {
          if (err.code === '42P07' || err.message?.includes('already exists')) {
            continue;
          }
          throw err;
        }
      }
    }
    console.log('Database init complete');
  } finally {
    client.release();
    await pool.end();
  }
}
