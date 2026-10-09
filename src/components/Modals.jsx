import React from 'react';
import { X, Trophy, Sparkles, RotateCcw, AlertTriangle, Star } from 'lucide-react';
import { el } from '../game/elements.js';
import {
  CASCADE_MOVE_BONUS, CATALYST_COST, HINT_COST, SHUFFLE_COST, START_MOVES, FISSION_MOVE_BONUS,
  SET_MOVES_PER_MEMBER, SET_MAX_MOVES, COLLECTION_REWARD_SCALE,
} from '../game/engine.js';
import Tile from './Tile.jsx';

const Section = ({ title, color, children }) => (
  <section className="rounded-xl border border-slate-500/20 bg-slate-900/40 p-3" style={{ borderLeft: `2px solid ${color}` }}>
    <h3 className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{title}</h3>
    <div className="space-y-1 text-[13px] leading-relaxed text-slate-300">{children}</div>
  </section>
);

const Eq = ({ parts }) => (
  <div className="my-2 flex items-center justify-center gap-1.5">
    {parts.map((p, i) => (typeof p === 'number'
      ? <Tile key={i} z={p} size={36} />
      : <span key={i} className="font-mono text-sm text-slate-400">{p}</span>))}
  </div>
);

export function HelpModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal p-5" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="How to play">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300/80">How to play</div>
            <h2 className="text-xl font-bold text-white">Climb the periodic table</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2.5">
          <Section title="Fuse" color="#7dd3fc">
            <p>Swap neighbouring tiles (tap-tap or swipe) to line up <b className="text-white">3 or more</b> of the same element. They fuse into the element closest to their combined atomic weight.</p>
            <Eq parts={[2, '+', 2, '+', 2, '=', 6]} />
            <p className="text-center text-xs text-slate-400">3 × He (4 u) = 12 u → Carbon</p>
          </Section>

          <Section title="Forged tiles" color="#fde047">
            <p>Anything heavier than the tiles dropping in is <b className="text-white">forged</b> and gets a gold frame. Forged tiles fuse in <b className="text-white">pairs</b>. Lining up 3 takes some planning, since any 2 that touch fuse straight away.</p>
            <p>Nothing heavier than Oganesson exists: overweight fusions split in two (<b className="text-white">quasi-fission</b>).</p>
          </Section>

          <Section title="Moves" color="#86efac">
            <p>You start with {START_MOVES}. Every swap costs 1 — even ones that don't match. Matches earn moves back, and bigger reactions earn much more:</p>
            <p className="font-mono text-xs text-slate-200">3-match +1 · 4-match +2 · 5-match +4 · 6+ +8 (forged tiles count from a pair)</p>
            <p className="font-mono text-xs text-slate-200">Chain reaction: 2nd step +{CASCADE_MOVE_BONUS} · 3rd +{CASCADE_MOVE_BONUS * 2} · 4th +{CASCADE_MOVE_BONUS * 3}…</p>
            <p className="font-mono text-xs text-slate-200">Fusions landing at once: 2 → +1 extra · 3 → +3 extra</p>
          </Section>

          <Section title="Score" color="#f0abfc">
            <p>A fusion is worth its element × tiles × 10, then the multipliers stack: <b className="text-white">bigger matches</b> ×2 to ×4, <b className="text-white">chain step</b> k ×k, and <b className="text-white">k fusions at once</b> ×k.</p>
          </Section>

          <Section title="Tools" color="#fcd34d">
            <p><b className="text-white">Hint</b> (−{HINT_COST}) highlights a good swap and stays lit until you move. <b className="text-white">Shuffle</b> (−{SHUFFLE_COST}) rearranges the board. <b className="text-white">Catalyst</b> (−{CATALYST_COST}) turns a tile's 4 neighbours into copies of it. A tool needs at least one move left over.</p>
          </Section>

          <Section title="Sets" color="#c084fc">
            <p>Make every element of one category in a single run (all the reactive nonmetals, all the noble gases…) to complete a <b className="text-white">set</b>: +{SET_MOVES_PER_MEMBER} moves per member (up to +{SET_MAX_MOVES}) and a big score bonus. Heavier sets pay more.</p>
            <p>Finish a category on your saved periodic table, across as many runs as it takes, and its <b className="text-white">collection</b> pays {COLLECTION_REWARD_SCALE}× that bonus, once ever. Collections get a ★.</p>
            <p>Track both under the periodic table. Tap a category to see what's missing.</p>
          </Section>

          <Section title="Nuclear physics" color="#fdba74">
            <p>Hydrogen is your <b className="text-white">neutron</b>. Tap it to see what it can react with.</p>
            <p><b className="text-white">Neutron capture:</b> swap H into a forged tile lighter than Bismuth. It gains a proton and becomes the next element up (Fe → Co).</p>
            <p><b className="text-white">Fission:</b> swap H into Bismuth (Z 83) or heavier to split it in two: big score and +{FISSION_MOVE_BONUS} moves.</p>
            <p><b className="text-white">☢ Decay:</b> tiles from Bi up are radioactive. Leave one alone too long and it alpha-decays (−2 protons). The bar on the tile shows how long it has left.</p>
            <p><b className="text-white">Spontaneous fission:</b> superheavies (Fm, Z 100+) can split by themselves.</p>
          </Section>

          <Section title="The deposit pool" color="#c4b5fd">
            <p>New tiles come from a window of 5 elements that climbs as you forge heavier ones. Stragglers left below it are retired.</p>
          </Section>

          <p className="px-1 text-center text-xs text-slate-400">Every element you create is saved to your periodic table. All 118 can be made. Tap one to see how.</p>
        </div>

        <button className="btn btn-primary mt-4 w-full py-3 text-base" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-500/20 bg-slate-900/50 px-2 py-2 text-center">
    <div className="stat-value text-lg font-bold text-white">{value}</div>
    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</div>
  </div>
);

export const HISTORY_LIMIT = 10;

// Recent runs, newest first. `highlightAt` marks the run that just ended.
function HistoryList({ history, limit = HISTORY_LIMIT, highlightAt }) {
  const best = history.reduce((m, h) => Math.max(m, h.score), 0);
  const fmt = (at) => {
    try { return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; }
  };
  return (
    <ul className="space-y-1">
      {history.slice(0, limit).map(h => (
        <li
          key={h.at}
          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${h.at === highlightAt ? 'bg-sky-400/10 ring-1 ring-sky-300/40' : 'bg-slate-900/40'}`}
        >
          <span className="w-12 shrink-0 text-left text-slate-500">{fmt(h.at)}</span>
          <span className="stat-value min-w-0 flex-1 text-left font-bold text-white">
            {h.score.toLocaleString()}{h.score === best && h.score > 0 && <Trophy className="ml-1 inline h-3 w-3 text-amber-300" />}
          </span>
          <span className="font-mono text-slate-400">{el(h.maxZ).symbol}</span>
          <span className="w-10 shrink-0 text-right font-mono text-slate-400">×{h.bestChain}</span>
        </li>
      ))}
    </ul>
  );
}

export const StorageWarning = ({ onEnable, busy }) => (
  <div className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3 text-left text-xs text-amber-100">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
    <div className="min-w-0 flex-1">
      <div className="font-semibold">Your browser is blocking saving here</div>
      <div className="mt-0.5 text-amber-100/80">Scores may be lost when you close or reload this tab.</div>
      {onEnable && (
        <button className="btn mt-2 h-8 px-3 text-xs" onClick={onEnable} disabled={busy}>
          {busy ? 'Asking…' : 'Enable saving'}
        </button>
      )}
    </div>
  </div>
);

export function HistoryModal({ history, highScore, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal p-5" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Recent runs">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-sky-300/80">Recent runs</div>
            <h2 className="text-xl font-bold text-white">Best: {highScore.toLocaleString()}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {history.length === 0
          ? <p className="py-6 text-center text-sm text-slate-400">No finished runs yet. Play until the reactor shuts down.</p>
          : <HistoryList history={history} />}
        <div className="mt-2 text-right text-[10px] uppercase tracking-[0.14em] text-slate-500">date · score · heaviest · best chain</div>
        <button className="btn btn-primary mt-4 w-full py-3 text-base" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function GameOverModal({ score, highScore, isNewBest, run, discoveredCount, history, runAt, storageLimited, onEnableStorage, enablingStorage, onPlayAgain }) {
  const heaviest = el(run.maxZ);
  return (
    <div className="overlay">
      <div className="modal p-5 text-center" role="dialog" aria-modal="true" aria-label="Game over">
        <div className="text-xs uppercase tracking-[0.3em] text-red-300/80">Reactor shutdown</div>
        <h2 className="mb-1 text-2xl font-bold text-white">Out of moves</h2>

        <div className="my-4">
          <div className="stat-value text-5xl font-bold text-white" style={{ textShadow: '0 0 30px rgba(56,189,248,.5)' }}>{score.toLocaleString()}</div>
          {isNewBest ? (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-200">
              <Trophy className="h-4 w-4" /> New best score!
            </div>
          ) : (
            <div className="mt-1 text-sm text-slate-400">Best: {highScore.toLocaleString()}</div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-center gap-4 rounded-xl border border-slate-500/20 bg-slate-900/40 p-3">
          <Tile z={run.maxZ} size={64} />
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Heaviest element forged</div>
            <div className="text-lg font-bold text-white">{heaviest.name}</div>
            <div className="font-mono text-xs text-slate-400">Z {run.maxZ} of 118{run.newBestZ ? ' · personal record!' : ''}</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <Stat label="Fusions" value={run.fusions} />
          <Stat label="Best chain" value={`×${run.bestChain}`} />
          <Stat label="Nuclear" value={run.nuclear} />
          <Stat label="Elements" value={run.seen} />
        </div>

        {run.sets.length + run.collections.length > 0 && (
          <div className="mb-4 space-y-1.5 rounded-xl border border-slate-500/20 bg-slate-900/40 p-3">
            {run.sets.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="mr-1 text-xs uppercase tracking-[0.16em] text-slate-300">Sets complete</span>
                {run.sets.map(set => (
                  <span key={set.key} className="set-chip done" style={{ '--cat': set.color, cursor: 'default' }}>{set.label}</span>
                ))}
              </div>
            )}
            {run.collections.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="mr-1 text-xs uppercase tracking-[0.16em] text-amber-200">Collections complete</span>
                {run.collections.map(set => (
                  <span key={set.key} className="set-chip done" style={{ '--cat': set.color, cursor: 'default' }}>
                    <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-300" />{set.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-5 rounded-xl border border-slate-500/20 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.16em] text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {run.newDiscoveries.length > 0 ? `${run.newDiscoveries.length} new discover${run.newDiscoveries.length === 1 ? 'y' : 'ies'}` : 'No new discoveries this time'}
          </div>
          {run.newDiscoveries.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {run.newDiscoveries.slice(0, 12).map(z => <Tile key={z} z={z} size={38} showWeight={false} />)}
            </div>
          )}
          <div className="mt-2 font-mono text-xs text-slate-400">Periodic table: {discoveredCount} / 118</div>
        </div>

        {history.length > 1 && (
          <div className="mb-5 rounded-xl border border-slate-500/20 bg-slate-900/40 p-3">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-300">Recent runs</div>
            <HistoryList history={history} limit={5} highlightAt={runAt} />
          </div>
        )}

        {storageLimited && <div className="mb-4"><StorageWarning onEnable={onEnableStorage} busy={enablingStorage} /></div>}

        <button className="btn btn-primary w-full py-3 text-base" onClick={onPlayAgain}>
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
      </div>
    </div>
  );
}
