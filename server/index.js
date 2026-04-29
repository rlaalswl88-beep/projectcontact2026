import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import healthRoutes from './routes/healthRoutes.js';
import isolationRoutes from './routes/isolationRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/isolation', isolationRoutes);

app.listen(PORT, () => {
  console.log(`[stepA-demo] server started: http://localhost:${PORT}`);
});
