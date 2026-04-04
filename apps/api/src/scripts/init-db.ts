import { ensureSchema } from '../db/init.js';
import { pool } from '../db/pool.js';

await ensureSchema();
console.log('Database schema ensured');
await pool.end();
