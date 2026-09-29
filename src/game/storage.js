// localStorage wrappers that never throw (private mode, sandboxed iframes on itch.io, etc.)

export const KEYS = {
  highScore: 'elementSwapHighScore', // legacy key — keeps existing players' best score
  discovered: 'fusionTiles.discovered',
  bestZ: 'fusionTiles.bestZ',
  muted: 'fusionTiles.muted',
  seenHelp: 'fusionTiles.seenHelp',
  gamesPlayed: 'fusionTiles.gamesPlayed',
  tips: 'fusionTiles.tips',
  daily: 'fusionTiles.daily',       // { day, best } — today's best daily score
  playerId: 'fusionTiles.playerId', // anonymous id for the daily leaderboard
  playerName: 'fusionTiles.playerName',
};

export const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — progress just won't persist
  }
};
