# Render deployment notes

## Recommended service shape

- 1 Render web service for API + Telegram webhook + scheduler + static web panel
- 1 Render Postgres instance

## Required env vars

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `PUBLIC_BASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHANNEL_ID`

Optional:

- `TELEGRAM_OPERATOR_CHAT_ID`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

## Post-deploy checklist

1. Visit `/health`
2. Log in to the panel
3. Fill channel settings if needed
4. Add the bot as channel admin in Telegram
5. Click **Set webhook** in the panel
6. Send `/health` to the bot in private chat
7. Create one draft and publish it now
8. Create one scheduled post and verify it publishes
