import { pool } from '../db/pool.js';
import { writeAudit } from './audit.service.js';

export async function getStyleProfile(workspaceId: string) {
  const result = await pool.query(`select * from style_profiles where workspace_id = $1 order by created_at asc limit 1`, [workspaceId]);
  return result.rows[0];
}

export async function updateStyleProfile(workspaceId: string, input: { voice?: string; rulesJson?: Record<string, unknown>; bannedPhrases?: string[]; }) {
  const current = await getStyleProfile(workspaceId);
  const result = await pool.query(
    `update style_profiles
     set voice = $1,
         rules_json = $2::jsonb,
         banned_phrases = $3::jsonb,
         updated_at = now()
     where id = $4
     returning *`,
    [input.voice ?? current.voice, JSON.stringify(input.rulesJson ?? current.rules_json), JSON.stringify(input.bannedPhrases ?? current.banned_phrases), current.id]
  );
  await writeAudit(workspaceId, 'style.updated', 'style_profile', current.id);
  return result.rows[0];
}
