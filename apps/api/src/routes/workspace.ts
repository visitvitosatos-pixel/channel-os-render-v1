import { Router } from 'express';
import { requireAuth } from './middleware.js';
import { getWorkspaceBundle } from '../services/workspace.service.js';
import { updateStyleProfile } from '../services/style.service.js';
import { getPublishingRules, updatePublishingRules } from '../services/publishing.service.js';
import { pool } from '../db/pool.js';
import { z } from 'zod';
import { setWebhook } from '../services/telegram.service.js';

export const workspaceRouter = Router();

workspaceRouter.get('/api/workspace', requireAuth, async (_req, res) => {
  const bundle = await getWorkspaceBundle();
  res.json(bundle);
});

workspaceRouter.patch('/api/workspace/channel', requireAuth, async (req, res) => {
  const schema = z.object({ title: z.string().min(1), username: z.string().optional().nullable(), telegramChannelId: z.string().optional().nullable(), botEnabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const result = await pool.query(
    `update channels set title = $1, username = $2, telegram_channel_id = $3, bot_enabled = $4, updated_at = now() where id = $5 returning *`,
    [parsed.data.title, parsed.data.username ?? null, parsed.data.telegramChannelId ?? null, parsed.data.botEnabled, bundle.channel.id]
  );
  res.json(result.rows[0]);
});

workspaceRouter.patch('/api/workspace/style', requireAuth, async (req, res) => {
  const schema = z.object({ voice: z.string().min(1), bannedPhrases: z.array(z.string()).default([]), rulesJson: z.record(z.any()).default({}) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const style = await updateStyleProfile(bundle.workspace.id, parsed.data);
  res.json(style);
});

workspaceRouter.patch('/api/workspace/publishing', requireAuth, async (req, res) => {
  const schema = z.object({ timezone: z.string().optional(), approvalRequired: z.boolean().optional(), autoPublishEnabled: z.boolean().optional(), paused: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const bundle = await getWorkspaceBundle();
  const rules = await updatePublishingRules(bundle.workspace.id, parsed.data);
  res.json(rules);
});

workspaceRouter.get('/api/workspace/publishing', requireAuth, async (_req, res) => {
  const bundle = await getWorkspaceBundle();
  const rules = await getPublishingRules(bundle.workspace.id);
  res.json(rules);
});

workspaceRouter.post('/api/workspace/set-webhook', requireAuth, async (_req, res) => {
  const result = await setWebhook();
  res.json(result);
});
