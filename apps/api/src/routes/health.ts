import { Router } from 'express';
import { getWorkspaceBundle } from '../services/workspace.service.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const bundle = await getWorkspaceBundle();
  res.json({
    ok: true,
    workspace: bundle.workspace.slug,
    channelConfigured: Boolean(bundle.channel?.telegram_channel_id),
    botEnabled: Boolean(bundle.channel?.bot_enabled)
  });
});
