import React, { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { el, ELEMENTS } from '../game/elements.js';
import Tile from './Tile.jsx';

export function useAnimatedNumber(value, duration = 650) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (value - from) * (1 - (1 - k) ** 3));
      current.current = v;
      setDisplay(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

const movesTone = (m) =>
  m <= 3 ? 'text-red-400 animate-pulse' : m <= 5 ? 'text-red-400' : m <= 10 ? 'text-orange-300' : 'text-sky-300';

export default function Hud({ score, moves, highScore, movesDelta, runMaxZ, bestZ }) {
  const shownScore = useAnimatedNumber(score);
  const heaviest = el(runMaxZ);
  const pct = (z) => `${((z - 1) / (ELEMENTS.length - 1)) * 100}%`;

  return (
    <div className="panel px-4 py-3">
      <div className="grid grid-cols-3 items-end text-center">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Score</div>
          <div className="stat-value text-2xl font-bold text-white">{shownScore.toLocaleString()}</div>
        </div>
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Moves</div>
          <div key={moves} className={`stat-value text-3xl font-bold leading-none bump ${movesTone(moves)}`}>{moves}</div>
          {movesDelta && movesDelta.amount !== 0 && (
            <span
              key={movesDelta.id}
              className={`delta absolute -top-1 right-2 font-mono text-xs font-bold ${movesDelta.amount > 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {movesDelta.amount > 0 ? `+${movesDelta.amount}` : movesDelta.amount}
            </span>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Best</div>
          <div className="stat-value flex items-center justify-center gap-1 text-2xl font-bold text-amber-300">
            <Trophy className="h-4 w-4" />{highScore.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Tile z={runMaxZ} size={34} showWeight={false} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
            <span className="truncate text-slate-300">
              Heaviest: <span className="font-semibold text-white">{heaviest.name}</span>
              <span className="font-mono text-slate-400"> · Z {runMaxZ}</span>
            </span>
            <span className="shrink-0 font-mono text-slate-500">→ Og 118</span>
          </div>
          <div className="progress-track" title={`Heaviest this run: Z ${runMaxZ} · Best ever: Z ${bestZ}`}>
            <div className="progress-fill" style={{ width: pct(runMaxZ) }} />
            {bestZ > 1 && <div className="progress-best" style={{ left: `calc(${pct(bestZ)} - 1px)` }} />}
          </div>
        </div>
      </div>
    </div>
  );
}
