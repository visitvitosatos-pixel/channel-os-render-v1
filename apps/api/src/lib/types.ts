export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';

export type PostRecord = {
  id: string;
  workspace_id: string;
  title: string | null;
  body: string;
  status: PostStatus;
  scheduled_for: string | null;
  published_at: string | null;
  telegram_message_id: string | null;
  created_at: string;
  updated_at: string;
  variant_count?: number;
};
