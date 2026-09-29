import React, { useState } from 'react';
import { ELEMENTS, CATEGORIES, el } from '../game/elements.js';
import { routesFor, fusesInto } from '../game/recipes.js';
import Tile from './Tile.jsx';

const Chip = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="rounded-md border border-slate-600/40 bg-slate-500/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-200 hover:border-slate-400/60">
    {children}
  </button>
);

function ElementInfo({ z, found, onPick }) {
  const e = el(z);
  const routes = routesFor(z);
  const into = fusesInto(z);
  const noRoute = !routes.deposit && routes.fusion.length === 0 && !routes.fission && !routes.decay;
  return (
    <div className="mt-3 flex gap-3 rounded-xl border border-slate-500/20 bg-slate-900/50 p-3">
      <div className="shrink-0">
        {found ? <Tile z={z} size={52} /> : (
          <div className="grid h-[52px] w-[52px] place-items-center rounded-[20%] border border-dashed border-slate-500/50 font-mono text-lg text-slate-500">?</div>
        )}
      </div>
      <div className="min-w-0 flex-1 text-xs leading-relaxed text-slate-300">
        <div className="text-sm font-semibold text-white">
          {e.name} <span className="font-mono text-xs font-normal text-slate-400">Z {z} · {e.weight} u</span>
        </div>
        <div className="mb-1 flex items-center gap-1.5 text-[11px]" style={{ color: e.categoryColor }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.categoryColor }} />
          {CATEGORIES[e.category].label}{!found && <span className="text-slate-500"> · undiscovered</span>}
        </div>
        {routes.fusion.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Made from</span>
            {routes.fusion.slice(0, 4).map(r => (
              <Chip key={`${r.count}-${r.from}`} onClick={() => onPick(r.from)}>{r.count}×{el(r.from).symbol}</Chip>
            ))}
            {routes.fusion.length > 4 && <span className="text-slate-500">+{routes.fusion.length - 4} more</span>}
          </div>
        )}
        {(routes.deposit || routes.fission || routes.decay) && (
          <div className="text-slate-400">
            {[routes.deposit && 'deposited as a new tile', routes.fission && 'a fission product', routes.decay && `alpha decay of ${el(Math.min(118, z + 2)).symbol}`]
              .filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase())}
          </div>
        )}
        {noRoute && <div className="text-amber-300/80">No reaction in the current rules produces this one… yet.</div>}
        {found && into.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Fuses into</span>
            {into.map(r => <Chip key={r.count} onClick={() => onPick(r.to)}>{r.count}× → {el(r.to).symbol}</Chip>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeriodicTable({ discovered, runSeen, fresh, depositRange }) {
  const [picked, setPicked] = useState(null);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Periodic Table</h2>
          <div className="text-xs text-slate-400">
            <span className="font-mono text-white">{discovered.size}</span> / 118 discovered · <span className="text-sky-300">{runSeen.size}</span> this run
          </div>
        </div>
        <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 font-mono text-[11px] text-sky-200" title="New tiles are drawn from this range; it climbs as you fuse heavier elements">
          Depositing {el(depositRange.min).symbol}–{el(depositRange.max).symbol}
        </div>
      </div>

      <div className="ptable" role="list">
        {ELEMENTS.map(e => {
          const found = discovered.has(e.number);
          const cls = ['pcell', found && 'found', runSeen.has(e.number) && 'run', fresh.has(e.number) && 'fresh', picked === e.number && 'picked']
            .filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={e.number}
              className={cls}
              style={{
                gridRow: e.row + 1, gridColumn: e.col + 1,
                '--cat': e.categoryColor, '--cat-bg': `${e.categoryColor}40`, '--cat-line': `${e.categoryColor}80`, '--cat-run': `${e.categoryColor}b0`,
              }}
              title={found ? `${e.name} (${e.symbol}) · Z ${e.number}` : `Element ${e.number} · undiscovered`}
              onClick={() => setPicked(p => (p === e.number ? null : e.number))}
            >
              {found ? e.symbol : <span className="text-[0.8em] font-normal">{e.number}</span>}
            </button>
          );
        })}
        <div style={{ gridRow: 6, gridColumn: 3 }} className="pcell pointer-events-none border-dashed text-[0.8em]">*</div>
        <div style={{ gridRow: 7, gridColumn: 3 }} className="pcell pointer-events-none border-dashed text-[0.8em]">**</div>
        <div style={{ gridRow: 8, gridColumn: '1 / -1', height: 4 }} />
      </div>

      {picked ? (
        <ElementInfo z={picked} found={discovered.has(picked)} onPick={setPicked} />
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500">Tap any element to see how to make it.</p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
