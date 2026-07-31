import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

// Load DATABASE_URL from .env
const envPath = resolve(process.cwd(), '.env');
const envText = readFileSync(envPath, 'utf8');
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error('No DATABASE_URL in .env'); process.exit(1); }

const client = new pg.Client({ connectionString: match[1].trim() });

const sql = process.argv[2];
if (!sql) { console.error('Usage: node query-neon.mjs "SQL"'); process.exit(1); }

try {
  await client.connect();
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (e) {
  console.error('Query error:', e.message);
} finally {
  await client.end();
}
