import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import isolationRoutes from './routes/isolationRoutes.js';
import sceneRoutes from './routes/sceneRoutes.js';
import contentBRoutes from './routes/contentBRoutes.js';
import warmMessageRoutes from './routes/warmMessageRoutes.js';
import { reprocessPendingWarmMessages } from './services/warmMessageService.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/scenes', sceneRoutes);
app.use('/api/isolation', isolationRoutes);
app.use('/api/content-b', contentBRoutes);
app.use('/api/warm', warmMessageRoutes);

app.listen(PORT, () => {
  console.log(`[stepA-demo] server started: http://localhost:${PORT}`);
  reprocessPendingWarmMessages()
    .then((count) => {
      if (count > 0) {
        console.log(`[warm-message] queued ${count} pending messages for moderation`);
      }
    })
    .catch((error) => {
      console.warn(`[warm-message] pending moderation recovery failed: ${error.message}`);
    });
});
