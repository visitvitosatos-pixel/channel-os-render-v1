import { pool } from '../db/pool.js';
import { writeAudit } from './audit.service.js';
import type { PostRecord, PostStatus } from '../lib/types.js';

function rowToPost(row: any): PostRecord {
  return {
    ...row,
    scheduled_for: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : null,
    published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString()
  };
}

export async function listPosts(workspaceId: string, status?: string) {
  const values: any[] = [workspaceId];
  const where = ['p.workspace_id = $1'];
  if (status) {
    values.push(status);
    where.push(`p.status = $${values.length}`);
  }
  const result = await pool.query(
    `select p.*, count(v.id)::int as variant_count
     from posts p
     left join post_variants v on v.post_id = p.id
     where ${where.join(' and ')}
     group by p.id
     order by coalesce(p.scheduled_for, p.created_at) desc`,
    values
  );
  return result.rows.map(rowToPost);
}

export async function getPost(postId: string) {
  const result = await pool.query(`select * from posts where id = $1 limit 1`, [postId]);
  return result.rows[0] ? rowToPost(result.rows[0]) : null;
}

export async function createPost(workspaceId: string, input: { title?: string | null; body: string; }) {
  const result = await pool.query(
    `insert into posts (workspace_id, title, body) values ($1, $2, $3) returning *`,
    [workspaceId, input.title ?? null, input.body]
  );
  const post = rowToPost(result.rows[0]);
  await writeAudit(workspaceId, 'post.created', 'post', post.id, { title: post.title });
  return post;
}

export async function updatePost(postId: string, workspaceId: string, input: { title?: string | null; body?: string; status?: PostStatus; scheduledFor?: string | null; }) {
  const current = await getPost(postId);
  if (!current) return null;
  const result = await pool.query(
    `update posts
     set title = $1,
         body = $2,
         status = $3,
         scheduled_for = $4,
         updated_at = now()
     where id = $5
     returning *`,
    [input.title ?? current.title, input.body ?? current.body, input.status ?? current.status, input.scheduledFor ?? current.scheduled_for, postId]
  );
  const post = rowToPost(result.rows[0]);
  await writeAudit(workspaceId, 'post.updated', 'post', post.id, { status: post.status });
  return post;
}

export async function setPostStatus(postId: string, workspaceId: string, status: PostStatus) {
  const result = await pool.query(`update posts set status = $1, updated_at = now() where id = $2 returning *`, [status, postId]);
  const post = result.rows[0] ? rowToPost(result.rows[0]) : null;
  if (post) {
    await writeAudit(workspaceId, `post.${status}`, 'post', post.id);
  }
  return post;
}

export async function setScheduled(postId: string, workspaceId: string, scheduledFor: string) {
  const result = await pool.query(
    `update posts set status = 'scheduled', scheduled_for = $1, updated_at = now() where id = $2 returning *`,
    [scheduledFor, postId]
  );
  const post = result.rows[0] ? rowToPost(result.rows[0]) : null;
  if (post) {
    await writeAudit(workspaceId, 'post.scheduled', 'post', post.id, { scheduledFor: post.scheduled_for });
  }
  return post;
}

export async function replacePostBodyWithVariant(postId: string, variantId: string, workspaceId: string) {
  const variantResult = await pool.query(`select * from post_variants where id = $1 and post_id = $2`, [variantId, postId]);
  const variant = variantResult.rows[0];
  if (!variant) return null;

  const result = await pool.query(`update posts set body = $1, updated_at = now() where id = $2 returning *`, [variant.body, postId]);
  await writeAudit(workspaceId, 'post.variant_selected', 'post', postId, { variantId });
  return rowToPost(result.rows[0]);
}

export async function clearVariants(postId: string) {
  await pool.query(`delete from post_variants where post_id = $1`, [postId]);
}

export async function saveVariants(postId: string, variants: { body: string; provider: string; model: string; }[]) {
  await clearVariants(postId);
  for (let i = 0; i < variants.length; i += 1) {
    const variant = variants[i];
    await pool.query(
      `insert into post_variants (post_id, variant_index, body, provider, model) values ($1, $2, $3, $4, $5)`,
      [postId, i + 1, variant.body, variant.provider, variant.model]
    );
  }
}

export async function listVariants(postId: string) {
  const result = await pool.query(`select * from post_variants where post_id = $1 order by variant_index asc`, [postId]);
  return result.rows;
}

export async function listScheduledToPublish(nowIso: string) {
  const result = await pool.query(
    `select * from posts where status = 'scheduled' and scheduled_for is not null and scheduled_for <= $1 order by scheduled_for asc`,
    [nowIso]
  );
  return result.rows.map(rowToPost);
}

export async function markPublished(postId: string, workspaceId: string, telegramMessageId: string | null) {
  const result = await pool.query(
    `update posts
     set status = 'published',
         published_at = now(),
         telegram_message_id = $1,
         updated_at = now()
     where id = $2
     returning *`,
    [telegramMessageId, postId]
  );
  const post = result.rows[0] ? rowToPost(result.rows[0]) : null;
  if (post) {
    await writeAudit(workspaceId, 'post.published', 'post', postId, { telegramMessageId });
  }
  return post;
}

export async function markFailed(postId: string, workspaceId: string, errorText: string) {
  const result = await pool.query(`update posts set status = 'failed', updated_at = now() where id = $1 returning *`, [postId]);
  const post = result.rows[0] ? rowToPost(result.rows[0]) : null;
  if (post) {
    await writeAudit(workspaceId, 'post.failed', 'post', postId, { errorText });
  }
  return post;
}
