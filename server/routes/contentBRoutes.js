import { Router } from 'express';
import { listContentBItems } from '../controllers/contentBController.js';

const router = Router();

router.get('/items', listContentBItems);

export default router;
