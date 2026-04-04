import { env } from '../config/env.js';

type Variant = { body: string; provider: string; model: string };

function localRewrite(input: { body: string; voice: string; bannedPhrases: string[] }): Variant[] {
  const cleaned = input.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => paragraph.replace(/\s+/g, ' '));

  const base = cleaned.join('\n\n');
  const withoutBanned = input.bannedPhrases.reduce((acc, phrase) => acc.replaceAll(phrase, ''), base).trim();

  const variants = [
    `🧭 ${withoutBanned}`,
    `${withoutBanned}\n\nВывод: держим мысль коротко, спокойно и по делу.`,
    `${withoutBanned}\n\nЕсли смотреть трезво: хаос в подаче почти всегда убивает доверие раньше, чем сам продукт.`
  ];

  return variants.map((body) => ({ body, provider: 'local', model: `local:${input.voice}` }));
}

export async function generateVariants(input: { body: string; voice: string; bannedPhrases: string[]; count: number; }) {
  if (!env.OPENROUTER_API_KEY) {
    return localRewrite(input).slice(0, input.count);
  }

  const prompt = `You rewrite Telegram channel posts. Return JSON array with ${input.count} variants. Keep Russian language. Tone: ${input.voice}. Avoid these phrases: ${input.bannedPhrases.join(', ') || 'none'}. Input:\n${input.body}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'Return only valid JSON: [{"body":"..."}]' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return localRewrite(input).slice(0, input.count);
  }

  const data = await response.json() as any;
  const raw = data?.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, input.count).map((item: any) => ({ body: String(item.body ?? ''), provider: 'openrouter', model: env.OPENROUTER_MODEL }));
    }
  } catch {
    // fall back below
  }

  return localRewrite(input).slice(0, input.count);
}
