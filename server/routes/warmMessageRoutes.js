import { Router } from 'express';
import {
  createWarmMessage,
  listMyWarmMessages,
  listWarmMessages,
} from '../controllers/warmMessageController.js';

const router = Router();

router.get('/messages/mine', listMyWarmMessages);
router.get('/messages', listWarmMessages);
router.post('/messages', createWarmMessage);

export default router;
