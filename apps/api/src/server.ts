import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { env } from './config/env.js';
import { ensureSchema } from './db/init.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { workspaceRouter } from './routes/workspace.js';
import { postsRouter } from './routes/posts.js';
import { auditRouter } from './routes/audit.js';
import { telegramRouter } from './routes/telegram.js';
import { getDefaultWorkspace } from './services/workspace.service.js';
import { startScheduler } from './services/scheduler.service.js';
import { setWebhook } from './services/telegram.service.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(authRouter);
app.use(workspaceRouter);
app.use(postsRouter);
app.use(auditRouter);
app.use(telegramRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, '../../../web/dist');

if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api')) return next();
    response.sendFile(path.join(webDistPath, 'index.html'));
  });
}

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected server error' });
});

async function start() {
  await ensureSchema();
  const workspace = await getDefaultWorkspace();
  startScheduler(workspace.id);

  app.listen(env.PORT, async () => {
    console.log(`[API] Listening on ${env.PORT}`);
    if (env.TELEGRAM_BOT_TOKEN && env.PUBLIC_BASE_URL) {
      try {
        const result = await setWebhook();
        console.log('[Telegram] setWebhook result:', result);
      } catch (error) {
        console.error('[Telegram] setWebhook failed:', error);
      }
    }
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
