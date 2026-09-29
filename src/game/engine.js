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

export const cloneGrid = (grid) => grid.map(r => [...r]);
const emptyNumberGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
const inBounds = (r, c) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;

// ── Matching ────────────────────────────────────────────────────────────────

export const findMatches = (grid) => {
  const matches = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE - 2; j++) {
      const value = grid[i][j];
      if (value && grid[i][j + 1] === value && grid[i][j + 2] === value) {
        const match = [[i, j], [i, j + 1], [i, j + 2]];
        let k = j + 3;
        while (k < GRID_SIZE && grid[i][k] === value) { match.push([i, k]); k++; }
        matches.push(match);
        j = k - 1;
      }
    }
  }
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let i = 0; i < GRID_SIZE - 2; i++) {
      const value = grid[i][j];
      if (value && grid[i + 1][j] === value && grid[i + 2][j] === value) {
        const match = [[i, j], [i + 1, j], [i + 2, j]];
        let k = i + 3;
        while (k < GRID_SIZE && grid[k][j] === value) { match.push([k, j]); k++; }
        matches.push(match);
        i = k - 1;
      }
    }
  }
  return matches;
};

export const swapCells = (grid, [r1, c1], [r2, c2]) => {
  const g = cloneGrid(grid);
  [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
  return g;
};

export const allSwaps = () => {
  const swaps = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (j < GRID_SIZE - 1) swaps.push([[i, j], [i, j + 1]]);
      if (i < GRID_SIZE - 1) swaps.push([[i, j], [i + 1, j]]);
    }
  }
  return swaps;
};

export const hasValidMoves = (grid) =>
  allSwaps().some(([a, b]) => findMatches(swapCells(grid, a, b)).length > 0);

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

export const fusionResult = (z, count) => findElementByWeight(ELEMENTS[z - 1].weight * count);

// Two daughter nuclei from a heavy element: random asymmetric 38–62% split,
// mimicking real fission mass distributions.
export const calculateFissionProducts = (heavyZ, rng = Math.random) => {
  const heavyWeight = ELEMENTS[heavyZ - 1].weight;
  const ratio = 0.38 + rng() * 0.24;
  const w1 = Math.round(heavyWeight * ratio);
  return {
    daughter1: findElementByWeight(w1, heavyZ),
    daughter2: findElementByWeight(heavyWeight - w1, heavyZ),
  };
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

// When fission targets are on the board and H is scarce, occasionally deposit
// H so the player always has a neutron available.
export const pickDepositElement = (range, grid, rng = Math.random) => {
  const flat = grid.flat();
  const hasFissionTargets = flat.some(v => v && v >= FISSION_THRESHOLD);
  const hCount = flat.filter(v => v === 1).length;
  if (hasFissionTargets && hCount < 2 && rng() < 0.15) return 1;
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
      const result = fusionResult(z, match.length);

      stepBonus += 1;                          // every match refunds its move
      if (match.length >= 4) stepBonus += 1;   // 4-match = +2
      if (match.length >= 5) stepBonus += 2;   // 5-match = +4
      if (match.length >= 6) stepBonus += 2;   // 6+ match = +6

      match.forEach(([r, c]) => { grid[r][c] = null; });
      const target = combo === 1 && targetPos && match.some(([r, c]) => r === targetPos.row && c === targetPos.col)
        ? [targetPos.row, targetPos.col]
        : match[match.length - 1];
      grid[target[0]][target[1]] = result;

      const points = z * match.length * 10;
      stepScore += points;
      fusions.push({ cells: match, from: z, to: result, target, points });
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

// ── Fission ──────────────────────────────────────────────────────────────────

// Returns fission trigger info if swapping a↔b would fire a neutron into a heavy nucleus
export const checkFissionTrigger = (grid, [r1, c1], [r2, c2]) => {
  const a = grid[r1][c1];
  const b = grid[r2][c2];
  if (!a || !b) return null;
  if (a === 1 && b >= FISSION_THRESHOLD) return { neutron: [r1, c1], heavy: [r2, c2] };
  if (b === 1 && a >= FISSION_THRESHOLD) return { neutron: [r2, c2], heavy: [r1, c1] };
  return null;
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
      if (!z || z < SPONT_FISSION_THRESHOLD) continue;
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
  for (let attempts = 0; attempts < 200 && (findMatches(grid).length > 0 || !hasValidMoves(grid)); attempts++) {
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
    if (findMatches(g).length === 0 && hasValidMoves(g)) break;
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

// 1) a swap that matches now, 2) the first swap of the best 2-swap path,
// 3) the closest pair of the most common element as a "work here" nudge.
export const findHintMove = (grid) => {
  const swaps = allSwaps();
  for (const [a, b] of swaps) {
    if (findMatches(swapCells(grid, a, b)).length > 0) return { cells: [a, b], type: 'direct' };
  }

  let bestFirstSwap = null;
  let bestMatchSize = 0;
  for (const [a, b] of swaps) {
    const g1 = swapCells(grid, a, b);
    for (const [c, d] of swaps) {
      if (a[0] === c[0] && a[1] === c[1] && b[0] === d[0] && b[1] === d[1]) continue;
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
