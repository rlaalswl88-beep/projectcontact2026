import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/healthRoutes.js';
import isolationRoutes from './routes/isolationRoutes.js';
import sceneRoutes from './routes/sceneRoutes.js';
import contentBRoutes from './routes/contentBRoutes.js';
import warmMessageRoutes from './routes/warmMessageRoutes.js';
import { reprocessPendingWarmMessages } from './services/warmMessageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

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

app.use(express.static(distDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(indexHtml, (err) => {
    if (err) {
      next(err);
    }
  });
});

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
