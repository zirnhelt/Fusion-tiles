// Which reactions can produce each element — powers the periodic table's
// "how do I get this?" info. Computed once, lazily.

import { ELEMENTS } from './elements.js';
import { fuse, calculateFissionProducts, DECAY_THRESHOLD, FISSION_THRESHOLD } from './engine.js';

const TOP_OF_POOL = Math.floor(ELEMENTS.length / 8) + 4; // highest element the deposit pool ever drops
const LOWEST_FORGED = 6;                                  // the pool starts at H–B, so C and up can be forged
const SAMPLES = 240;

let cache = null;

// Counts that can actually line up: pool elements in runs of 3–6; forged ones
// pair off as soon as two touch, so 2 — or 3 by filling the gap in X · X
export const fusionCounts = (z) => [
  ...(z >= LOWEST_FORGED ? [2] : []),
  3,
  ...(z <= TOP_OF_POOL ? [4, 5, 6] : []),
];

const fusionOutcome = (z, count) => {
  const first = fuse(z, count, () => 0);
  return first.to ? { to: first.to } : { split: true };
};

const build = () => {
  const routes = ELEMENTS.map(() => ({ fusion: [], capture: null, fission: false, quasi: false, decay: false, deposit: false }));
  for (let z = 1; z <= ELEMENTS.length; z++) {
    if (z <= TOP_OF_POOL) routes[z - 1].deposit = true;
    for (const n of fusionCounts(z)) {
      const out = fusionOutcome(z, n);
      if (out.to > z) routes[out.to - 1].fusion.push({ count: n, from: z });
      if (out.split) {
        for (let k = 0; k <= SAMPLES; k++) {
          fuse(z, n, () => k / SAMPLES).split.forEach(d => { routes[d - 1].quasi = true; });
        }
      }
    }
    if (z >= LOWEST_FORGED && z < FISSION_THRESHOLD) routes[z].capture = z;
    if (z >= DECAY_THRESHOLD) routes[Math.max(1, z - 2) - 1].decay = true;
    if (z >= FISSION_THRESHOLD) {
      for (let k = 0; k <= SAMPLES; k++) {
        const { daughter1, daughter2 } = calculateFissionProducts(z, () => k / SAMPLES);
        routes[daughter1 - 1].fission = true;
        routes[daughter2 - 1].fission = true;
      }
    }
  }
  return routes;
};

export const routesFor = (z) => {
  cache ||= build();
  return cache[z - 1];
};

// What fusing this element produces, for each count that can line up
export const fusesInto = (z) =>
  fusionCounts(z).map(count => ({ count, ...fusionOutcome(z, count) })).filter(r => r.split || r.to > z);
