import { Router } from 'express';
import { requireAuth } from './middleware.js';
import { getWorkspaceBundle } from '../services/workspace.service.js';
import { pool } from '../db/pool.js';

export const auditRouter = Router();

auditRouter.get('/api/logs', requireAuth, async (_req, res) => {
  const bundle = await getWorkspaceBundle();
  const result = await pool.query(`select * from audit_logs where workspace_id = $1 order by created_at desc limit 100`, [bundle.workspace.id]);
  res.json(result.rows);
});
