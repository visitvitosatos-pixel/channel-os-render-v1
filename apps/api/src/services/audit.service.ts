import { pool } from '../db/pool.js';

export async function writeAudit(workspaceId: string, action: string, entityType: string, entityId: string, meta: Record<string, unknown> = {}) {
  await pool.query(
    `insert into audit_logs (workspace_id, action, entity_type, entity_id, meta_json) values ($1, $2, $3, $4, $5::jsonb)`,
    [workspaceId, action, entityType, entityId, JSON.stringify(meta)]
  );
}
