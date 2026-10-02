// Client for the daily leaderboard Worker (worker/). Set VITE_LEADERBOARD_URL
// at build time to turn it on; without it the daily board still works offline.

import { KEYS, load, save } from './storage.js';

const API = (import.meta.env.VITE_LEADERBOARD_URL || '').replace(/\/+$/, '');
export const leaderboardEnabled = API !== '';

export const getPlayerId = () => {
  let id = load(KEYS.playerId, null);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    save(KEYS.playerId, id);
  }
  return id;
};

const request = async (path, init) => {
  const res = await fetch(`${API}${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Leaderboard error (${res.status})`);
  return data;
};

export const fetchLeaderboard = (day) =>
  request(`/api/daily/${day}?player=${encodeURIComponent(getPlayerId())}`);

export const submitRun = (day, name, actions) =>
  request(`/api/daily/${day}/scores`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ playerId: getPlayerId(), name, actions }),
  });
