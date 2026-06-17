import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { accessRouter } from './routes/access';

dotenv.config({ path: '.env.local' });

import { frameworkRouter } from './routes/frameworks';
import { aiRouter } from './routes/ai';
import { taskRouter } from './routes/tasks';

const app = express();
const PORT = Number(process.env.SERVER_PORT ?? 3001);

app.use(
  cors({
    origin: [
      'https://auditops.relishtechglobal.com',
      'https://auditopss.netlify.app',
      'http://localhost:3000'
    ],
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (evidence + task documents)
app.use('/api/uploads', express.static(path.join(process.cwd(), 'server', 'data', 'uploads')));

// API Routes
app.use('/api/access', accessRouter);
app.use('/api/frameworks', frameworkRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tasks', taskRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  const hasKey = !!process.env.GROQ_API_KEY;
  console.log(`\n🚀 AuditOps backend running on http://localhost:${PORT}`);
  console.log(`   Groq AI  : ${hasKey ? '✅ GROQ_API_KEY found' : '⚠️  GROQ_API_KEY not set in .env.local — AI features disabled'}`);
  console.log(`   Data dir : server/data/\n`);
});
