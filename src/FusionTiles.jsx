import React, { useEffect, useRef, useState } from 'react';
import { Atom, History, HelpCircle, Lightbulb, RotateCcw, Shuffle, FlaskConical, Volume2, VolumeX } from 'lucide-react';
import { el } from './game/elements.js';
import * as E from './game/engine.js';
import { sfx } from './game/sfx.js';
import { KEYS, load, save, storageMode, requestPersistentStorage } from './game/storage.js';
import Board, { makeBurst, makeFloater, makeCallout, makeFlash } from './components/Board.jsx';
import Hud from './components/Hud.jsx';
import Console from './components/Console.jsx';
import PeriodicTable from './components/PeriodicTable.jsx';
import Tile from './components/Tile.jsx';
import { HelpModal, GameOverModal, HistoryModal, StorageWarning, HISTORY_LIMIT } from './components/Modals.jsx';
import TitleScreen from './components/TitleScreen.jsx';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const cellKey = (i, j) => `${i}-${j}`;
const sym = (z) => el(z).symbol;
// How long tiles take to fly into their fusion target / a fired neutron takes to hit
const FUSE_FLIGHT_MS = 340;
const NEUTRON_FLIGHT_MS = 520;
const EMPTY_FX = { bursts: [], floaters: [], callouts: [], flashes: [] };
const ABORTED = Symbol('aborted');
const TITLE_EXIT_MS = 380;
// Keyed by tiles past the minimum match / by fusions landing at once
const FUSION_NAMES = { 1: 'BIG FUSION', 2: 'MEGA FUSION', 3: 'HYPER FUSION' };
const MULTI_NAMES = { 2: 'DOUBLE', 3: 'TRIPLE', 4: 'QUADRUPLE' };
const SET_TOAST_MS = 3800;

// Saved history is untrusted: keep only well-formed entries
const loadHistory = () => {
  const raw = load(KEYS.history, []);
  return Array.isArray(raw)
    ? raw.filter(h => h && Number.isFinite(h.score) && Number.isFinite(h.at) && Number.isFinite(h.maxZ)).slice(0, HISTORY_LIMIT)
    : [];
};

const newRun = (highScore, bestZ) => ({
  fusions: 0, fissions: 0, captures: 0, quasi: 0, bestChain: 0, maxZ: 1, seen: new Set(), sets: new Set(), newDiscoveries: [],
  startHighScore: highScore, startBestZ: bestZ,
});

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
  const [grid, setGrid] = useState(() => E.createStartGrid());
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
  const [showHelp, setShowHelp] = useState(false);
  // Title screen greets first-time players only; returning players go straight to the board
  const [title, setTitle] = useState(() => (load(KEYS.seenHelp, false) ? 'gone' : 'open')); // open → leaving → gone
  const [summary, setSummary] = useState(null);
  const [restartArmed, setRestartArmed] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState(storageMode);
  const [enablingStorage, setEnablingStorage] = useState(false);

  const gameToken = useRef(0);
  const motionKey = useRef(0);
  const discoveredRef = useRef(discovered);
  const bestZRef = useRef(bestZ);
  const runRef = useRef(newRun(highScore, bestZ));
  const restartTimer = useRef(null);
  const turnsTaken = useRef(0);
  const tipsSeen = useRef(load(KEYS.tips, {}));
  const historyRef = useRef(history);

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
    if (title === 'gone') move(introCells());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dev-only hook for staging scenarios from the console / tests (stripped from production builds)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__fusionTiles = { setGrid, setAges, setMoves, getGrid: () => grid };
  });

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const ms = { tip: 4200, set: SET_TOAST_MS }[toasts[0].kind] ?? 2500;
    const t = setTimeout(() => setToasts(prev => prev.slice(1)), ms);
    return () => clearTimeout(t);
  }, [toasts[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const newGame = () => {
    gameToken.current += 1;
    const g = E.createStartGrid();
    runRef.current = newRun(highScore, bestZRef.current);
    turnsTaken.current = 0;
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

  const requestNewGame = () => {
    if (gameOver || turnsTaken.current === 0 || restartArmed) { newGame(); return; }
    setRestartArmed(true);
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
    const at = Date.now();
    const nextHistory = [
      { at, score: finalScore, maxZ: run.maxZ, fusions: run.fusions, bestChain: Math.max(1, run.bestChain) },
      ...historyRef.current,
    ].slice(0, HISTORY_LIMIT);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    save(KEYS.history, nextHistory);
    setSummary({
      runAt: at,
      isNewBest: finalScore > run.startHighScore && finalScore > 0,
      run: {
        maxZ: run.maxZ, fusions: run.fusions, nuclear: run.fissions + run.captures + run.quasi, bestChain: Math.max(1, run.bestChain),
        seen: run.seen.size, newDiscoveries: run.newDiscoveries, newBestZ: run.maxZ > run.startBestZ,
        sets: E.ELEMENT_SETS.filter(set => run.sets.has(set.key)),
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
      const mostExtra = Math.max(...step.fusions.map(f => f.extra));
      sfx.match(step.combo, biggest);
      await pause(170);

      const fusing = {};
      step.fusions.forEach(f => f.cells.forEach(([r, c]) => {
        const isTarget = r === f.target[0] && c === f.target[1];
        fusing[cellKey(r, c)] = isTarget ? { kind: 'matched' } : { kind: 'fuse', tx: f.target[1] - c, ty: f.target[0] - r };
      }));
      setTileFx(fusing);
      await pause(FUSE_FLIGHT_MS);

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
        // The step's biggest points multiplier and everything it refunds
        const topMult = step.multiplier * E.sizeMultiplier(mostExtra);
        const movesText = `+${step.bonusMoves} move${step.bonusMoves === 1 ? '' : 's'}`;
        const sub = `×${topMult} points · ${movesText}`;
        const multi = MULTI_NAMES[Math.min(4, step.fusions.length)];
        if (step.combo >= 2) callout(`CHAIN ×${step.combo}${multi ? ` · ${multi}` : ''}`, sub, '#a78bfa');
        else if (multi) callout(`${multi} FUSION`, sub, '#f472b6');
        else if (mostExtra > 0) callout(FUSION_NAMES[mostExtra], sub, '#22d3ee');
        if (topMult > 1) pushLog(`✦ ×${topMult} POINTS · ${movesText.toUpperCase()}`, 'discovery');
      }
      if (step.combo >= 3 || biggest >= 5 || step.multiplier >= 4) setShakeKey(k => k + 1);
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
    if (busy || gameOver) return;
    const token = gameToken.current;
    const pause = async (ms) => {
      await wait(ms);
      if (token !== gameToken.current) throw ABORTED;
    };
    setBusy(true);
    setHint(null);
    setSelected(null);
    turnsTaken.current += 1;

    const startGrid = grid;
    const startAges = ages;
    let g = grid;
    let mv = moves;
    let gained = 0;
    let bonus = 0;
    let targetPos = null;
    // Score ticks up as each reaction lands, not just when the turn settles
    let liveScore = score;
    const addScore = (points) => { liveScore += points; setScore(liveScore); };

    try {
      if (action.type === 'swap') {
        const kind = E.classifySwap(g, action.from, action.to);
        const fission = kind.type === 'fission' ? kind : null;
        if (kind.type === 'capture') {
          // Neutron flies into the nucleus, which beta-decays one step up the table
          const { neutron, target } = kind;
          const c = E.resolveCapture(g, neutron, target);
          setTileFx({
            [cellKey(...neutron)]: { kind: 'fuse', tx: target[1] - neutron[1], ty: target[0] - neutron[0], ms: NEUTRON_FLIGHT_MS },
            [cellKey(...target)]: { kind: 'capturing' },
          });
          sfx.capture();
          await pause(NEUTRON_FLIGHT_MS + 20);
          setGrid(c.capturedGrid);
          setTileFx({ [cellKey(...target)]: { kind: 'pop' } });
          burst(target, '#67e8f9', { count: 16, spread: 16 });
          floater(target, '+1 p⁺', '#a5f3fc');
          callout('NEUTRON CAPTURE', `${sym(c.from)} → ${sym(c.to)}`, '#22d3ee');
          pushLog(`n CAPTURE: ${sym(c.from)} + n → ${sym(c.to)} (β⁻)`, 'nuclear');
          runRef.current.captures += 1;
          addScore(c.score);
          noteElements(c.capturedGrid);
          mv -= 1;
          setMoves(mv);
          showDelta(-1);
          await pause(300);
          setTileFx({});
          setGrid(c.grid);
          await pause(move(fallCells(c.fall)) + 20);
          noteElements(c.grid);
          g = c.grid;
          gained += c.score;
          targetPos = { row: c.landed[0], col: c.landed[1] };
        } else if (fission) {
          const f = E.resolveFission(g, fission.neutron, fission.heavy);
          setTileFx({ [cellKey(...fission.heavy)]: { kind: 'fission' }, [cellKey(...fission.neutron)]: { kind: 'fission' } });
          sfx.fission();
          await pause(480);
          flash(fission.heavy);
          setShakeKey(k => k + 1);
          setGrid(f.grid);
          setTileFx({ [cellKey(...fission.heavy)]: { kind: 'pop' }, [cellKey(...fission.neutron)]: { kind: 'pop' } });
          burst(fission.heavy, '#fb923c', { count: 30, spread: 26, size: 2.2, waveScale: 5 });
          burst(fission.neutron, '#fde68a', { count: 14, spread: 16 });
          floater(fission.heavy, `+${f.score}`, '#fdba74');
          callout('FISSION!', `${sym(f.heavyZ)} → ${sym(f.daughter1)} + ${sym(f.daughter2)}`, '#fb923c');
          pushLog(`FISSION: ${sym(f.heavyZ)} → ${sym(f.daughter1)} + ${sym(f.daughter2)}`, 'nuclear');
          runRef.current.fissions += 1;
          addScore(f.score);
          noteElements(f.grid);
          g = f.grid;
          gained += f.score;
          mv += -1 + E.FISSION_MOVE_BONUS;
          showDelta(E.FISSION_MOVE_BONUS - 1);
          setMoves(mv);
          await pause(480);
          setTileFx({});
        } else {
          const [a, b] = [action.from, action.to];
          const swapped = E.swapCells(g, a, b);
          setGrid(swapped);
          sfx.swap();
          await pause(move({
            [cellKey(...a)]: { kind: 'slide', dx: b[1] - a[1], dy: b[0] - a[0], dur: 170 },
            [cellKey(...b)]: { kind: 'slide', dx: a[1] - b[1], dy: a[0] - b[0], dur: 170 },
          }) + 10);
          g = swapped;
          mv -= 1;
          setMoves(mv);
          showDelta(-1);
          targetPos = { row: b[0], col: b[1] };
          if (E.findMatches(g).length === 0) sfx.dud();
        }
      } else if (action.type === 'catalyst') {
        const [r, c] = action.cell;
        const converted = E.applyCatalyst(g, r, c);
        const area = {};
        E.getCatalystArea(r, c).forEach(([i, j]) => { area[cellKey(i, j)] = { kind: 'convert' }; });
        setCatalystMode(false);
        setCatalystHover(null);
        setGrid(converted);
        setTileFx(area);
        sfx.catalyst();
        burst([r, c], '#4ade80', { count: 18, spread: 20 });
        pushLog(`⚗ CATALYST → ${sym(g[r][c])} ×${Object.keys(area).length}`);
        g = converted;
        mv -= E.CATALYST_COST;
        setMoves(mv);
        showDelta(-E.CATALYST_COST);
        targetPos = { row: r, col: c };
        await pause(380);
        setTileFx({});
      }

      const cascade = E.resolveCascade(g, targetPos);
      if (cascade.steps.length > 0) await playCascade(cascade.steps, pause, addScore);
      g = cascade.grid;
      gained += cascade.score;
      bonus += cascade.bonusMoves;

      let a = E.computeNewAges(startGrid, startAges, g);
      if (mv + bonus > 0) {
        const passive = E.resolvePassive(g, a);
        g = passive.grid;
        a = passive.ages;
        if (passive.spont || passive.decays.length > 0) {
          await playPassive(passive, pause);
          // Decay or fission products can line up a fresh chain reaction
          const after = E.resolveCascade(passive.grid, null);
          if (after.steps.length > 0) {
            await playCascade(after.steps, pause, addScore);
            g = after.grid;
            a = E.computeNewAges(passive.grid, passive.ages, g, 0);
            gained += after.score;
            bonus += after.bonusMoves;
          }
        }
      }

      // Whole categories made this run pay out once each
      noteElements(g);
      for (const set of E.completedSets(runRef.current.seen, runRef.current.sets)) {
        runRef.current.sets.add(set.key);
        callout(set.label.toUpperCase(), `SET COMPLETE · +${set.moves} moves`, set.color);
        pushLog(`◆ SET COMPLETE: ${set.label.toUpperCase()} · +${set.moves} MOVES · +${set.points.toLocaleString()}`, 'discovery');
        setToasts(prev => [...prev, { id: ++toastId, kind: 'set', set }]);
        setShakeKey(k => k + 1);
        sfx.discover();
        addScore(set.points);
        gained += set.points;
        bonus += set.moves;
        await pause(1150);
      }

      // Commit
      setGrid(g);
      setAges(a);
      const newScore = score + gained;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
        save(KEYS.highScore, newScore);
      }
      const finalMoves = mv + bonus;
      setMoves(finalMoves);
      if (bonus > 0) {
        showDelta(bonus);
        sfx.bonus();
      }
      if (finalMoves <= 0) endGame(newScore);
    } catch (err) {
      if (err !== ABORTED) throw err;
    } finally {
      if (token === gameToken.current) setBusy(false);
    }
  };

  const doShuffle = async () => {
    if (busy || gameOver || moves <= E.SHUFFLE_COST) return;
    const token = gameToken.current;
    setBusy(true);
    setHint(null);
    setSelected(null);
    setCatalystMode(false);
    turnsTaken.current += 1;
    try {
      const sh = E.shuffleBoard(grid, ages);
      const cells = {};
      sh.origin.forEach((row, i) => row.forEach(([oi, oj], j) => {
        cells[cellKey(i, j)] = { kind: 'slide', dx: oj - j, dy: oi - i, dur: 460, delay: Math.round(Math.random() * 120) };
      }));
      setGrid(sh.grid);
      setAges(sh.ages);
      sfx.shuffle();
      pushLog(`↻ SHUFFLE · −${E.SHUFFLE_COST} MOVES`);
      const mv = moves - E.SHUFFLE_COST;
      setMoves(mv);
      showDelta(-E.SHUFFLE_COST);
      await wait(move(cells) + 20);
      if (token === gameToken.current && mv <= 0) endGame(score);
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

  // A paid hint stays lit until the board changes
  const showHint = () => {
    if (busy || gameOver || hint || moves <= E.HINT_COST) return;
    const h = E.findHintMove(grid);
    if (!h) return;
    turnsTaken.current += 1;
    setHint(h);
    setMoves(moves - E.HINT_COST);
    showDelta(-E.HINT_COST);
    sfx.select();
    pushLog(`💡 HINT · −${E.HINT_COST} MOVE${E.HINT_COST === 1 ? '' : 'S'}`);
  };

  const toggleCatalyst = () => {
    if (busy || gameOver || moves <= E.CATALYST_COST) return;
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

  const closeHelp = () => setShowHelp(false);

  // Ask the browser for real storage (needs a click), then merge whatever it already holds
  const enableStorage = async () => {
    setEnablingStorage(true);
    const next = await requestPersistentStorage();
    setEnablingStorage(false);
    setMode(next);
    if (next !== 'local') return;
    const savedBest = Number(load(KEYS.highScore, 0)) || 0;
    const hs = Math.max(highScore, savedBest);
    setHighScore(hs);
    save(KEYS.highScore, hs);
    const bz = Math.max(bestZRef.current, Number(load(KEYS.bestZ, 1)) || 1);
    bestZRef.current = bz;
    setBestZ(bz);
    save(KEYS.bestZ, bz);
    const disc = new Set([...load(KEYS.discovered, []), ...discoveredRef.current]);
    discoveredRef.current = disc;
    setDiscovered(disc);
    save(KEYS.discovered, [...disc]);
    const byAt = new Map([...loadHistory(), ...historyRef.current].map(h => [h.at, h]));
    const merged = [...byAt.values()].sort((a, b) => b.at - a.at).slice(0, HISTORY_LIMIT);
    historyRef.current = merged;
    setHistory(merged);
    save(KEYS.history, merged);
  };

  // Leaving the title screen: fade it out, then rain the board in (the click also unlocks audio)
  const startFromTitle = () => {
    if (title !== 'open' || showHelp) return;
    setTitle('leaving');
    save(KEYS.seenHelp, true);
    sfx.select();
    setTimeout(() => {
      setTitle('gone');
      move(introCells());
    }, TITLE_EXIT_MS);
  };

  const depositRange = E.getDepositionRange(grid);
  const toast = toasts[0];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="backdrop" aria-hidden="true" />
      <div className="starfield" aria-hidden="true" />

      <main className="layout relative z-10">
        <header className="area-header flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Atom className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 text-sky-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)] motion-safe:animate-[spin_14s_linear_infinite]" />
            <div className="min-w-0">
              <h1 className="title-glow whitespace-nowrap text-lg font-bold leading-tight text-white sm:text-2xl">FUSION TILES</h1>
              <div className="truncate text-[8.5px] tracking-[0.22em] text-slate-500 sm:text-[9px]">MATCH · FUSE · CLIMB</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Sound off' : 'Sound on'}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button className="icon-btn" onClick={() => setShowHistory(true)} aria-label="Recent runs" title="Recent runs">
              <History className="h-4 w-4" />
            </button>
            <button className="icon-btn" onClick={() => setShowHelp(true)} aria-label="How to play" title="How to play">
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              className={restartArmed ? 'btn h-9 border-red-400/60 px-3 text-xs text-red-200' : 'icon-btn'}
              onClick={requestNewGame}
              aria-label="New game"
              title="New game"
            >
              <RotateCcw className="h-4 w-4" />{restartArmed && 'Restart?'}
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
            <button className="btn" onClick={showHint} disabled={busy || gameOver || !!hint || moves <= E.HINT_COST}>
              <Lightbulb className="h-4 w-4 text-amber-300" /> Hint <span className="cost">−{E.HINT_COST}</span>
            </button>
            <button className="btn" onClick={doShuffle} disabled={busy || gameOver || moves <= E.SHUFFLE_COST}>
              <Shuffle className="h-4 w-4 text-sky-300" /> Shuffle <span className="cost">−{E.SHUFFLE_COST}</span>
            </button>
            <button
              className={`btn ${catalystMode ? 'btn-active' : ''}`}
              onClick={toggleCatalyst}
              disabled={busy || gameOver || moves <= E.CATALYST_COST}
              aria-pressed={catalystMode}
            >
              <FlaskConical className="h-4 w-4 text-green-300" /> Catalyst <span className="cost">−{E.CATALYST_COST}</span>
            </button>
          </div>
        </div>

        <div className="col-right">
          <div className="area-hud">
            <Hud score={score} moves={moves} highScore={highScore} movesDelta={movesDelta} runMaxZ={runMaxZ} bestZ={bestZ} />
          </div>
          <div className="area-console">
            <Console lines={log} />
          </div>
          <div className="area-table">
            <PeriodicTable discovered={discovered} runSeen={runSeen} fresh={fresh} depositRange={depositRange} />
          </div>
        </div>

        <footer className="area-footer pb-2 text-center text-[11px] text-slate-600">
          {mode === 'local'
            ? 'All 118 elements · weights rounded to whole units · progress is saved on this device'
            : (
              <div className="mx-auto max-w-sm text-left">
                <StorageWarning onEnable={enableStorage} busy={enablingStorage} />
              </div>
            )}
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
      {toast?.kind === 'set' && (
        <div key={toast.id} className="toast toast-set" role="status" style={{ '--set': toast.set.color }}>
          <div className="flex -space-x-3">
            {toast.set.members.slice(0, 7).map(z => <Tile key={z} z={z} size={36} showWeight={false} />)}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: toast.set.color }}>Set complete</div>
            <div className="truncate text-sm font-bold text-white">{toast.set.label}</div>
            <div className="font-mono text-[11px] text-slate-300">+{toast.set.moves} moves · +{toast.set.points.toLocaleString()}</div>
          </div>
        </div>
      )}
      {toast?.elements && (
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

      {title !== 'gone' && (
        <TitleScreen
          leaving={title === 'leaving'}
          muted={muted}
          onToggleMute={toggleMute}
          onStart={startFromTitle}
          onHelp={() => setShowHelp(true)}
        />
      )}
      {showHelp && <HelpModal onClose={closeHelp} />}
      {showHistory && <HistoryModal history={history} highScore={highScore} onClose={() => setShowHistory(false)} />}
      {gameOver && summary && (
        <GameOverModal
          score={score}
          highScore={highScore}
          isNewBest={summary.isNewBest}
          run={summary.run}
          discoveredCount={discovered.size}
          history={history}
          runAt={summary.runAt}
          storageLimited={mode !== 'local'}
          onEnableStorage={enableStorage}
          enablingStorage={enablingStorage}
          onPlayAgain={newGame}
        />
      )}
    </div>
  );
}
