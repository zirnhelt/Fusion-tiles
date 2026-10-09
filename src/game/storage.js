// Persistence that never throws, and degrades gracefully when the browser blocks storage.
//
// itch.io runs the game in a cross-origin iframe, where Safari, Firefox and Chrome (with
// third-party cookies blocked) partition or block localStorage. Layers, best first:
//   1. localStorage
//   2. a cookie per key        (only when localStorage is unavailable)
//   3. window.name             (survives reloads of the same frame; only when localStorage is unavailable)
//   4. in-memory               (lasts until the page closes)
// Layers 2-3 are best effort, so `storageMode()` reports 'limited' whenever localStorage is out.

export const KEYS = {
  highScore: 'elementSwapHighScore', // legacy key — keeps existing players' best score
  discovered: 'fusionTiles.discovered',
  bestZ: 'fusionTiles.bestZ',
  muted: 'fusionTiles.muted',
  seenHelp: 'fusionTiles.seenHelp',
  gamesPlayed: 'fusionTiles.gamesPlayed',
  tips: 'fusionTiles.tips',
  history: 'fusionTiles.history',
  collections: 'fusionTiles.collections', // element sets completed on the saved table (paid out once)
};

const COOKIE_PREFIX = 'ft_';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const NAME_MARK = '__fusionTiles';

const memory = new Map(); // key → raw JSON string (always kept in sync)

const probeLocal = () => {
  try {
    const k = 'fusionTiles.__probe';
    localStorage.setItem(k, '1');
    const ok = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
    return ok;
  } catch {
    return false;
  }
};

const cookieAttrs = () => `; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=None; Secure`;

const readCookie = (name) => {
  try {
    const hit = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
};

const writeCookie = (name, raw) => {
  try {
    document.cookie = `${name}=${encodeURIComponent(raw)}${cookieAttrs()}`;
  } catch {
    // ignore
  }
};

const probeCookie = () => {
  writeCookie('ft_probe', '1');
  const ok = readCookie('ft_probe') === '1';
  try { document.cookie = `ft_probe=; max-age=0; path=/; SameSite=None; Secure`; } catch { /* ignore */ }
  return ok;
};

const readNameStore = () => {
  try {
    const parsed = JSON.parse(window.name);
    return parsed && typeof parsed[NAME_MARK] === 'object' ? parsed[NAME_MARK] : {};
  } catch {
    return {};
  }
};

const writeNameStore = (key, raw) => {
  try {
    const store = readNameStore();
    store[key] = raw;
    window.name = JSON.stringify({ [NAME_MARK]: store });
  } catch {
    // ignore
  }
};

let localOk = probeLocal();
const cookieOk = localOk ? false : probeCookie();

export const storageMode = () => (localOk ? 'local' : 'limited');

export const load = (key, fallback) => {
  let raw = null;
  if (localOk) {
    try { raw = localStorage.getItem(key); } catch { /* fall through */ }
  }
  if (raw == null) raw = memory.get(key) ?? null;
  if (raw == null && !localOk) {
    if (cookieOk) raw = readCookie(COOKIE_PREFIX + key);
    if (raw == null) raw = readNameStore()[key] ?? null;
  }
  if (raw == null) return fallback;
  try {
    memory.set(key, raw);
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const save = (key, value) => {
  let raw;
  try { raw = JSON.stringify(value); } catch { return; }
  memory.set(key, raw);
  if (localOk) {
    try {
      localStorage.setItem(key, raw);
      return;
    } catch {
      localOk = false; // quota or revoked — fall back from here on
    }
  }
  if (cookieOk) writeCookie(COOKIE_PREFIX + key, raw);
  writeNameStore(key, raw);
};

// Browsers that partition storage in iframes (Safari, Firefox, Chrome w/o third-party cookies)
// let the embedded page ask for the real, unpartitioned storage — but only from a click.
// Resolves to the new mode; callers should re-load() their state afterwards and merge it.
export const requestPersistentStorage = async () => {
  if (localOk) return 'local';
  try {
    if (typeof document.requestStorageAccess === 'function') {
      await document.requestStorageAccess();
    }
  } catch {
    return 'limited'; // denied, or the sandbox doesn't allow the request
  }
  if (probeLocal()) {
    localOk = true;
    // Carry anything saved while limited over to the real store (without clobbering what's there)
    for (const [key, raw] of memory) {
      try { if (localStorage.getItem(key) == null) localStorage.setItem(key, raw); } catch { /* ignore */ }
    }
  }
  return storageMode();
};
