import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { ELEMENTS, el } from '../game/elements.js';
import { ELEMENT_SETS } from '../game/engine.js';
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
  const other = [
    routes.deposit && 'deposited as a new tile',
    routes.fission && 'a fission product',
    routes.quasi && 'a quasi-fission product',
    routes.decay && `alpha decay of ${el(Math.min(118, z + 2)).symbol}`,
  ].filter(Boolean);
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
          {e.categoryLabel}{!found && <span className="text-slate-500"> · undiscovered</span>}
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
        {routes.capture && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Neutron capture on</span>
            <Chip onClick={() => onPick(routes.capture)}>n + {el(routes.capture).symbol}</Chip>
          </div>
        )}
        {other.length > 0 && (
          <div className="text-slate-400">{other.join(' · ').replace(/^./, c => c.toUpperCase())}</div>
        )}
        {found && into.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-slate-400">Fuses into</span>
            {into.map(r => (r.split
              ? <span key={r.count} className="rounded-md border border-orange-400/40 bg-orange-400/10 px-1.5 py-0.5 font-mono text-[11px] text-orange-200" title="Heavier than Oganesson: splits in two">{r.count}× → split</span>
              : <Chip key={r.count} onClick={() => onPick(r.to)}>{r.count}× → {el(r.to).symbol}</Chip>))}
          </div>
        )}
      </div>
    </div>
  );
}

// One category's progress: this run (pays every run) and on the saved table (pays once)
function SetInfo({ set, runSeen, discovered, collected, onPick }) {
  const made = set.members.filter(z => runSeen.has(z)).length;
  const found = set.members.filter(z => discovered.has(z)).length;
  const total = set.members.length;
  const memberState = (z) => (runSeen.has(z) ? 'made' : discovered.has(z) ? 'found' : '');
  const memberTitle = (z) => `${el(z).name} · ${runSeen.has(z) ? 'made this run' : discovered.has(z) ? 'on your table, not made this run' : 'never made'}`;
  return (
    <div className="mt-3 rounded-xl border border-slate-500/20 bg-slate-900/50 p-3 text-xs text-slate-300">
      <div className="mb-1 text-sm font-semibold" style={{ color: set.color }}>{set.label}</div>
      <div className="mb-2 space-y-0.5 font-mono text-[11px] text-slate-400">
        <div>
          <span className="text-slate-200">This run {made}/{total}</span> · +{set.moves} moves, +{set.points.toLocaleString()} every run
        </div>
        <div>
          {collected ? (
            <span className="text-amber-200"><Star className="mr-1 inline h-3 w-3 fill-current" />Collection complete · claimed</span>
          ) : (
            <><span className="text-slate-200">Collection {found}/{total}</span> · +{set.collection.moves} moves, +{set.collection.points.toLocaleString()} once</>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {set.members.map(z => (
          <button type="button" key={z} onClick={() => onPick(z)} className={`set-member ${memberState(z)}`} title={memberTitle(z)}>
            {el(z).symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PeriodicTable({ discovered, runSeen, collections, fresh, depositRange }) {
  const [picked, setPicked] = useState(null);
  const [focus, setFocus] = useState(null); // set key whose members are spotlit
  const focusSet = ELEMENT_SETS.find(s => s.key === focus);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Periodic Table</h2>
          <div className="text-xs text-slate-400">
            <span className="font-mono text-white">{discovered.size}</span> / 118 discovered · <span className="text-sky-300">{runSeen.size}</span> this run
          </div>
        </div>
        <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 font-mono text-[11px] text-sky-200" title="New tiles are drawn from this range, which climbs as you fuse heavier elements. Anything heavier is forged (gold frame) and fuses in pairs.">
          Depositing {el(depositRange.min).symbol}–{el(depositRange.max).symbol}
        </div>
      </div>

      <div className="ptable" role="list">
        {ELEMENTS.map(e => {
          const found = discovered.has(e.number);
          const cls = [
            'pcell', found && 'found', runSeen.has(e.number) && 'run', fresh.has(e.number) && 'fresh', picked === e.number && 'picked',
            focus && e.category !== focus && 'dim',
          ].filter(Boolean).join(' ');
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
      ) : focusSet ? (
        <SetInfo set={focusSet} runSeen={runSeen} discovered={discovered} collected={collections.has(focusSet.key)} onPick={setPicked} />
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500">Tap any element to see how to make it. Make a whole category in one run to complete a set, or across runs to complete its collection.</p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-1" role="list" aria-label="Element sets this run">
        {ELEMENT_SETS.map(set => {
          const made = set.members.filter(z => runSeen.has(z)).length;
          const found = set.members.filter(z => discovered.has(z)).length;
          const done = made === set.members.length;
          const collected = collections.has(set.key);
          return (
            <button
              type="button"
              key={set.key}
              className={`set-chip ${done ? 'done' : ''} ${focus === set.key ? 'active' : ''}`}
              style={{ '--cat': set.color }}
              aria-pressed={focus === set.key}
              title={`${set.label}: ${made} of ${set.members.length} made this run · ${collected ? 'collection complete' : `${found} of ${set.members.length} collected`}`}
              onClick={() => { setFocus(f => (f === set.key ? null : set.key)); setPicked(null); }}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: set.color }} />}
              {set.label}
              <span className="font-mono opacity-70">{made}/{set.members.length}</span>
              {collected && <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" aria-label="collection complete" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
