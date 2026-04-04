import { pool } from './pool.js';

export async function ensureSchema() {
  await pool.query(`create extension if not exists pgcrypto;`);

  await pool.query(`
    create table if not exists workspaces (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      slug text not null unique,
      status text not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists channels (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      telegram_channel_id text,
      title text not null,
      username text,
      bot_enabled boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists style_profiles (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      voice text not null default 'calm_precise_confident',
      rules_json jsonb not null default '{}'::jsonb,
      banned_phrases jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists publishing_rules (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null unique references workspaces(id) on delete cascade,
      timezone text not null default 'Europe/Moscow',
      approval_required boolean not null default true,
      auto_publish_enabled boolean not null default false,
      paused boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists posts (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      title text,
      body text not null,
      status text not null default 'draft',
      scheduled_for timestamptz,
      published_at timestamptz,
      telegram_message_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists post_variants (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references posts(id) on delete cascade,
      variant_index int not null,
      body text not null,
      provider text,
      model text,
      created_at timestamptz not null default now(),
      unique(post_id, variant_index)
    );
  `);

  await pool.query(`
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      workspace_id uuid not null references workspaces(id) on delete cascade,
      action text not null,
      entity_type text not null,
      entity_id text not null,
      meta_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
  `);

  const workspaceResult = await pool.query(`
    insert into workspaces (name, slug)
    values ('DOРОЖЕ', 'default')
    on conflict (slug) do update set updated_at = now()
    returning *;
  `);

  const workspaceId = workspaceResult.rows[0].id as string;

  await pool.query(`
    insert into channels (workspace_id, title, telegram_channel_id, bot_enabled)
    values ($1, 'Main channel', null, false)
    on conflict do nothing;
  `, [workspaceId]);

  await pool.query(`
    insert into publishing_rules (workspace_id)
    values ($1)
    on conflict (workspace_id) do nothing;
  `, [workspaceId]);

  const styleCount = await pool.query('select count(*)::int as count from style_profiles where workspace_id = $1', [workspaceId]);
  if (styleCount.rows[0].count === 0) {
    await pool.query(`insert into style_profiles (workspace_id) values ($1)`, [workspaceId]);
  }
}
