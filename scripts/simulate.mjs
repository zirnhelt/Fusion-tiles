// Headless balance simulator: plays Fusion Tiles with a bot using the real
// engine rules and prints aggregate stats.
//
//   npm run sim                      # 200 games, greedy bot
//   npm run sim -- --games 500 --bot random --max-turns 3000
//
// Bots: greedy (fission, then biggest match, then neutron capture) · random (any matching move)
// When nothing matches, the bot leans on the Hint tool for its next swap and pays for it.

import {
  START_MOVES, SHUFFLE_COST, HINT_COST, FISSION_MOVE_BONUS, ELEMENT_SETS, completedSets,
  createStartGrid, findMatches, allSwaps, previewSwap, swapCells,
  resolveCascade, resolveFission, resolveCapture, resolvePassive, computeNewAges, createZeroAges,
  findHintMove, shuffleBoard, maxElementOn,
} from '../src/game/engine.js';
import { ELEMENTS } from '../src/game/elements.js';

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => s.trim().split(/\s+/)).map(([k, v]) => [k, v ?? true])
);
const GAMES = +(args.games ?? 200);
const MAX_TURNS = +(args['max-turns'] ?? 1500);
const BOT = args.bot ?? 'greedy';
const SEED = +(args.seed ?? 1);
const CAREER = +(args.career ?? 50); // runs per simulated career, for collection stats

const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const MILESTONES = [10, 26, 50, 83, 92, 100, 118];

function chooseMove(grid, rng) {
  const fissions = [];
  const captures = [];
  const matching = [];
  for (const [a, b] of allSwaps()) {
    const p = previewSwap(grid, a, b);
    if (p.type === 'fission') { fissions.push({ ...p, a, b }); continue; }
    if (p.type === 'capture') captures.push({ ...p, a, b });
    const m = findMatches(p.grid);
    if (m.length) {
      const size = m.reduce((s, x) => s + x.length, 0);
      const z = Math.max(...m.map(x => p.grid[x[0][0]][x[0][1]]));
      matching.push({ ...p, a, b, size, z });
    }
  }
  if (fissions.length && BOT === 'greedy') {
    fissions.sort((x, y) => grid[y.heavy[0]][y.heavy[1]] - grid[x.heavy[0]][x.heavy[1]]);
    return fissions[0];
  }
  if (matching.length) {
    if (BOT === 'random') return matching[Math.floor(rng() * matching.length)];
    matching.sort((x, y) => y.size - x.size || y.z - x.z);
    return matching[0];
  }
  if (fissions.length) return fissions[0];
  // Nothing matches: nudge a forged tile up the table with a neutron
  if (captures.length) return { ...captures[Math.floor(rng() * captures.length)], dead: true };
  const hint = findHintMove(grid);
  if (hint?.type === 'path' && hint.cells.length === 2 &&
      Math.abs(hint.cells[0][0] - hint.cells[1][0]) + Math.abs(hint.cells[0][1] - hint.cells[1][1]) === 1) {
    return { type: 'swap', a: hint.cells[0], b: hint.cells[1], dead: true, hinted: true };
  }
  return { type: 'shuffle', dead: true };
}

function playGame(seed) {
  const rng = mulberry32(seed);
  let grid = createStartGrid(rng);
  let ages = createZeroAges();
  let moves = START_MOVES;
  let score = 0;
  let maxZ = maxElementOn(grid);
  const seen = new Set(grid.flat());
  const firstReach = {};
  const s = { turns: 0, deadTurns: 0, shuffles: 0, hints: 0, fissions: 0, captures: 0, quasi: 0, spont: 0, decays: 0, cascades: 0, maxCombo: 0, fusions: 0, multi: 0, setMoves: 0 };
  const sets = new Set();
  const movesAt = {};
  const deadByPhase = [0, 0, 0, 0];
  const turnsByPhase = [0, 0, 0, 0];
  const distinctAt = {};

  const countFusions = (cascade) => {
    for (const st of cascade.steps) {
      s.fusions += st.fusions.length;
      s.quasi += st.fusions.filter(f => f.split).length;
      for (const f of st.fusions) { seen.add(f.to); if (f.split) seen.add(f.split.d2); }
      if (st.fusions.length > 1) s.multi++;
    }
  };

  const settle = (before, beforeAges, after) => {
    const cascade = resolveCascade(after, null, rng);
    let g = cascade.grid;
    let bonus = cascade.bonusMoves;
    score += cascade.score;
    countFusions(cascade);
    s.maxCombo = Math.max(s.maxCombo, cascade.combo);
    if (cascade.combo >= 2) s.cascades++;
    const passive = resolvePassive(g, computeNewAges(before, beforeAges, g), rng);
    if (passive.spont) s.spont++;
    s.decays += passive.decays.length;
    g = passive.grid;
    ages = passive.ages;
    // Passive changes can line up new matches
    const after2 = resolveCascade(g, null, rng);
    if (after2.steps.length) {
      countFusions(after2);
      g = after2.grid; score += after2.score; bonus += after2.bonusMoves;
      ages = computeNewAges(passive.grid, ages, g, 0);
    }
    return { g, bonus };
  };

  while (moves > 0 && s.turns < MAX_TURNS) {
    s.turns++;
    const move = chooseMove(grid, rng);
    const phase = Math.min(3, Math.floor((s.turns - 1) / 25));
    turnsByPhase[phase]++;
    if (move.dead) { deadByPhase[phase]++; s.deadTurns++; }
    if (move.hinted) {
      if (moves <= HINT_COST) { moves = 0; break; }
      s.hints++;
      moves -= HINT_COST;
    }
    if (move.type === 'shuffle') {
      if (moves <= SHUFFLE_COST) { moves = 0; break; }
      s.shuffles++;
      const sh = shuffleBoard(grid, ages, rng);
      grid = sh.grid; ages = sh.ages; moves -= SHUFFLE_COST;
    } else if (move.type === 'fission') {
      s.fissions++;
      const f = resolveFission(grid, move.neutron, move.heavy, rng);
      score += f.score;
      const { g, bonus } = settle(grid, ages, f.grid);
      grid = g; moves += -1 + FISSION_MOVE_BONUS + bonus;
    } else if (move.type === 'capture') {
      s.captures++;
      const c = resolveCapture(grid, move.neutron, move.target, rng);
      score += c.score;
      seen.add(c.to);
      const { g, bonus } = settle(grid, ages, c.grid);
      grid = g; moves += -1 + bonus;
    } else {
      const swapped = swapCells(grid, move.a, move.b);
      const { g, bonus } = settle(grid, ages, swapped);
      grid = g; moves += -1 + bonus;
    }
    for (const v of grid.flat()) seen.add(v);
    for (const set of completedSets(seen, sets)) {
      sets.add(set.key);
      moves += set.moves; score += set.points; s.setMoves += set.moves;
    }
    maxZ = Math.max(maxZ, maxElementOn(grid));
    for (const m of MILESTONES) if (maxZ >= m && !(m in firstReach)) firstReach[m] = s.turns;
    if ([25, 50, 100, 200, 400].includes(s.turns)) movesAt[s.turns] = moves;
    if ([1, 25, 50, 75].includes(s.turns)) distinctAt[s.turns] = new Set(grid.flat()).size;
  }
  return { ...s, deadByPhase, turnsByPhase, distinctAt, score, moves, maxZ, seen: seen.size, seenSet: seen, sets, firstReach, movesAt, capped: moves > 0 };
}

const pct = (arr, p) => {
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};
const summary = (label, arr) =>
  `${label.padEnd(26)} p10 ${String(pct(arr, 10)).padStart(6)}  median ${String(pct(arr, 50)).padStart(6)}  p90 ${String(pct(arr, 90)).padStart(6)}`;

const results = [];
for (let g = 0; g < GAMES; g++) results.push(playGame(SEED * 100003 + g));

const sym = (z) => `${ELEMENTS[z - 1].symbol}(${z})`;
console.log(`\nFusion Tiles sim — ${GAMES} games, bot=${BOT}, cap=${MAX_TURNS} turns\n`);
console.log(`Runs that never ran out of moves (hit the cap): ${results.filter(r => r.capped).length}/${GAMES}`);
console.log(summary('Turns played', results.map(r => r.turns)));
console.log(summary('Final score', results.map(r => r.score)));
console.log(summary('Heaviest element (Z)', results.map(r => r.maxZ)));
console.log(summary('Distinct elements seen', results.map(r => r.seen)));
console.log(summary('Turns w/ no match available', results.map(r => r.deadTurns)));
console.log(summary('Hints bought', results.map(r => r.hints)));
console.log(summary('Shuffles', results.map(r => r.shuffles)));
console.log(summary('Fissions (player)', results.map(r => r.fissions)));
console.log(summary('Neutron captures', results.map(r => r.captures)));
console.log(summary('Quasi-fissions', results.map(r => r.quasi)));
console.log(summary('Spontaneous fissions', results.map(r => r.spont)));
console.log(summary('Alpha decays', results.map(r => r.decays)));
console.log(summary('Longest chain', results.map(r => r.maxCombo)));
console.log(summary('Multi-fusion steps', results.map(r => r.multi)));
console.log(summary('Moves from sets', results.map(r => r.setMoves)));
for (const t of [25, 50, 100, 200, 400]) {
  const alive = results.filter(r => t in r.movesAt);
  if (alive.length) console.log(summary(`Moves banked @ turn ${t} (${alive.length})`, alive.map(r => r.movesAt[t])));
}
const phaseNames = ['turns 1-25', 'turns 26-50', 'turns 51-75', 'turns 76+'];
console.log('\nShare of turns with no match on the board:');
phaseNames.forEach((name, i) => {
  const dead = results.reduce((n, r) => n + r.deadByPhase[i], 0);
  const all = results.reduce((n, r) => n + r.turnsByPhase[i], 0);
  if (all) console.log(`  ${name.padEnd(12)} ${Math.round((dead / all) * 100)}%`);
});
for (const t of [1, 25, 50, 75]) {
  const alive = results.filter(r => t in r.distinctAt);
  if (alive.length) console.log(summary(`Distinct elements on board @ ${t}`, alive.map(r => r.distinctAt[t])));
}
console.log('\nMilestones — share of runs reaching, and median turn reached:');
for (const m of MILESTONES) {
  const hit = results.filter(r => m in r.firstReach);
  console.log(`  ${sym(m).padEnd(8)} ${String(Math.round((hit.length / GAMES) * 100)).padStart(3)}%   ${hit.length ? 'turn ' + pct(hit.map(r => r.firstReach[m]), 50) : ''}`);
}
console.log('\nElement sets — share of runs completing each (members seen in one run):');
for (const set of ELEMENT_SETS) {
  const done = results.filter(r => r.sets.has(set.key)).length;
  const counts = results.map(r => set.members.filter(z => r.seenSet.has(z)).length);
  console.log(`  ${set.label.padEnd(23)} ${String(Math.round((done / GAMES) * 100)).padStart(3)}%   median ${pct(counts, 50)}/${set.members.length}`);
}
// Collections build up across runs, and runs are independent, so resample
// finished runs into careers to see how many it takes to fill each category.
const careerRng = mulberry32(SEED * 7919);
const CAREERS = 500;
const toFill = Object.fromEntries(ELEMENT_SETS.map(set => [set.key, []]));
for (let c = 0; c < CAREERS; c++) {
  const table = new Set();
  const open = new Set(ELEMENT_SETS.map(set => set.key));
  for (let run = 1; run <= CAREER && open.size; run++) {
    for (const z of results[Math.floor(careerRng() * results.length)].seenSet) table.add(z);
    for (const set of ELEMENT_SETS) {
      if (open.has(set.key) && set.members.every(z => table.has(z))) { open.delete(set.key); toFill[set.key].push(run); }
    }
  }
}
console.log(`\nCollections — share of ${CAREER}-run careers that fill each category, and runs it takes:`);
for (const set of ELEMENT_SETS) {
  const runs = toFill[set.key];
  const share = String(Math.round((runs.length / CAREERS) * 100)).padStart(3);
  console.log(`  ${set.label.padEnd(23)} ${share}%   ${runs.length ? `median run ${pct(runs, 50)} · p90 ${pct(runs, 90)}` : ''}`);
}
const reached = {};
for (const r of results) reached[r.maxZ] = (reached[r.maxZ] || 0) + 1;
console.log('\nHeaviest element distribution:', Object.entries(reached).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([z, n]) => `${sym(+z)}×${n}`).join('  '));
const union = new Set(results.flatMap(r => [...r.seenSet]));
const never = ELEMENTS.filter(e => !union.has(e.number)).map(e => e.symbol);
console.log(`\nElements seen across all runs: ${union.size}/118${never.length ? ` · never: ${never.join(' ')}` : ''}`);
