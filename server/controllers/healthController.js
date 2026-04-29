import { getApiHealth, getDatabaseHealth } from '../services/healthService.js';

export function healthCheck(req, res) {
  res.json(getApiHealth());
}

export async function databaseHealthCheck(req, res) {
  try {
    const result = await getDatabaseHealth();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Aiven DB connection failed',
      error: error.message,
    });
  }
}
