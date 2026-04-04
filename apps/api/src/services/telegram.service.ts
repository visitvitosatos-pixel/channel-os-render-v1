import { env } from '../config/env.js';

const baseApi = env.TELEGRAM_BOT_TOKEN ? `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}` : null;

export async function setWebhook() {
  if (!baseApi || !env.PUBLIC_BASE_URL) return { ok: false, skipped: true as const };
  const webhookUrl = `${env.PUBLIC_BASE_URL}/api/telegram/webhook`;
  const response = await fetch(`${baseApi}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });
  return response.json();
}

export async function sendChannelMessage(text: string) {
  if (!baseApi || !env.TELEGRAM_CHANNEL_ID) {
    throw new Error('Telegram bot token or channel ID is missing');
  }

  const response = await fetch(`${baseApi}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHANNEL_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.description ?? 'Telegram sendMessage failed');
  }
  return data.result as { message_id: number };
}

export function isOperatorChat(chatId: string | number | undefined) {
  if (!env.TELEGRAM_OPERATOR_CHAT_ID) return true;
  return String(chatId) === String(env.TELEGRAM_OPERATOR_CHAT_ID);
}
