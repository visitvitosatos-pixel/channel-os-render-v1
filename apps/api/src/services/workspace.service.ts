import { pool } from '../db/pool.js';

export async function getDefaultWorkspace() {
  const result = await pool.query(`select * from workspaces where slug = 'default' limit 1`);
  return result.rows[0];
}

export async function getWorkspaceBundle() {
  const workspace = await getDefaultWorkspace();
  const [channelResult, styleResult, rulesResult] = await Promise.all([
    pool.query(`select * from channels where workspace_id = $1 order by created_at asc limit 1`, [workspace.id]),
    pool.query(`select * from style_profiles where workspace_id = $1 order by created_at asc limit 1`, [workspace.id]),
    pool.query(`select * from publishing_rules where workspace_id = $1 limit 1`, [workspace.id])
  ]);

  return {
    workspace,
    channel: channelResult.rows[0],
    styleProfile: styleResult.rows[0],
    publishingRules: rulesResult.rows[0]
  };
}
