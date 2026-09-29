// Daily challenge: everyone gets the same seeded board each UTC day. Actions
// are logged compactly so the leaderboard Worker can replay the run with this
// same engine and compute the score itself.

import { START_MOVES, createStartGrid, createZeroAges, isLegalAction, maxElementOn, playAction } from './engine.js';

export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// FNV-1a: string → 32-bit seed
const hashString = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

export const todayUTC = (now = new Date()) => now.toISOString().slice(0, 10);
export const isDay = (day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
export const dailyRng = (day) => mulberry32(hashString(`fusion-tiles/daily/${day}`));

// Compact action log: ['s', r1, c1, r2, c2] swap · ['c', r, c] catalyst · ['h'] shuffle
export const encodeAction = (a) =>
  a.type === 'swap' ? ['s', ...a.from, ...a.to] : a.type === 'catalyst' ? ['c', ...a.cell] : ['h'];

export const decodeAction = (x) => {
  if (!Array.isArray(x)) return null;
  if (x[0] === 's' && x.length === 5) return { type: 'swap', from: [x[1], x[2]], to: [x[3], x[4]] };
  if (x[0] === 'c' && x.length === 3) return { type: 'catalyst', cell: [x[1], x[2]] };
  if (x[0] === 'h' && x.length === 1) return { type: 'shuffle' };
  return null;
};

export const MAX_ACTIONS = 4000;

// Replay a finished daily run. Throws on anything the game wouldn't allow.
export const replayDaily = (day, log) => {
  if (!isDay(day)) throw new Error('bad day');
  if (!Array.isArray(log) || log.length === 0 || log.length > MAX_ACTIONS) throw new Error('bad action log');
  const rng = dailyRng(day);
  const grid = createStartGrid(rng);
  let state = { grid, ages: createZeroAges(), moves: START_MOVES, score: 0 };
  let maxZ = maxElementOn(grid);
  for (let i = 0; i < log.length; i++) {
    const action = decodeAction(log[i]);
    if (!isLegalAction(state, action)) throw new Error(`illegal action at ${i}`);
    state = playAction(state, action, rng);
    maxZ = Math.max(maxZ, state.maxZ);
  }
  if (state.moves > 0) throw new Error('run not finished');
  return { score: state.score, maxZ, turns: log.length };
};
