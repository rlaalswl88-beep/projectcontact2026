import { Router } from 'express';
import { analyzeIsolation } from '../controllers/isolationController.js';

const router = Router();

router.post('/analyze', analyzeIsolation);

export default router;
