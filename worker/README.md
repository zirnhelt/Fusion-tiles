# Daily leaderboard Worker

A Cloudflare Worker + D1 database behind the game's **Daily** mode.

Every UTC day has one seeded board (`src/game/daily.js`). The same seed drives the
tiles that drop in, so the same moves always give the same result. The game logs
each action (about 2 KB for a full run) and posts the log. The Worker **replays it
with the game's own engine** and stores the score it computed. The client never
sends a score.

```
GET  /api/daily/:day?player=<id>   top 25, total players, and your rank
POST /api/daily/:day/scores        { playerId, name, actions } → verified score + board
```

- Each player keeps their best run per day. The player id is a random id stored
  on the device and is never returned by the API.
- Runs are accepted for today and yesterday (UTC), so a game started just before
  midnight still counts.
- Rejected with a reason: illegal moves, unfinished runs, closed days, and logs
  over 4,000 actions or 64 KB.

## One-time setup

```sh
cd worker
npm install
npx wrangler login
npx wrangler d1 create fusion-tiles        # paste the database_id into wrangler.jsonc
npm run db:migrate                         # creates the scores table
npm run deploy                             # prints https://fusion-tiles-leaderboard.<you>.workers.dev
```

Then in GitHub → Settings → Secrets and variables → Actions:

| Kind     | Name                    | Value                                                   |
| -------- | ----------------------- | ------------------------------------------------------- |
| Variable | `LEADERBOARD_URL`       | the workers.dev URL above (the game is built with it)   |
| Secret   | `CLOUDFLARE_API_TOKEN`  | token from the "Edit Cloudflare Workers" template, plus D1 edit |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | your account id                                         |

With the token set, every push to `main` applies migrations and redeploys the
Worker next to the game. **This matters:** the Worker verifies runs with
`src/game`, so a rules change deployed to only one side would make fresh runs
fail verification.

Without `LEADERBOARD_URL`, Daily mode still works offline and just hides the
leaderboard.

## Local development

```sh
cd worker && npm run db:migrate:local && npm run dev         # http://localhost:8787
VITE_LEADERBOARD_URL=http://localhost:8787 npm run dev       # from the repo root
```

## Limits worth knowing

- **CPU:** a typical run replays in about 5–15 ms. A run with dozens of shuffles
  can reach about 45 ms, because each shuffle searches for a playable
  arrangement. The Workers Free plan allows 10 ms of CPU per request, so the
  heaviest runs could be refused there. Workers Paid ($5/mo, 30 s CPU) has plenty
  of headroom.
- **Bots:** replaying runs stops forged scores, but the seed is public, so a
  solver can still find a strong run offline. That's a fair fight for a hobby
  daily. Keeping the seed server-side only helps until the day's board is live.
- **No rate limiting.** Add a Cloudflare rate-limiting rule on `/api/*` if spam
  shows up.
