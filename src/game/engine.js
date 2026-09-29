// Pure game rules for Fusion Tiles. No React, no timers — every function takes
// a grid (2-D array of atomic numbers, or null for empty) and returns new data.
// The UI plays back the "steps" these functions return as animations, and
// scripts/simulate.mjs runs the exact same rules headlessly for balancing.

import { ELEMENTS } from './elements.js';

export const GRID_SIZE = 6;
export const START_MOVES = 40;
export const FISSION_THRESHOLD = 83;        // Bi (Z=83) and heavier split when struck by H
export const DECAY_THRESHOLD = 83;          // Z≥83: alpha-decays if left unmatched
export const SPONT_FISSION_THRESHOLD = 100; // Z≥100: may split on its own each turn
export const FISSION_MOVE_BONUS = 4;
export const SHUFFLE_COST = 3;
export const CATALYST_COST = 3;
export const CASCADE_MOVE_BONUS = 3;
export const MAX_CASCADES = 20;
// Heaviest total weight that fuses into something; beyond this the compound
// nucleus can't hold together and splits instead (quasi-fission)
export const MAX_FUSION_WEIGHT = ELEMENTS[ELEMENTS.length - 1].weight + 3;

export const cloneGrid = (grid) => grid.map(r => [...r]);
const emptyNumberGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
const inBounds = (r, c) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;

// ── Matching ────────────────────────────────────────────────────────────────

// Forged elements are heavier than anything the deposit pool drops in. They
// can't get more copies from new tiles, so they fuse in pairs instead of threes.
export const isForged = (z, range) => z > range.max;
export const matchLength = (z, range) => (isForged(z, range) ? 2 : 3);

export const findMatches = (grid) => {
  const range = getDepositionRange(grid);
  const matches = [];
  const scan = (at) => {
    let k = 0;
    while (k < GRID_SIZE) {
      const value = at(k);
      let end = k + 1;
      while (value && end < GRID_SIZE && at(end) === value) end++;
      if (value && end - k >= matchLength(value, range)) {
        matches.push(Array.from({ length: end - k }, (_, n) => k + n));
      }
      k = end;
    }
  };
  for (let i = 0; i < GRID_SIZE; i++) {
    const before = matches.length;
    scan(j => grid[i][j]);
    for (let m = before; m < matches.length; m++) matches[m] = matches[m].map(j => [i, j]);
  }
  for (let j = 0; j < GRID_SIZE; j++) {
    const before = matches.length;
    scan(i => grid[i][j]);
    for (let m = before; m < matches.length; m++) matches[m] = matches[m].map(i => [i, j]);
  }
  return matches;
};

export const swapCells = (grid, [r1, c1], [r2, c2]) => {
  const g = cloneGrid(grid);
  [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
  return g;
};

const ALL_SWAPS = [];
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    if (j < GRID_SIZE - 1) ALL_SWAPS.push([[i, j], [i, j + 1]]);
    if (i < GRID_SIZE - 1) ALL_SWAPS.push([[i, j], [i + 1, j]]);
  }
}
export const allSwaps = () => ALL_SWAPS;

// Same answer as findMatches(grid).length > 0, without allocating. Hot path:
// shuffles call it thousands of times, and the leaderboard Worker replays them.
export const hasAnyMatch = (grid, range = getDepositionRange(grid)) => {
  for (let i = 0; i < GRID_SIZE; i++) {
    let runR = 1;
    let runC = 1;
    for (let k = 1; k <= GRID_SIZE; k++) {
      const r = k < GRID_SIZE ? grid[i][k] : null;
      const prevR = grid[i][k - 1];
      if (r && r === prevR) runR++;
      else { if (prevR && runR >= matchLength(prevR, range)) return true; runR = 1; }
      const c = k < GRID_SIZE ? grid[k][i] : null;
      const prevC = grid[k - 1][i];
      if (c && c === prevC) runC++;
      else { if (prevC && runC >= matchLength(prevC, range)) return true; runC = 1; }
    }
  }
  return false;
};

// A move worth making: a swap (or neutron capture) that lines up a match, or a fission
export const hasValidMoves = (grid) => {
  const g = cloneGrid(grid);
  const range = getDepositionRange(g); // a plain swap never changes it
  return ALL_SWAPS.some(([a, b]) => {
    const action = classifySwap(g, a, b);
    if (action.type === 'fission') return true;
    if (action.type === 'capture') return hasAnyMatch(previewSwap(g, a, b).grid);
    [g[a[0]][a[1]], g[b[0]][b[1]]] = [g[b[0]][b[1]], g[a[0]][a[1]]];
    const found = hasAnyMatch(g, range);
    [g[a[0]][a[1]], g[b[0]][b[1]]] = [g[b[0]][b[1]], g[a[0]][a[1]]];
    return found;
  });
};

// ── Fusion math ──────────────────────────────────────────────────────────────

// Element with the closest atomic weight (ties go to the higher atomic number)
export const findElementByWeight = (targetWeight, belowZ = Infinity) => {
  let closest = ELEMENTS[0];
  let minDiff = Math.abs(ELEMENTS[0].weight - targetWeight);
  for (let i = 1; i < ELEMENTS.length; i++) {
    if (ELEMENTS[i].number >= belowZ) continue;
    const diff = Math.abs(ELEMENTS[i].weight - targetWeight);
    if (diff < minDiff || (diff === minDiff && ELEMENTS[i].number > closest.number)) {
      minDiff = diff;
      closest = ELEMENTS[i];
    }
  }
  return closest.number;
};

// Random asymmetric 38–62% split of a nucleus, mimicking real fission mass
// distributions. Daughters are always lighter than `belowZ`.
const splitWeight = (weight, belowZ, rng) => {
  const w1 = Math.round(weight * (0.38 + rng() * 0.24));
  return [findElementByWeight(w1, belowZ), findElementByWeight(weight - w1, belowZ)];
};

// Fusing `count` tiles of z: the element nearest their combined weight, or —
// past Oganesson — a quasi-fission split into two daughters.
export const fuse = (z, count, rng = Math.random) => {
  const total = ELEMENTS[z - 1].weight * count;
  if (total <= MAX_FUSION_WEIGHT) return { to: findElementByWeight(total) };
  return { split: splitWeight(total, ELEMENTS.length, rng) };
};

// Two daughter nuclei from a heavy element struck by a neutron
export const calculateFissionProducts = (heavyZ, rng = Math.random) => {
  const [daughter1, daughter2] = splitWeight(ELEMENTS[heavyZ - 1].weight, heavyZ, rng);
  return { daughter1, daughter2 };
};

// ── Deposition (new tiles) ────────────────────────────────────────────────────

export const maxElementOn = (grid) => {
  let max = 1;
  for (const row of grid) for (const v of row) if (v && v > max) max = v;
  return max;
};

// The pool of 5 consecutive elements that new tiles are drawn from shifts up
// by one for every 8 atomic numbers of the heaviest element on the board.
export const getDepositionRange = (grid) => {
  const min = Math.max(1, Math.floor(maxElementOn(grid) / 8));
  return { min, max: Math.min(min + 4, ELEMENTS.length) };
};

// Once the pool has climbed past H, keep a trickle of neutrons coming (more
// when there's something to fission) so capture and fission stay available.
export const pickDepositElement = (range, grid, rng = Math.random) => {
  if (range.min > 1) {
    const flat = grid.flat();
    const hCount = flat.filter(v => v === 1).length;
    if (hCount < 2) {
      const hasFissionTargets = flat.some(v => v && v >= FISSION_THRESHOLD);
      if (rng() < (hasFissionTargets ? 0.15 : 0.06)) return 1;
    }
  }
  return Math.floor(rng() * (range.max - range.min + 1)) + range.min;
};

// Gravity. Mutates grid; returns how many rows each tile now at [i][j] fell.
const applyGravity = (grid, fall) => {
  for (let j = 0; j < GRID_SIZE; j++) {
    let writePos = GRID_SIZE - 1;
    for (let i = GRID_SIZE - 1; i >= 0; i--) {
      if (grid[i][j] !== null) {
        if (i !== writePos) {
          grid[writePos][j] = grid[i][j];
          grid[i][j] = null;
          fall[writePos][j] = (fall[i][j] || 0) + (writePos - i);
          fall[i][j] = 0;
        }
        writePos--;
      }
    }
  }
};

// Fill empty cells (top of each column after gravity). New tiles fall in from
// above the board, so their fall distance is the number of empties in the column.
const fillEmpty = (grid, fall, pick) => {
  for (let j = 0; j < GRID_SIZE; j++) {
    let empties = 0;
    for (let i = 0; i < GRID_SIZE; i++) if (grid[i][j] === null) empties++;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (grid[i][j] === null) {
        grid[i][j] = pick(grid);
        fall[i][j] = empties;
      }
    }
  }
};

// Remove elements that have fallen below the deposition minimum, but only if
// fewer than 3 remain (3+ can still form a match). H is the neutron — never retired.
const cleanupObsoleteElements = (grid) => {
  const { min } = getDepositionRange(grid);
  const removed = [];
  const cells = [];
  if (min <= 1) return { removed, cells };
  for (let z = 2; z < min; z++) {
    const at = [];
    for (let i = 0; i < GRID_SIZE; i++) for (let j = 0; j < GRID_SIZE; j++) if (grid[i][j] === z) at.push([i, j]);
    if (at.length > 0 && at.length < 3) {
      at.forEach(([i, j]) => { grid[i][j] = null; });
      cells.push(...at);
      removed.push(z);
    }
  }
  return { removed, cells };
};

// ── Cascades ─────────────────────────────────────────────────────────────────

// Resolve every match on the board, including chain reactions.
// Returns per-step snapshots so the UI can animate each phase.
export const resolveCascade = (startGrid, targetPos = null, rng = Math.random) => {
  const grid = cloneGrid(startGrid);
  const steps = [];
  let totalScore = 0;
  let totalBonus = 0;
  const removedElements = [];
  let matchesFound = findMatches(grid);
  let combo = 0;

  while (matchesFound.length > 0 && combo < MAX_CASCADES) {
    combo++;
    const fusions = [];
    let stepScore = 0;
    let stepBonus = 0;

    for (const match of matchesFound) {
      const z = grid[match[0][0]][match[0][1]];
      // Overlapping cross/T-shaped matches: skip a group whose tiles were already consumed
      if (!z || !match.every(([r, c]) => grid[r][c] === z)) continue;
      const result = fuse(z, match.length, rng);

      stepBonus += 1;                          // every match refunds its move
      if (match.length >= 4) stepBonus += 1;   // 4-match = +2
      if (match.length >= 5) stepBonus += 2;   // 5-match = +4
      if (match.length >= 6) stepBonus += 2;   // 6+ match = +6

      match.forEach(([r, c]) => { grid[r][c] = null; });
      const target = combo === 1 && targetPos && match.some(([r, c]) => r === targetPos.row && c === targetPos.col)
        ? [targetPos.row, targetPos.col]
        : match[match.length - 1];

      const points = z * match.length * 10;
      stepScore += points;
      if (result.split) {
        // Too heavy to hold together: one daughter at the target, one beside it
        const [d1, d2] = result.split;
        const cell = match
          .filter(([r, c]) => r !== target[0] || c !== target[1])
          .sort((a, b) => (Math.abs(a[0] - target[0]) + Math.abs(a[1] - target[1])) - (Math.abs(b[0] - target[0]) + Math.abs(b[1] - target[1])))[0];
        grid[target[0]][target[1]] = d1;
        grid[cell[0]][cell[1]] = d2;
        fusions.push({ cells: match, from: z, to: d1, split: { d1, d2, cell }, target, points });
      } else {
        grid[target[0]][target[1]] = result.to;
        fusions.push({ cells: match, from: z, to: result.to, target, points });
      }
    }

    if (combo >= 2) stepBonus += CASCADE_MOVE_BONUS;

    const mergedGrid = cloneGrid(grid);
    const fall = emptyNumberGrid();
    applyGravity(grid, fall);
    fillEmpty(grid, fall, g => pickDepositElement(getDepositionRange(g), g, rng));
    const settledGrid = cloneGrid(grid);

    const { removed, cells: retiredCells } = cleanupObsoleteElements(grid);
    const retireFall = emptyNumberGrid();
    if (retiredCells.length > 0) {
      applyGravity(grid, retireFall);
      fillEmpty(grid, retireFall, g => {
        const range = getDepositionRange(g);
        return Math.floor(rng() * (range.max - range.min + 1)) + range.min;
      });
    }
    removedElements.push(...removed);

    steps.push({
      combo, fusions, mergedGrid, settledGrid, fall,
      retired: removed, retiredCells, finalGrid: cloneGrid(grid), retireFall,
      score: stepScore, bonusMoves: stepBonus,
    });
    totalScore += stepScore;
    totalBonus += stepBonus;
    matchesFound = findMatches(grid);
  }

  return { steps, grid, score: totalScore, bonusMoves: totalBonus, removedElements, combo };
};

// ── Neutrons: fission & capture ──────────────────────────────────────────────

// What swapping a↔b does. Firing H (a neutron) into a nucleus of Bi or heavier
// splits it (fission); into a lighter forged tile it's captured and beta-decays
// into the next element up (Z+1). Anything else is an ordinary swap.
export const classifySwap = (grid, a, b) => {
  const za = grid[a[0]][a[1]];
  const zb = grid[b[0]][b[1]];
  if (za && zb) {
    for (const [n, t, zn, zt] of [[a, b, za, zb], [b, a, zb, za]]) {
      if (zn !== 1 || zt === 1) continue;
      if (zt >= FISSION_THRESHOLD) return { type: 'fission', neutron: n, heavy: t };
      if (isForged(zt, getDepositionRange(grid))) return { type: 'capture', neutron: n, target: t };
    }
  }
  return { type: 'swap' };
};

// The board right after a move, before gravity and cascades (for hints/validity)
export const previewSwap = (grid, a, b) => {
  const action = classifySwap(grid, a, b);
  if (action.type === 'capture') {
    const g = cloneGrid(grid);
    g[action.target[0]][action.target[1]] += 1;
    g[action.neutron[0]][action.neutron[1]] = null;
    return { ...action, grid: g };
  }
  return { ...action, grid: action.type === 'swap' ? swapCells(grid, a, b) : grid };
};

// Gravity + refill after tiles leave the board mid-move
export const settleGrid = (startGrid, rng = Math.random) => {
  const grid = cloneGrid(startGrid);
  const fall = emptyNumberGrid();
  applyGravity(grid, fall);
  fillEmpty(grid, fall, g => pickDepositElement(getDepositionRange(g), g, rng));
  return { grid, fall };
};

export const resolveCapture = (grid, neutron, target, rng = Math.random) => {
  const from = grid[target[0]][target[1]];
  const to = from + 1;
  const capturedGrid = cloneGrid(grid);
  capturedGrid[target[0]][target[1]] = to;
  capturedGrid[neutron[0]][neutron[1]] = null;
  const { grid: settled, fall } = settleGrid(capturedGrid, rng);
  // The new nucleus drops one row if the neutron was directly beneath it
  const landed = neutron[1] === target[1] && neutron[0] > target[0] ? [target[0] + 1, target[1]] : target;
  return { capturedGrid, grid: settled, fall, from, to, landed, score: to * 10 };
};

export const resolveFission = (grid, neutron, heavy, rng = Math.random) => {
  const heavyZ = grid[heavy[0]][heavy[1]];
  const { daughter1, daughter2 } = calculateFissionProducts(heavyZ, rng);
  const g = cloneGrid(grid);
  g[heavy[0]][heavy[1]] = daughter1;
  g[neutron[0]][neutron[1]] = daughter2;
  return { grid: g, heavyZ, daughter1, daughter2, score: heavyZ * 50 };
};

// ── Radioactivity ─────────────────────────────────────────────────────────────

export const createZeroAges = () => emptyNumberGrid();

// Player actions a heavy tile survives before alpha-decaying
export const getDecayMoveLimit = (z) => {
  if (z >= 110) return 4;
  if (z >= 100) return 6;
  if (z >= 90) return 9;
  return 12; // Z 83–89
};

// Chance per player action of spontaneous fission (0–12%)
export const getSpontFissionChance = (z) =>
  z < SPONT_FISSION_THRESHOLD ? 0 : Math.min(0.12, (z - 99) * 0.005 + 0.025);

// Positions where the element is unchanged age by `step`; everything else resets.
// step = 0 carries ages across a mid-turn change (e.g. a chain set off by decay).
export const computeNewAges = (oldGrid, oldAges, newGrid, step = 1) =>
  newGrid.map((row, i) => row.map((cell, j) => {
    if (!cell) return 0;
    return oldGrid[i]?.[j] === cell ? (oldAges[i]?.[j] || 0) + step : 0;
  }));

// One round of spontaneous fission (at most one per turn) then alpha decay.
export const resolvePassive = (startGrid, startAges, rng = Math.random) => {
  const grid = cloneGrid(startGrid);
  const ages = cloneGrid(startAges);
  let spont = null;

  outer: for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const z = grid[i][j];
      // A superheavy gets at least one turn on the board before it can split
      if (!z || z < SPONT_FISSION_THRESHOLD || ages[i][j] < 1) continue;
      if (rng() >= getSpontFissionChance(z)) continue;
      const { daughter1, daughter2 } = calculateFissionProducts(z, rng);
      grid[i][j] = daughter1;
      ages[i][j] = 0;
      const neighbors = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].filter(([r, c]) => inBounds(r, c));
      const empty = neighbors.filter(([r, c]) => !grid[r][c]);
      const pool = empty.length > 0 ? empty : neighbors;
      const [tr, tc] = pool[Math.floor(rng() * pool.length)];
      grid[tr][tc] = daughter2;
      ages[tr][tc] = 0;
      spont = { cell: [i, j], other: [tr, tc], heavyZ: z, daughter1, daughter2 };
      break outer;
    }
  }
  const spontGrid = cloneGrid(grid);

  const decays = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const z = grid[i][j];
      if (!z || z < DECAY_THRESHOLD) continue;
      if (ages[i][j] >= getDecayMoveLimit(z)) {
        const to = Math.max(1, z - 2); // alpha decay: −2 protons
        decays.push({ cell: [i, j], from: z, to });
        grid[i][j] = to;
        ages[i][j] = 0;
      }
    }
  }

  return { spont, spontGrid, decays, grid, ages };
};

// ── Board setup & tools ───────────────────────────────────────────────────────

const createRandomGrid = (rng) => {
  const grid = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    const row = [];
    for (let j = 0; j < GRID_SIZE; j++) {
      // Avoid 3-in-a-row while building to cut down on rejection retries
      const forbidden = new Set();
      if (j >= 2 && row[j - 1] === row[j - 2]) forbidden.add(row[j - 1]);
      if (i >= 2 && grid[i - 1][j] === grid[i - 2][j]) forbidden.add(grid[i - 1][j]);
      let value;
      let tries = 0;
      do { value = Math.floor(rng() * 4) + 1; tries++; } while (forbidden.has(value) && tries < 20);
      row.push(value);
    }
    grid.push(row);
  }
  return grid;
};

export const createStartGrid = (rng = Math.random) => {
  let grid = createRandomGrid(rng);
  for (let attempts = 0; attempts < 200 && (hasAnyMatch(grid) || !hasValidMoves(grid)); attempts++) {
    grid = createRandomGrid(rng);
  }
  return grid;
};

// Shuffle tiles (ages travel with their tiles). Prefers an arrangement with no
// ready-made matches and at least one valid move, like a fresh board.
export const shuffleBoard = (grid, ages, rng = Math.random) => {
  const pairs = [];
  for (let i = 0; i < GRID_SIZE; i++) for (let j = 0; j < GRID_SIZE; j++) pairs.push([grid[i][j], ages[i]?.[j] || 0, i, j]);
  let best = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const p = [...pairs];
    for (let k = p.length - 1; k > 0; k--) {
      const r = Math.floor(rng() * (k + 1));
      [p[k], p[r]] = [p[r], p[k]];
    }
    const g = Array.from({ length: GRID_SIZE }, (_, i) => p.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(x => x[0]));
    const a = Array.from({ length: GRID_SIZE }, (_, i) => p.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(x => x[1]));
    // origin[i][j] = where the tile now at [i][j] came from (for animation)
    const origin = Array.from({ length: GRID_SIZE }, (_, i) => p.slice(i * GRID_SIZE, (i + 1) * GRID_SIZE).map(x => [x[2], x[3]]));
    best = { grid: g, ages: a, origin };
    if (!hasAnyMatch(g) && hasValidMoves(g)) break;
  }
  return best;
};

// The 4 orthogonal neighbours a catalyst converts
export const getCatalystArea = (r, c) =>
  [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([i, j]) => inBounds(i, j));

export const applyCatalyst = (grid, r, c) => {
  const g = cloneGrid(grid);
  getCatalystArea(r, c).forEach(([i, j]) => { g[i][j] = grid[r][c]; });
  return g;
};

// ── Hints ─────────────────────────────────────────────────────────────────────

// 1) a move that matches now (or a fission), 2) the first swap of the best
// 2-swap path, 3) the closest pair of the most common element as a "work here" nudge.
export const findHintMove = (grid) => {
  const swaps = allSwaps();
  let fission = null;
  for (const [a, b] of swaps) {
    const preview = previewSwap(grid, a, b);
    if (findMatches(preview.grid).length > 0) return { cells: [a, b], type: 'direct' };
    if (preview.type === 'fission') fission ||= { cells: [a, b], type: 'direct' };
  }
  if (fission) return fission;

  const plain = (g, [a, b]) => classifySwap(g, a, b).type === 'swap';
  let bestFirstSwap = null;
  let bestMatchSize = 0;
  for (const [a, b] of swaps) {
    if (!plain(grid, [a, b])) continue;
    const g1 = swapCells(grid, a, b);
    for (const [c, d] of swaps) {
      if (a[0] === c[0] && a[1] === c[1] && b[0] === d[0] && b[1] === d[1]) continue;
      if (!plain(g1, [c, d])) continue;
      const matches = findMatches(swapCells(g1, c, d));
      if (matches.length > 0) {
        const size = matches.reduce((sum, m) => sum + m.length, 0);
        if (size > bestMatchSize) { bestMatchSize = size; bestFirstSwap = [a, b]; }
      }
    }
  }
  if (bestFirstSwap) return { cells: bestFirstSwap, type: 'path' };

  const positions = {};
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const v = grid[i][j];
      if (v) (positions[v] ||= []).push([i, j]);
    }
  }
  let bestPair = null;
  let bestScore = -1;
  for (const list of Object.values(positions)) {
    if (list.length < 2) continue;
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const dist = Math.abs(list[a][0] - list[b][0]) + Math.abs(list[a][1] - list[b][1]);
        const s = list.length * 10 - dist;
        if (s > bestScore) { bestScore = s; bestPair = [list[a], list[b]]; }
      }
    }
  }
  return bestPair ? { cells: bestPair, type: 'path' } : null;
};

// ── Turns ─────────────────────────────────────────────────────────────────────

const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const validCell = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && inBounds(p[0], p[1]);

// Whether the player could make this move right now (the UI enforces the same rules)
export const isLegalAction = (state, action) => {
  if (!action || state.moves <= 0) return false;
  if (action.type === 'swap') return validCell(action.from) && validCell(action.to) && adjacent(action.from, action.to);
  if (action.type === 'catalyst') return validCell(action.cell) && state.moves >= CATALYST_COST;
  if (action.type === 'shuffle') return state.moves >= SHUFFLE_COST;
  return false;
};

// One whole player turn: action → cascades → radioactivity. Returns every
// intermediate result (the UI animates them) plus the committed state. `rng`
// is consumed in a fixed order, so a seed plus the action list replays a game
// exactly — that's how the daily leaderboard verifies scores.
export const playAction = (state, action, rng = Math.random) => {
  const { grid: startGrid, ages: startAges, moves, score } = state;
  const t = { action, grid: startGrid, ages: startAges, moves, score, gained: 0, bonus: 0, maxZ: maxElementOn(startGrid) };
  const seen = (g) => { t.maxZ = Math.max(t.maxZ, maxElementOn(g)); };

  if (action.type === 'shuffle') {
    const sh = shuffleBoard(startGrid, startAges, rng);
    return { ...t, shuffle: sh, grid: sh.grid, ages: sh.ages, moves: moves - SHUFFLE_COST, over: moves - SHUFFLE_COST <= 0 };
  }

  let g = startGrid;
  let mv = moves;
  let targetPos = null;
  if (action.type === 'swap') {
    const kind = classifySwap(g, action.from, action.to);
    if (kind.type === 'capture') {
      t.capture = { ...kind, ...resolveCapture(g, kind.neutron, kind.target, rng) };
      seen(t.capture.capturedGrid);
      g = t.capture.grid;
      t.gained += t.capture.score;
      mv -= 1;
      targetPos = { row: t.capture.landed[0], col: t.capture.landed[1] };
    } else if (kind.type === 'fission') {
      t.fission = { ...kind, ...resolveFission(g, kind.neutron, kind.heavy, rng) };
      g = t.fission.grid;
      t.gained += t.fission.score;
      mv += -1 + FISSION_MOVE_BONUS;
    } else {
      g = swapCells(g, action.from, action.to);
      t.swapped = g;
      mv -= 1;
      targetPos = { row: action.to[0], col: action.to[1] };
    }
  } else if (action.type === 'catalyst') {
    const [r, c] = action.cell;
    g = applyCatalyst(g, r, c);
    t.catalyst = { grid: g, from: startGrid[r][c], area: getCatalystArea(r, c) };
    mv -= CATALYST_COST;
    targetPos = { row: r, col: c };
  }
  t.movesAfterAction = mv;

  t.cascade = resolveCascade(g, targetPos, rng);
  t.cascade.steps.forEach(s => seen(s.mergedGrid));
  g = t.cascade.grid;
  seen(g);
  t.gained += t.cascade.score;
  t.bonus += t.cascade.bonusMoves;

  let a = computeNewAges(startGrid, startAges, g);
  if (mv + t.bonus > 0) {
    t.passive = resolvePassive(g, a, rng);
    g = t.passive.grid;
    a = t.passive.ages;
    if (t.passive.spont || t.passive.decays.length > 0) {
      // Decay or fission products can line up a fresh chain reaction
      t.after = resolveCascade(t.passive.grid, null, rng);
      if (t.after.steps.length > 0) {
        t.after.steps.forEach(s => seen(s.mergedGrid));
        g = t.after.grid;
        a = computeNewAges(t.passive.grid, t.passive.ages, g, 0);
        t.gained += t.after.score;
        t.bonus += t.after.bonusMoves;
      }
    }
  }
  seen(g);

  const finalMoves = mv + t.bonus;
  return { ...t, grid: g, ages: a, moves: finalMoves, score: score + t.gained, over: finalMoves <= 0 };
};
