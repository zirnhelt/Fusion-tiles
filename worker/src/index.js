// Daily leaderboard for Fusion Tiles.
//
//   GET  /api/daily/:day?player=<id>   top scores (+ your rank if you pass your id)
//   POST /api/daily/:day/scores        { playerId, name, actions } → verified score + rank
//
// Scores are never trusted from the client: the Worker replays the submitted
// action log against the day's seeded board using the game's own engine.

import { replayDaily, isDay, todayUTC } from '../../src/game/daily.js';

const TOP_N = 25;
const MAX_BODY = 64 * 1024;
const DAY_MS = 86_400_000;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS, ...headers } });
const fail = (status, error) => json({ error }, status);

// Today, plus yesterday so a run started just before midnight UTC still counts
const openDays = (now = Date.now()) => [todayUTC(new Date(now)), todayUTC(new Date(now - DAY_MS))];

const cleanName = (raw) => {
  // Drop control and bidi-override characters; the game escapes everything else when rendering
  const name = [...String(raw ?? '').replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, '').replace(/\s+/g, ' ').trim()]
    .slice(0, 16).join('').trim();
  return name || 'Anonymous';
};
const validPlayerId = (id) => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);

const rankOf = (db, day, score) =>
  db.prepare('SELECT COUNT(*) + 1 AS rank FROM scores WHERE day = ? AND score > ?').bind(day, score).first('rank');

const board = async (db, day, playerId) => {
  const [top, total, you] = await db.batch([
    db.prepare('SELECT name, score, max_z AS maxZ FROM scores WHERE day = ? ORDER BY score DESC, updated_at LIMIT ?').bind(day, TOP_N),
    db.prepare('SELECT COUNT(*) AS n FROM scores WHERE day = ?').bind(day),
    db.prepare('SELECT name, score, max_z AS maxZ FROM scores WHERE day = ? AND player_id = ?').bind(day, playerId ?? ''),
  ]);
  const entries = [];
  top.results.forEach((row, i) => {
    // Ties share a rank
    const rank = i > 0 && row.score === top.results[i - 1].score ? entries[i - 1].rank : i + 1;
    entries.push({ rank, ...row });
  });
  const mine = you.results[0];
  return {
    day,
    total: total.results[0].n,
    entries,
    you: mine ? { ...mine, rank: await rankOf(db, day, mine.score) } : null,
  };
};

const submit = async (request, env, day) => {
  if (!openDays().includes(day)) return fail(400, 'That daily board is closed');
  const text = await request.text();
  if (text.length > MAX_BODY) return fail(413, 'Run too long');
  let body;
  try { body = JSON.parse(text); } catch { return fail(400, 'Bad JSON'); }
  if (!validPlayerId(body?.playerId)) return fail(400, 'Bad player id');

  let run;
  try {
    run = replayDaily(day, body.actions);
  } catch (err) {
    return fail(422, `Run could not be verified (${err.message})`);
  }

  const name = cleanName(body.name);
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO scores (day, player_id, name, score, max_z, turns, actions, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
    ON CONFLICT (day, player_id) DO UPDATE SET
      name       = excluded.name,
      max_z      = CASE WHEN excluded.score > scores.score THEN excluded.max_z      ELSE scores.max_z      END,
      turns      = CASE WHEN excluded.score > scores.score THEN excluded.turns      ELSE scores.turns      END,
      actions    = CASE WHEN excluded.score > scores.score THEN excluded.actions    ELSE scores.actions    END,
      updated_at = CASE WHEN excluded.score > scores.score THEN excluded.updated_at ELSE scores.updated_at END,
      score      = MAX(scores.score, excluded.score)
  `).bind(day, body.playerId, name, run.score, run.maxZ, run.turns, JSON.stringify(body.actions), now).run();

  const result = await board(env.DB, day, body.playerId);
  return json({ ...result, run: { score: run.score, maxZ: run.maxZ } });
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { pathname, searchParams } = new URL(request.url);
    const m = pathname.match(/^\/api\/daily\/([^/]+)(\/scores)?\/?$/);
    if (!m) return fail(404, 'Not found');
    const [, day, scores] = m;
    if (!isDay(day)) return fail(400, 'Bad day');

    try {
      if (scores && request.method === 'POST') return await submit(request, env, day);
      if (!scores && request.method === 'GET') {
        const player = searchParams.get('player');
        return json(await board(env.DB, day, validPlayerId(player) ? player : null), 200, { 'cache-control': 'no-store' });
      }
      return fail(405, 'Method not allowed');
    } catch (err) {
      console.error(err);
      return fail(500, 'Leaderboard unavailable');
    }
  },
};
