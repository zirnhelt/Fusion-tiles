import React, { useEffect } from 'react';
import { Atom, HelpCircle, Play, Volume2, VolumeX } from 'lucide-react';
import Tile from './Tile.jsx';

const RULES = [
  ['01', 'Swap', 'neighbouring tiles to line up 3 or more'],
  ['02', 'Fuse', 'them into the element nearest their combined weight'],
  ['03', 'Climb', 'all 118. Every swap costs a move, so make them count'],
];

// First-visit opening screen: brand, a looping fusion demo and the three core rules.
export default function TitleScreen({ leaving, muted, onToggleMute, onStart, onHelp }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); onStart(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className={`title-screen ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Fusion Tiles">
      <button
        className="icon-btn absolute right-4 top-4"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        title={muted ? 'Sound off' : 'Sound on'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <div className="title-inner">
        <div className="title-core" aria-hidden="true">
          <span className="title-orbit" />
          <span className="title-orbit title-orbit-2" />
          <Atom className="h-12 w-12 text-sky-300 drop-shadow-[0_0_14px_rgba(56,189,248,0.9)] motion-safe:animate-[spin_14s_linear_infinite]" />
        </div>

        <h1 className="title-glow whitespace-nowrap text-center text-4xl font-bold text-white sm:text-5xl">FUSION TILES</h1>
        <p className="mt-2 text-center font-mono text-[10px] tracking-[0.28em] text-sky-300/70 sm:text-[11px]">
          MATCH · FUSE · CLIMB THE PERIODIC TABLE
        </p>

        <div className="title-demo" aria-label="Three helium fuse into carbon">
          <div className="title-demo-in">
            {[0, 1, 2].map(i => <Tile key={i} z={2} size={48} className={`demo-in demo-in-${i}`} />)}
          </div>
          <span className="font-mono text-lg text-slate-500">→</span>
          <Tile z={6} size={60} className="demo-out" />
        </div>

        <ol className="title-rules">
          {RULES.map(([n, verb, rest]) => (
            <li key={n}>
              <span className="font-mono text-[11px] text-sky-400/70">{n}</span>
              <span><b className="text-white">{verb}</b> {rest}</span>
            </li>
          ))}
        </ol>

        <button className="btn btn-primary title-cta mt-6 w-full" onClick={onStart} autoFocus>
          <Play className="h-5 w-5 fill-current" /> Start the reactor
        </button>
        <button className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-sky-200" onClick={onHelp}>
          <HelpCircle className="h-4 w-4" /> How to play
        </button>
      </div>

      <footer className="absolute inset-x-0 bottom-4 text-center text-[11px] text-slate-600">
        All 118 elements · progress is saved on this device
      </footer>
    </div>
  );
}
