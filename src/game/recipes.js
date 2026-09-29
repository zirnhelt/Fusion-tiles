// Which reactions can produce each element — powers the periodic table's
// "how do I get this?" info. Computed once, lazily.

import { ELEMENTS } from './elements.js';
import { fusionResult, calculateFissionProducts, DECAY_THRESHOLD, FISSION_THRESHOLD } from './engine.js';

let cache = null;

const build = () => {
  const routes = ELEMENTS.map(() => ({ fusion: [], fission: false, decay: false, deposit: false }));
  const maxDeposit = Math.floor(ELEMENTS.length / 8) + 4; // top of the deposit pool with Og on the board
  for (let z = 1; z <= ELEMENTS.length; z++) {
    if (z <= maxDeposit) routes[z - 1].deposit = true;
    for (let n = 3; n <= 6; n++) {
      const out = fusionResult(z, n);
      if (out > z) routes[out - 1].fusion.push({ count: n, from: z });
    }
    if (z >= DECAY_THRESHOLD) routes[Math.max(1, z - 2) - 1].decay = true;
    if (z >= FISSION_THRESHOLD) {
      for (let k = 0; k <= 240; k++) {
        const { daughter1, daughter2 } = calculateFissionProducts(z, () => k / 240);
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

// What fusing 3–6 of this element produces
export const fusesInto = (z) =>
  [3, 4, 5, 6].map(count => ({ count, to: fusionResult(z, count) })).filter(r => r.to > z);
