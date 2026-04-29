import { dbConfig } from '../config/db.js';
import { pingDatabase } from '../repositories/healthRepository.js';

export function getApiHealth() {
  return {
    ok: true,
    service: 'stepA-demo-backend',
    timestamp: new Date().toISOString(),
  };
}

export async function getDatabaseHealth() {
  await pingDatabase();
  return {
    ok: true,
    message: 'Aiven DB connection success',
    host: dbConfig.host,
    database: dbConfig.database,
  };
}
