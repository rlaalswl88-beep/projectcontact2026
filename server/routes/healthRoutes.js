import { Router } from 'express';
import { databaseHealthCheck, healthCheck } from '../controllers/healthController.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/health/db', databaseHealthCheck);

export default router;
