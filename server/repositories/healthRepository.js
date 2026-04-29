import { dbPool } from '../config/db.js';

export async function pingDatabase() {
  await dbPool.query('SELECT 1');
}
