import React from 'react';
import { X, Trophy, Sparkles, RotateCcw } from 'lucide-react';
import { el } from '../game/elements.js';
import { CASCADE_MOVE_BONUS, CATALYST_COST, SHUFFLE_COST, START_MOVES, FISSION_MOVE_BONUS } from '../game/engine.js';
import Tile from './Tile.jsx';

const Section = ({ title, color, children }) => (
  <section className="rounded-xl border border-slate-500/20 bg-slate-900/40 p-3">
    <h3 className="mb-1 text-xs font-bold uppercase tracking-[0.16em]" style={{ color }}>{title}</h3>
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
            <div className="text-xs uppercase tracking-[0.2em] text-sky-300">How to play</div>
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

          <Section title="Moves" color="#86efac">
            <p>You start with {START_MOVES}. Every swap costs 1 — even ones that don't match. Matches earn moves back:</p>
            <p className="font-mono text-xs text-slate-200">3-match +1 · 4-match +2 · 5-match +4 · 6+ +6 · each chain reaction +{CASCADE_MOVE_BONUS}</p>
          </Section>

          <Section title="Tools" color="#fcd34d">
            <p><b className="text-white">Hint</b> (free) highlights a good swap. <b className="text-white">Shuffle</b> (−{SHUFFLE_COST}) rearranges the board. <b className="text-white">Catalyst</b> (−{CATALYST_COST}) turns a tile's 4 neighbours into copies of it.</p>
          </Section>

          <Section title="Nuclear physics" color="#fdba74">
            <p><b className="text-white">Fission:</b> swap Hydrogen (a neutron) into Bismuth (Z 83) or heavier to split it in two: big score and +{FISSION_MOVE_BONUS} moves.</p>
            <p><b className="text-white">☢ Decay:</b> tiles from Bi up are radioactive. Leave one alone too long and it alpha-decays (−2 protons). The bar on the tile shows how long it has left.</p>
            <p><b className="text-white">Spontaneous fission:</b> superheavies (Fm, Z 100+) can split by themselves.</p>
          </Section>

          <Section title="The deposit pool" color="#c4b5fd">
            <p>New tiles come from a window of 5 elements that climbs as you forge heavier ones. Stragglers left below it are retired.</p>
          </Section>

          <p className="px-1 text-center text-xs text-slate-400">Every element you create is saved to your periodic table. Can you fill it?</p>
        </div>

        <button className="btn btn-primary mt-4 w-full py-3 text-base" onClick={onClose}>Start fusing</button>
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

export function GameOverModal({ score, highScore, isNewBest, run, discoveredCount, onPlayAgain }) {
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
          <Stat label="Fissions" value={run.fissions} />
          <Stat label="Elements" value={run.seen} />
        </div>

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

        <button className="btn btn-primary w-full py-3 text-base" onClick={onPlayAgain}>
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
      </div>
    </div>
  );
}
