import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(10000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(4),
  PUBLIC_BASE_URL: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  TELEGRAM_BOT_TOKEN: z.string().optional().or(z.literal('').transform(() => undefined)),
  TELEGRAM_CHANNEL_ID: z.string().optional().or(z.literal('').transform(() => undefined)),
  TELEGRAM_OPERATOR_CHAT_ID: z.string().optional().or(z.literal('').transform(() => undefined)),
  OPENROUTER_API_KEY: z.string().optional().or(z.literal('').transform(() => undefined)),
  OPENROUTER_MODEL: z.string().default('openrouter/auto')
});

export const env = envSchema.parse(process.env);
