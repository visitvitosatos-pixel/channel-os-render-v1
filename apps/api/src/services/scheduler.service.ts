import { listScheduledToPublish, markFailed, markPublished } from './posts.service.js';
import { getPublishingRules } from './publishing.service.js';
import { sendChannelMessage } from './telegram.service.js';

let isRunning = false;

export function startScheduler(workspaceId: string) {
  setInterval(async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const rules = await getPublishingRules(workspaceId);
      if (rules?.paused) return;
      const posts = await listScheduledToPublish(new Date().toISOString());
      for (const post of posts) {
        try {
          const result = await sendChannelMessage(post.body);
          await markPublished(post.id, workspaceId, String(result.message_id));
        } catch (error) {
          await markFailed(post.id, workspaceId, error instanceof Error ? error.message : 'Unknown publish error');
        }
      }
    } finally {
      isRunning = false;
    }
  }, 30_000);
}
