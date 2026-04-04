import { Router } from 'express';
import { env } from '../config/env.js';
import { isOperatorChat } from '../services/telegram.service.js';
import { getWorkspaceBundle } from '../services/workspace.service.js';
import { listPosts } from '../services/posts.service.js';
import { updatePublishingRules } from '../services/publishing.service.js';

const router = Router();

async function telegramReply(chatId: string | number, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

router.post('/api/telegram/webhook', async (req, res) => {
  const update = req.body as any;
  const message = update?.message;
  if (!message) return res.json({ ok: true });

  if (!isOperatorChat(message.chat?.id)) {
    return res.json({ ok: true });
  }

  const text = String(message.text ?? '');
  const bundle = await getWorkspaceBundle();

  if (text.startsWith('/start') || text.startsWith('/help')) {
    await telegramReply(message.chat.id, 'Команды: /health, /queue, /pause, /resume');
  } else if (text.startsWith('/health')) {
    await telegramReply(message.chat.id, `Workspace: ${bundle.workspace.name}\nBot enabled: ${bundle.channel.bot_enabled}\nPaused: ${bundle.publishingRules.paused}`);
  } else if (text.startsWith('/queue')) {
    const posts = await listPosts(bundle.workspace.id, 'scheduled');
    const reply = posts.length
      ? posts.slice(0, 10).map((post, index) => `${index + 1}. ${post.title ?? 'Без названия'} — ${post.scheduled_for}`).join('\n')
      : 'Очередь пуста';
    await telegramReply(message.chat.id, reply);
  } else if (text.startsWith('/pause')) {
    await updatePublishingRules(bundle.workspace.id, { paused: true });
    await telegramReply(message.chat.id, 'Публикации поставлены на паузу');
  } else if (text.startsWith('/resume')) {
    await updatePublishingRules(bundle.workspace.id, { paused: false });
    await telegramReply(message.chat.id, 'Публикации возобновлены');
  }

  res.json({ ok: true });
});

export const telegramRouter = router;
