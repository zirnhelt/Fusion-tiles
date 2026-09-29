import React, { useEffect, useRef, useState } from 'react';
import { Atom, CalendarDays, HelpCircle, Lightbulb, RotateCcw, Shuffle, FlaskConical, Trophy, Volume2, VolumeX } from 'lucide-react';
import { el } from './game/elements.js';
import * as E from './game/engine.js';
import { dailyRng, encodeAction, todayUTC } from './game/daily.js';
import { sfx } from './game/sfx.js';
import { KEYS, load, save } from './game/storage.js';
import { LeaderboardModal, formatDay } from './components/Leaderboard.jsx';
import Board, { makeBurst, makeFloater, makeCallout, makeFlash } from './components/Board.jsx';
import Hud from './components/Hud.jsx';
import Console from './components/Console.jsx';
import PeriodicTable from './components/PeriodicTable.jsx';
import Tile from './components/Tile.jsx';
import { HelpModal, GameOverModal } from './components/Modals.jsx';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const cellKey = (i, j) => `${i}-${j}`;
const sym = (z) => el(z).symbol;
const EMPTY_FX = { bursts: [], floaters: [], callouts: [], flashes: [] };
const ABORTED = Symbol('aborted');
const FUSION_NAMES = { 4: 'BIG FUSION', 5: 'MEGA FUSION', 6: 'HYPER FUSION' };

const newRun = (highScore, bestZ) => ({
  fusions: 0, fissions: 0, captures: 0, quasi: 0, bestChain: 0, maxZ: 1, seen: new Set(), newDiscoveries: [],
  startHighScore: highScore, startBestZ: bestZ, actions: [],
});

// Classic games use Math.random; the daily board is seeded by the UTC date so
// everyone gets the same start and the same drops for the same moves.
const startGame = (mode) => {
  const day = mode === 'daily' ? todayUTC() : null;
  const rng = day ? dailyRng(day) : Math.random;
  return { mode, day, rng, grid: E.createStartGrid(rng) };
};

const loadDailyBest = (day) => {
  const d = load(KEYS.daily, null);
  return d && d.day === day ? Number(d.best) || 0 : 0;
};

const initialMode = () => {
  try { return new URLSearchParams(location.search).has('daily') ? 'daily' : 'classic'; } catch { return 'classic'; }
};

// Tiles fall from where gravity found them (or from above the board if new)
const fallCells = (fall) => {
  const cells = {};
  fall.forEach((row, i) => row.forEach((d, j) => {
    if (d > 0) cells[cellKey(i, j)] = { kind: 'fall', dy: -d, dur: Math.round(170 + 80 * Math.sqrt(d)), delay: j * 10 };
  }));
  return cells;
};

// Whole board rains in from above (new game)
const introCells = () => {
  const cells = {};
  for (let i = 0; i < E.GRID_SIZE; i++) {
    for (let j = 0; j < E.GRID_SIZE; j++) {
      cells[cellKey(i, j)] = { kind: 'fall', dy: -(E.GRID_SIZE + 1), dur: 520, delay: (E.GRID_SIZE - 1 - i) * 55 + j * 18 };
    }
  }
  return cells;
};

// One-time explanations the first time a new mechanic shows up on the board
const TIPS = {
  forged: {
    title: 'Forged tiles fuse in pairs',
    text: 'Gold-framed tiles are heavier than anything that drops in. Line up just 2.',
    applies: (g, range) => g.some(row => row.some(z => z && E.isForged(z, range))),
  },
  capture: {
    title: 'Neutron capture',
    text: 'Swap H into a forged tile below Bi: it gains a proton and becomes the next element.',
    applies: (g, range) => g.some(row => row.includes(1)) &&
      g.some(row => row.some(z => z && E.isForged(z, range) && z < E.FISSION_THRESHOLD)),
  },
};

let logId = 0;
let toastId = 0;

export default function FusionTiles() {
  const [session, setSession] = useState(() => startGame(initialMode()));
  const [grid, setGrid] = useState(session.grid);
  const [dailyBest, setDailyBest] = useState(() => loadDailyBest(session.day ?? todayUTC()));
  const [showBoard, setShowBoard] = useState(false);
  const [ages, setAges] = useState(E.createZeroAges);
  const [moves, setMoves] = useState(E.START_MOVES);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(load(KEYS.highScore, 0)) || 0);
  const [bestZ, setBestZ] = useState(() => Number(load(KEYS.bestZ, 1)) || 1);
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [catalystMode, setCatalystMode] = useState(false);
  const [catalystHover, setCatalystHover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [motion, setMotion] = useState({ key: 0, cells: {} });
  const [tileFx, setTileFx] = useState({});
  const [fx, setFx] = useState(EMPTY_FX);
  const [shakeKey, setShakeKey] = useState(0);
  const [log, setLog] = useState([]);
  const [movesDelta, setMovesDelta] = useState(null);
  const [discovered, setDiscovered] = useState(() => new Set(load(KEYS.discovered, [])));
  const [runSeen, setRunSeen] = useState(() => new Set());
  const [runMaxZ, setRunMaxZ] = useState(1);
  const [fresh, setFresh] = useState(() => new Set());
  const [toasts, setToasts] = useState([]);
  const [muted, setMuted] = useState(() => !!load(KEYS.muted, false));
  const [showHelp, setShowHelp] = useState(() => !load(KEYS.seenHelp, false));
  const [summary, setSummary] = useState(null);
  const [restartArmed, setRestartArmed] = useState(false);

  const gameToken = useRef(0);
  const motionKey = useRef(0);
  const discoveredRef = useRef(discovered);
  const bestZRef = useRef(bestZ);
  const runRef = useRef(newRun(highScore, bestZ));
  const hintTimer = useRef(null);
  const restartTimer = useRef(null);
  const turnsTaken = useRef(0);
  const tipsSeen = useRef(load(KEYS.tips, {}));

  // ── small helpers ──────────────────────────────────────────────────────────
  const pushLog = (text, tone = 'normal') => setLog(prev => [...prev.slice(-19), { id: ++logId, text, tone }]);

  const spawn = (kind, item, ttl) => {
    setFx(prev => ({ ...prev, [kind]: [...prev[kind], item] }));
    setTimeout(() => setFx(prev => ({ ...prev, [kind]: prev[kind].filter(x => x.id !== item.id) })), ttl);
  };
  const burst = (cell, color, opts) => spawn('bursts', makeBurst(cell, color, opts), 1000);
  const floater = (cell, text, color) => spawn('floaters', makeFloater(cell, text, color), 1050);
  const callout = (text, sub, color) => spawn('callouts', makeCallout(text, sub, color), 1250);
  const flash = (cell) => spawn('flashes', makeFlash(cell), 700);

  const showDelta = (amount) => amount && setMovesDelta({ id: Date.now() + Math.random(), amount });

  const move = (cells) => {
    motionKey.current += 1;
    setMotion({ key: motionKey.current, cells });
    return Object.values(cells).reduce((m, c) => Math.max(m, (c.dur || 0) + (c.delay || 0)), 0);
  };

  // Record every element on the board: run stats, all-time collection, toasts
  const noteElements = (g, { silent = false } = {}) => {
    const run = runRef.current;
    const newly = [];
    for (const z of new Set(g.flat())) {
      if (!z) continue;
      run.seen.add(z);
      if (z > run.maxZ) run.maxZ = z;
      if (!discoveredRef.current.has(z)) {
        discoveredRef.current = new Set(discoveredRef.current).add(z);
        newly.push(z);
      }
    }
    setRunSeen(new Set(run.seen));
    setRunMaxZ(run.maxZ);
    if (run.maxZ > bestZRef.current) {
      bestZRef.current = run.maxZ;
      setBestZ(run.maxZ);
      save(KEYS.bestZ, run.maxZ);
    }
    if (!silent) {
      const range = E.getDepositionRange(g);
      for (const [key, tip] of Object.entries(TIPS)) {
        if (tipsSeen.current[key] || !tip.applies(g, range)) continue;
        tipsSeen.current = { ...tipsSeen.current, [key]: true };
        save(KEYS.tips, tipsSeen.current);
        pushLog(`i ${tip.title.toUpperCase()}`, 'discovery');
        setToasts(prev => [...prev, { id: ++toastId, kind: 'tip', ...tip }]);
      }
    }
    if (newly.length === 0) return;
    newly.sort((a, b) => a - b);
    setDiscovered(discoveredRef.current);
    save(KEYS.discovered, [...discoveredRef.current]);
    if (silent) return;
    run.newDiscoveries.push(...newly);
    setFresh(new Set(newly));
    newly.forEach(z => pushLog(`★ DISCOVERED: ${sym(z)} (${el(z).name})`, 'discovery'));
    // Fold into a toast that's still waiting its turn rather than queueing a backlog
    setToasts(prev => {
      const last = prev[prev.length - 1];
      return prev.length >= 2 && last.elements
        ? [...prev.slice(0, -1), { ...last, elements: [...last.elements, ...newly], total: discoveredRef.current.size }]
        : [...prev, { id: ++toastId, elements: newly, total: discoveredRef.current.size }];
    });
    sfx.discover();
  };

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    sfx.setMuted(muted);
    noteElements(grid, { silent: true });
    move(introCells());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dev-only hook for staging scenarios from the console / tests (stripped from production builds)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__fusionTiles = { setGrid, setAges, setMoves, getGrid: () => grid, getState: () => ({ grid, moves, score, busy, gameOver }) };
  });

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const t = setTimeout(() => setToasts(prev => prev.slice(1)), toasts[0].kind === 'tip' ? 4200 : 2500);
    return () => clearTimeout(t);
  }, [toasts[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const newGame = (mode = session.mode) => {
    gameToken.current += 1;
    const next = startGame(mode);
    const g = next.grid;
    runRef.current = newRun(highScore, bestZRef.current);
    turnsTaken.current = 0;
    setSession(next);
    if (next.day) setDailyBest(loadDailyBest(next.day));
    setShowBoard(false);
    setGrid(g);
    setAges(E.createZeroAges());
    setMoves(E.START_MOVES);
    setScore(0);
    setSelected(null);
    setHint(null);
    setCatalystMode(false);
    setCatalystHover(null);
    setBusy(false);
    setGameOver(false);
    setSummary(null);
    setTileFx({});
    setFx(EMPTY_FX);
    setLog([]);
    setMovesDelta(null);
    setFresh(new Set());
    setRestartArmed(false);
    noteElements(g, { silent: true });
    move(introCells());
  };

  // Restarting (or switching mode) mid-game takes a second tap to confirm
  const requestNewGame = (mode = session.mode) => {
    if (gameOver || turnsTaken.current === 0 || restartArmed === mode) { newGame(mode); return; }
    setRestartArmed(mode);
    clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(() => setRestartArmed(false), 2500);
  };

  const endGame = (finalScore) => {
    const run = runRef.current;
    setGameOver(true);
    setSelected(null);
    setCatalystMode(false);
    sfx.gameOver();
    pushLog('REACTOR SHUTDOWN · OUT OF MOVES', 'warn');
    save(KEYS.gamesPlayed, (Number(load(KEYS.gamesPlayed, 0)) || 0) + 1);
    let isNewBest = finalScore > run.startHighScore && finalScore > 0;
    if (session.day) {
      const prev = loadDailyBest(session.day);
      isNewBest = finalScore > prev && finalScore > 0;
      if (isNewBest) {
        save(KEYS.daily, { day: session.day, best: finalScore });
        setDailyBest(finalScore);
      }
    }
    setSummary({
      isNewBest,
      daily: session.day ? { day: session.day, actions: run.actions, dailyBest: Math.max(finalScore, loadDailyBest(session.day)) } : null,
      run: {
        maxZ: run.maxZ, fusions: run.fusions, nuclear: run.fissions + run.captures + run.quasi, bestChain: Math.max(1, run.bestChain),
        seen: run.seen.size, newDiscoveries: run.newDiscoveries, newBestZ: run.maxZ > run.startBestZ,
      },
    });
  };

  // ── animation playback ────────────────────────────────────────────────────
  const playCascade = async (steps, pause, addScore) => {
    for (const step of steps) {
      const matched = {};
      step.fusions.forEach(f => f.cells.forEach(([r, c]) => { matched[cellKey(r, c)] = { kind: 'matched' }; }));
      setTileFx(matched);
      const biggest = Math.max(...step.fusions.map(f => f.cells.length));
      sfx.match(step.combo, biggest);
      await pause(170);

      const fusing = {};
      step.fusions.forEach(f => f.cells.forEach(([r, c]) => {
        const isTarget = r === f.target[0] && c === f.target[1];
        fusing[cellKey(r, c)] = isTarget ? { kind: 'matched' } : { kind: 'fuse', tx: f.target[1] - c, ty: f.target[0] - r };
      }));
      setTileFx(fusing);
      await pause(200);

      const pops = {};
      let quasi = null;
      step.fusions.forEach(f => {
        pops[cellKey(...f.target)] = { kind: 'pop' };
        floater(f.target, `+${f.points}`, '#fde68a');
        if (f.split) {
          // Too heavy to exist: the compound nucleus splits on the spot
          quasi = f;
          pops[cellKey(...f.split.cell)] = { kind: 'pop' };
          burst(f.target, '#fb923c', { count: 24, spread: 22, size: 2, waveScale: 4 });
          burst(f.split.cell, '#fde68a', { count: 12, spread: 14 });
          pushLog(`✷ QUASI-FISSION: ${f.cells.length} × ${sym(f.from)} → ${sym(f.split.d1)} + ${sym(f.split.d2)}`, 'nuclear');
          runRef.current.quasi += 1;
        } else {
          burst(f.target, el(f.to).palette.glow, { count: 10 + f.cells.length * 2 });
          pushLog(`${f.cells.length} × ${sym(f.from)} → ${sym(f.to)}`);
        }
      });
      setGrid(step.mergedGrid);
      setTileFx(pops);
      addScore(step.score);
      if (quasi) {
        sfx.quasi();
        flash(quasi.target);
        setShakeKey(k => k + 1);
        callout('QUASI-FISSION', `too heavy → ${sym(quasi.split.d1)} + ${sym(quasi.split.d2)}`, '#fb923c');
      } else {
        sfx.fuse(Math.max(...step.fusions.map(f => f.to)));
        if (step.combo >= 2) callout(`CHAIN ×${step.combo}`, `+${E.CASCADE_MOVE_BONUS} moves`, '#a78bfa');
        else if (biggest >= 4) callout(FUSION_NAMES[Math.min(6, biggest)], `+${biggest >= 6 ? 6 : biggest === 5 ? 4 : 2} moves`, '#22d3ee');
      }
      if (step.combo >= 3 || biggest >= 5) setShakeKey(k => k + 1);
      runRef.current.fusions += step.fusions.length;
      runRef.current.bestChain = Math.max(runRef.current.bestChain, step.combo);
      noteElements(step.mergedGrid);
      await pause(240);

      setTileFx({});
      setGrid(step.settledGrid);
      await pause(move(fallCells(step.fall)) + 20);
      noteElements(step.settledGrid);

      if (step.retiredCells.length > 0) {
        const retiring = {};
        step.retiredCells.forEach(([r, c]) => { retiring[cellKey(r, c)] = { kind: 'retire' }; });
        setTileFx(retiring);
        sfx.retire();
        step.retired.forEach(z => pushLog(`✗ RETIRED: ${sym(z)} (below deposit pool)`, 'warn'));
        await pause(380);
        setTileFx({});
        setGrid(step.finalGrid);
        await pause(move(fallCells(step.retireFall)) + 20);
        noteElements(step.finalGrid);
      }
    }
  };

  const playPassive = async (passive, pause) => {
    if (passive.spont) {
      const { cell, other, heavyZ, daughter1, daughter2 } = passive.spont;
      setTileFx({ [cellKey(...cell)]: { kind: 'fission' } });
      sfx.fission();
      await pause(520);
      flash(cell);
      setShakeKey(k => k + 1);
      setGrid(passive.spontGrid);
      setTileFx({ [cellKey(...cell)]: { kind: 'pop' }, [cellKey(...other)]: { kind: 'pop' } });
      burst(cell, '#fb923c', { count: 26, spread: 22, size: 2, waveScale: 4 });
      callout('SPONTANEOUS FISSION', `${sym(heavyZ)} → ${sym(daughter1)} + ${sym(daughter2)}`, '#fb923c');
      pushLog(`⚛ SPONT: ${sym(heavyZ)} → ${sym(daughter1)} + ${sym(daughter2)}`, 'nuclear');
      noteElements(passive.spontGrid);
      await pause(520);
    }
    if (passive.decays.length > 0) {
      const decaying = {};
      passive.decays.forEach(d => { decaying[cellKey(...d.cell)] = { kind: 'decay' }; });
      setTileFx(decaying);
      sfx.decay();
      await pause(600);
      const pops = {};
      passive.decays.forEach(d => {
        pops[cellKey(...d.cell)] = { kind: 'pop' };
        burst(d.cell, '#facc15', { count: 8, spread: 10, wave: false });
        floater(d.cell, 'α', '#fde047');
      });
      setGrid(passive.grid);
      setTileFx(pops);
      const first = passive.decays[0];
      const extra = passive.decays.length > 1 ? ` ×${passive.decays.length}` : '';
      pushLog(`☢ α DECAY: ${sym(first.from)} → ${sym(first.to)}${extra}`, 'nuclear');
      noteElements(passive.grid);
      await pause(320);
    }
    setTileFx({});
  };

  // ── turns ─────────────────────────────────────────────────────────────────
  // Every board action flows through here: action → cascades → radioactivity → commit
  const runTurn = async (action) => {
    if (busy || gameOver || !E.isLegalAction({ moves }, action)) return;
    const token = gameToken.current;
    const pause = async (ms) => {
      await wait(ms);
      if (token !== gameToken.current) throw ABORTED;
    };
    setBusy(true);
    setHint(null);
    setSelected(null);
    turnsTaken.current += 1;

    // The whole turn is decided up front by the engine; the rest is playback
    const t = E.playAction({ grid, ages, moves, score }, action, session.rng);
    runRef.current.actions.push(encodeAction(action));

    // Score ticks up as each reaction lands, not just when the turn settles
    let liveScore = score;
    const addScore = (points) => { liveScore += points; setScore(liveScore); };

    try {
      if (t.capture) {
        // Neutron flies into the nucleus, which beta-decays one step up the table
        const c = t.capture;
        const { neutron, target } = c;
        setTileFx({
          [cellKey(...neutron)]: { kind: 'fuse', tx: target[1] - neutron[1], ty: target[0] - neutron[0] },
          [cellKey(...target)]: { kind: 'capturing' },
        });
        sfx.capture();
        await pause(230);
        setGrid(c.capturedGrid);
        setTileFx({ [cellKey(...target)]: { kind: 'pop' } });
        burst(target, '#67e8f9', { count: 16, spread: 16 });
        floater(target, '+1 p⁺', '#a5f3fc');
        callout('NEUTRON CAPTURE', `${sym(c.from)} → ${sym(c.to)}`, '#22d3ee');
        pushLog(`n CAPTURE: ${sym(c.from)} + n → ${sym(c.to)} (β⁻)`, 'nuclear');
        runRef.current.captures += 1;
        addScore(c.score);
        noteElements(c.capturedGrid);
        setMoves(t.movesAfterAction);
        showDelta(-1);
        await pause(300);
        setTileFx({});
        setGrid(c.grid);
        await pause(move(fallCells(c.fall)) + 20);
        noteElements(c.grid);
      } else if (t.fission) {
        const f = t.fission;
        setTileFx({ [cellKey(...f.heavy)]: { kind: 'fission' }, [cellKey(...f.neutron)]: { kind: 'fission' } });
        sfx.fission();
        await pause(480);
        flash(f.heavy);
        setShakeKey(k => k + 1);
        setGrid(f.grid);
        setTileFx({ [cellKey(...f.heavy)]: { kind: 'pop' }, [cellKey(...f.neutron)]: { kind: 'pop' } });
        burst(f.heavy, '#fb923c', { count: 30, spread: 26, size: 2.2, waveScale: 5 });
        burst(f.neutron, '#fde68a', { count: 14, spread: 16 });
        floater(f.heavy, `+${f.score}`, '#fdba74');
        callout('FISSION!', `${sym(f.heavyZ)} → ${sym(f.daughter1)} + ${sym(f.daughter2)}`, '#fb923c');
        pushLog(`FISSION: ${sym(f.heavyZ)} → ${sym(f.daughter1)} + ${sym(f.daughter2)}`, 'nuclear');
        runRef.current.fissions += 1;
        addScore(f.score);
        noteElements(f.grid);
        showDelta(E.FISSION_MOVE_BONUS - 1);
        setMoves(t.movesAfterAction);
        await pause(480);
        setTileFx({});
      } else if (t.swapped) {
        const [a, b] = [action.from, action.to];
        setGrid(t.swapped);
        sfx.swap();
        await pause(move({
          [cellKey(...a)]: { kind: 'slide', dx: b[1] - a[1], dy: b[0] - a[0], dur: 170 },
          [cellKey(...b)]: { kind: 'slide', dx: a[1] - b[1], dy: a[0] - b[0], dur: 170 },
        }) + 10);
        setMoves(t.movesAfterAction);
        showDelta(-1);
        if (t.cascade.steps.length === 0) sfx.dud();
      } else if (t.catalyst) {
        const [r, c] = action.cell;
        const area = {};
        t.catalyst.area.forEach(([i, j]) => { area[cellKey(i, j)] = { kind: 'convert' }; });
        setCatalystMode(false);
        setCatalystHover(null);
        setGrid(t.catalyst.grid);
        setTileFx(area);
        sfx.catalyst();
        burst([r, c], '#4ade80', { count: 18, spread: 20 });
        pushLog(`⚗ CATALYST → ${sym(t.catalyst.from)} ×${t.catalyst.area.length}`);
        setMoves(t.movesAfterAction);
        showDelta(-E.CATALYST_COST);
        await pause(380);
        setTileFx({});
      }

      if (t.cascade.steps.length > 0) await playCascade(t.cascade.steps, pause, addScore);
      if (t.passive && (t.passive.spont || t.passive.decays.length > 0)) {
        await playPassive(t.passive, pause);
        if (t.after?.steps.length > 0) await playCascade(t.after.steps, pause, addScore);
      }

      // Commit
      setGrid(t.grid);
      setAges(t.ages);
      setScore(t.score);
      if (!session.day && t.score > highScore) {
        setHighScore(t.score);
        save(KEYS.highScore, t.score);
      }
      setMoves(t.moves);
      if (t.bonus > 0) {
        showDelta(t.bonus);
        sfx.bonus();
      }
      noteElements(t.grid);
      if (t.over) endGame(t.score);
    } catch (err) {
      if (err !== ABORTED) throw err;
    } finally {
      if (token === gameToken.current) setBusy(false);
    }
  };

  const doShuffle = async () => {
    const action = { type: 'shuffle' };
    if (busy || gameOver || !E.isLegalAction({ moves }, action)) return;
    const token = gameToken.current;
    setBusy(true);
    setHint(null);
    setSelected(null);
    setCatalystMode(false);
    turnsTaken.current += 1;
    try {
      const t = E.playAction({ grid, ages, moves, score }, action, session.rng);
      runRef.current.actions.push(encodeAction(action));
      const cells = {};
      t.shuffle.origin.forEach((row, i) => row.forEach(([oi, oj], j) => {
        cells[cellKey(i, j)] = { kind: 'slide', dx: oj - j, dy: oi - i, dur: 460, delay: Math.round(Math.random() * 120) };
      }));
      setGrid(t.grid);
      setAges(t.ages);
      sfx.shuffle();
      pushLog(`↻ SHUFFLE · −${E.SHUFFLE_COST} MOVES`);
      setMoves(t.moves);
      showDelta(-E.SHUFFLE_COST);
      await wait(move(cells) + 20);
      if (token === gameToken.current && t.over) endGame(score);
    } finally {
      if (token === gameToken.current) setBusy(false);
    }
  };

  // ── input ─────────────────────────────────────────────────────────────────
  const handleTap = (i, j) => {
    if (busy || gameOver) return;
    if (catalystMode) {
      runTurn({ type: 'catalyst', cell: [i, j] });
      return;
    }
    setHint(null);
    if (!selected || !(Math.abs(i - selected.row) + Math.abs(j - selected.col) === 1)) {
      const same = selected && selected.row === i && selected.col === j;
      setSelected(same ? null : { row: i, col: j });
      if (!same) sfx.select();
      return;
    }
    runTurn({ type: 'swap', from: [selected.row, selected.col], to: [i, j] });
  };

  const handleSwipe = (from, to) => {
    if (busy || gameOver || catalystMode) return;
    runTurn({ type: 'swap', from, to });
  };

  const showHint = () => {
    if (busy || gameOver) return;
    const h = E.findHintMove(grid);
    if (!h) return;
    setHint(h);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 3000);
  };

  const toggleCatalyst = () => {
    if (busy || gameOver || moves < E.CATALYST_COST) return;
    setCatalystMode(m => !m);
    setCatalystHover(null);
    setSelected(null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sfx.setMuted(next);
    save(KEYS.muted, next);
    if (!next) sfx.select();
  };

  const closeHelp = () => {
    setShowHelp(false);
    save(KEYS.seenHelp, true);
  };

  const depositRange = E.getDepositionRange(grid);
  const toast = toasts[0];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="backdrop" aria-hidden="true" />
      <div className="starfield" aria-hidden="true" />

      <main className="layout relative z-10">
        <header className="area-header">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Atom className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)] motion-safe:animate-[spin_14s_linear_infinite]" />
              <div className="min-w-0">
                <h1 className="title-glow whitespace-nowrap text-lg font-bold leading-tight text-white sm:text-2xl">FUSION TILES</h1>
                <div className="truncate text-[8.5px] tracking-[0.22em] text-slate-500 sm:text-[9px]">MATCH · MERGE · ADVANCE THE TABLE</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Sound off' : 'Sound on'}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button className="icon-btn" onClick={() => setShowHelp(true)} aria-label="How to play" title="How to play">
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                className={restartArmed === session.mode ? 'btn h-9 border-red-400/60 px-3 text-xs text-red-200' : 'icon-btn'}
                onClick={() => requestNewGame()}
                aria-label="New game"
                title="New game"
              >
                <RotateCcw className="h-4 w-4" />{restartArmed === session.mode && 'Restart?'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="mode-switch" role="radiogroup" aria-label="Game mode">
              {[
                { mode: 'classic', label: 'Classic', icon: Atom },
                { mode: 'daily', label: `Daily · ${formatDay(session.day ?? todayUTC())}`, icon: CalendarDays },
              ].map(({ mode, label, icon: Icon }) => {
                const active = session.mode === mode;
                const armed = !active && restartArmed === mode;
                return (
                  <button
                    key={mode}
                    role="radio"
                    aria-checked={active}
                    className={`mode-option ${active ? 'mode-active' : ''} ${armed ? 'mode-armed' : ''}`}
                    onClick={() => !active && requestNewGame(mode)}
                  >
                    <Icon className="h-3.5 w-3.5" />{armed ? 'Abandon run?' : label}
                  </button>
                );
              })}
            </div>
            <button className="icon-btn ml-auto" onClick={() => setShowBoard(true)} aria-label="Daily leaderboard" title="Daily leaderboard">
              <Trophy className="h-4 w-4 text-amber-300" />
            </button>
          </div>
        </header>

        <div className="col-left">
          <div className="area-board relative">
            <Board
              grid={grid}
              ages={ages}
              poolMax={depositRange.max}
              selected={selected}
              hint={hint}
              catalystMode={catalystMode}
              catalystHover={catalystHover}
              motion={motion}
              tileFx={tileFx}
              fx={fx}
              shakeKey={shakeKey}
              disabled={busy || gameOver}
              onTap={handleTap}
              onSwipe={handleSwipe}
              onHover={setCatalystHover}
            />
            {catalystMode && (
              <div className="pointer-events-none absolute inset-x-0 -top-3 z-30 flex justify-center">
                <div className="flex items-center gap-1.5 rounded-full border border-green-400/60 bg-green-950/90 px-3 py-1 text-xs font-semibold text-green-200 shadow-[0_0_20px_-4px_rgba(74,222,128,0.8)]">
                  <FlaskConical className="h-3.5 w-3.5" /> Tap a tile: its neighbours become copies
                </div>
              </div>
            )}
          </div>

          <div className="area-tools grid grid-cols-3 gap-2">
            <button className="btn" onClick={showHint} disabled={busy || gameOver}>
              <Lightbulb className="h-4 w-4 text-amber-300" /> Hint <span className="cost cost-free">free</span>
            </button>
            <button className="btn" onClick={doShuffle} disabled={busy || gameOver || moves < E.SHUFFLE_COST}>
              <Shuffle className="h-4 w-4 text-sky-300" /> Shuffle <span className="cost">−{E.SHUFFLE_COST}</span>
            </button>
            <button
              className={`btn ${catalystMode ? 'btn-active' : ''}`}
              onClick={toggleCatalyst}
              disabled={busy || gameOver || moves < E.CATALYST_COST}
              aria-pressed={catalystMode}
            >
              <FlaskConical className="h-4 w-4 text-green-300" /> Catalyst <span className="cost">−{E.CATALYST_COST}</span>
            </button>
          </div>
        </div>

        <div className="col-right">
          <div className="area-hud">
            <Hud
              score={score}
              moves={moves}
              highScore={session.day ? dailyBest : highScore}
              bestLabel={session.day ? 'Today' : 'Best'}
              movesDelta={movesDelta}
              runMaxZ={runMaxZ}
              bestZ={bestZ}
            />
          </div>
          <div className="area-console">
            <Console lines={log} />
          </div>
          <div className="area-table">
            <PeriodicTable discovered={discovered} runSeen={runSeen} fresh={fresh} depositRange={depositRange} />
          </div>
        </div>

        <footer className="area-footer pb-2 text-center text-[11px] text-slate-600">
          All 118 elements · weights rounded to whole units · progress is saved on this device
        </footer>
      </main>

      {toast?.kind === 'tip' && (
        <div key={toast.id} className="toast toast-tip" role="status">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/40 bg-sky-400/10 text-xl">💡</div>
          <div className="min-w-0 max-w-[280px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">New mechanic</div>
            <div className="text-sm font-bold text-white">{toast.title}</div>
            <div className="text-xs leading-snug text-slate-300">{toast.text}</div>
          </div>
        </div>
      )}
      {toast && toast.kind !== 'tip' && (
        <div key={toast.id} className="toast" role="status">
          <div className="flex -space-x-2">
            {toast.elements.slice(0, 4).map(z => <Tile key={z} z={z} size={44} showWeight={false} />)}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
              New discover{toast.elements.length > 1 ? 'ies' : 'y'}
            </div>
            <div className="truncate text-sm font-bold text-white">
              {toast.elements.map(z => el(z).name).join(', ')}
            </div>
            <div className="font-mono text-[11px] text-slate-400">{toast.total} / 118 on your table</div>
          </div>
        </div>
      )}

      {showHelp && <HelpModal onClose={closeHelp} />}
      {gameOver && summary && (
        <GameOverModal
          score={score}
          highScore={highScore}
          isNewBest={summary.isNewBest}
          run={summary.run}
          discoveredCount={discovered.size}
          daily={summary.daily}
          onPlayAgain={() => newGame()}
        />
      )}
      {showBoard && (
        <LeaderboardModal
          day={todayUTC()}
          onClose={() => setShowBoard(false)}
          onPlayDaily={session.mode === 'daily' && session.day === todayUTC() ? null : () => { setShowBoard(false); requestNewGame('daily'); }}
        />
      )}
    </div>
  );
}
