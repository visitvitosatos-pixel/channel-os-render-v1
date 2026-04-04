import { pool } from '../db/pool.js';
import { writeAudit } from './audit.service.js';

export async function getPublishingRules(workspaceId: string) {
  const result = await pool.query(`select * from publishing_rules where workspace_id = $1 limit 1`, [workspaceId]);
  return result.rows[0];
}

export async function updatePublishingRules(workspaceId: string, input: { timezone?: string; approvalRequired?: boolean; autoPublishEnabled?: boolean; paused?: boolean; }) {
  const current = await getPublishingRules(workspaceId);
  const result = await pool.query(
    `update publishing_rules
     set timezone = $1,
         approval_required = $2,
         auto_publish_enabled = $3,
         paused = $4,
         updated_at = now()
     where id = $5
     returning *`,
    [input.timezone ?? current.timezone, input.approvalRequired ?? current.approval_required, input.autoPublishEnabled ?? current.auto_publish_enabled, input.paused ?? current.paused, current.id]
  );
  await writeAudit(workspaceId, 'publishing.updated', 'publishing_rules', current.id, input as Record<string, unknown>);
  return result.rows[0];
}
