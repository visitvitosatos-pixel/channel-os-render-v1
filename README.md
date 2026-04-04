# Channel OS V1

Deploy-first Telegram Channel OS for one operator and one channel.

## What this build does

- Runs a Telegram bot webhook on a public URL.
- Stores drafts, queue, schedule, logs, and style profile in PostgreSQL.
- Provides a web operator panel.
- Generates 3 AI rewrite variants through OpenRouter if a key is configured.
- Falls back to local deterministic rewrite when no AI key is configured.
- Publishes to a Telegram channel immediately or on schedule.

## What this build does not try to do

- Billing
- Multi-client SaaS UI
- Mini App as the primary interface
- Video avatar module
- Heavy analytics
- n8n-based automation core

## Project structure

- `apps/api` - Express API, Telegram webhook, scheduler, PostgreSQL logic
- `apps/web` - React operator panel
- `render.yaml` - one-click-ish Render blueprint

## Local build check

```powershell
npm install
npm run build
```

## Local run

Create `.env` from `.env.example`, then:

```powershell
npm install
npm run db:init
npm run dev
```

Open `http://localhost:5173` in dev mode.

## Render deploy

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Confirm `render.yaml`.
4. Set these env vars in the web service:
   - `PUBLIC_BASE_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`
   - `TELEGRAM_OPERATOR_CHAT_ID` (optional)
   - `OPENROUTER_API_KEY` (optional)
5. Deploy.
6. Open `/health` and confirm `ok: true`.
7. Log in to the web panel.
8. Press **Set webhook** once after the public URL is ready.
9. Add the bot as an admin in the Telegram channel.

## Telegram operator commands

Send these in a private chat with the bot:

- `/help`
- `/health`
- `/queue`
- `/pause`
- `/resume`

## Notes

- If `OPENROUTER_API_KEY` is empty, AI variants still work through local rewrite fallback.
- Scheduled publishing is implemented inside the API service with a 30-second scan loop.
- For V1 this is intentional: one service, one panel, one channel, minimum moving parts.
