export type LoginResponse = {
  token: string;
  user: { email: string; role: string };
};

export type WorkspaceBundle = {
  workspace: { id: string; name: string; slug: string; status: string };
  channel: { id: string; title: string; username: string | null; telegram_channel_id: string | null; bot_enabled: boolean };
  styleProfile: { id: string; voice: string; banned_phrases: string[]; rules_json: Record<string, unknown> };
  publishingRules: { timezone: string; approval_required: boolean; auto_publish_enabled: boolean; paused: boolean };
};

export type Post = {
  id: string;
  title: string | null;
  body: string;
  status: string;
  scheduled_for: string | null;
  published_at: string | null;
  variant_count?: number;
};

export type Variant = {
  id: string;
  variant_index: number;
  body: string;
  provider: string | null;
  model: string | null;
};
