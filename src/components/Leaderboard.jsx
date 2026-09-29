import React, { useEffect, useState } from 'react';
import { X, Send, Share2, Check } from 'lucide-react';
import { el } from '../game/elements.js';
import { KEYS, load, save } from '../game/storage.js';
import { fetchLeaderboard, leaderboardEnabled, submitRun } from '../game/leaderboard.js';
import Tile from './Tile.jsx';

export const formatDay = (day) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

const MEDALS = ['#fcd34d', '#cbd5e1', '#fdba74'];

function Rows({ data }) {
  if (data.entries.length === 0) {
    return <div className="py-6 text-center text-sm text-slate-400">No scores yet today. Be the first!</div>;
  }
  const youShown = data.you && data.entries.some(e => e.rank === data.you.rank && e.score === data.you.score && e.name === data.you.name);
  const row = (e, you) => (
    <li
      key={`${e.rank}-${e.name}-${you ? 'you' : ''}`}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${you ? 'border border-sky-400/50 bg-sky-400/10' : ''}`}
    >
      <span className="stat-value w-7 text-right text-sm font-bold" style={{ color: MEDALS[e.rank - 1] ?? '#94a3b8' }}>{e.rank}</span>
      <Tile z={e.maxZ} size={26} showWeight={false} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200" title={`Heaviest: ${el(e.maxZ).name}`}>
        {e.name}{you && <span className="text-sky-300"> (you)</span>}
      </span>
      <span className="stat-value text-sm font-bold text-white">{e.score.toLocaleString()}</span>
    </li>
  );
  return (
    <ol className="space-y-0.5">
      {data.entries.map(e => row(e, youShown && data.you.rank === e.rank && data.you.name === e.name))}
      {data.you && !youShown && (
        <>
          <li className="text-center text-xs text-slate-500">⋯</li>
          {row(data.you, true)}
        </>
      )}
    </ol>
  );
}

function useBoard(day, initial = null) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!leaderboardEnabled || initial) return undefined;
    let live = true;
    fetchLeaderboard(day).then(d => live && setData(d), e => live && setError(e.message));
    return () => { live = false; };
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps
  return [data, setData, error, setError];
}

export function LeaderboardModal({ day, onClose, onPlayDaily }) {
  const [data, , error] = useBoard(day);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal p-5" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Daily leaderboard">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-300">Daily reactor · {formatDay(day)}</div>
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[13px] leading-relaxed text-slate-300">
          Everyone gets the same board and the same drops today. Your best verified run counts. New board at midnight UTC.
        </p>
        <div className="rounded-xl border border-slate-500/20 bg-slate-900/40 p-2">
          {!leaderboardEnabled && <div className="py-6 text-center text-sm text-slate-400">The online leaderboard isn't set up for this build.</div>}
          {leaderboardEnabled && error && <div className="py-6 text-center text-sm text-red-300">{error}</div>}
          {leaderboardEnabled && !error && !data && <div className="py-6 text-center text-sm text-slate-400">Loading…</div>}
          {data && <Rows data={data} />}
        </div>
        {data && data.total > data.entries.length && (
          <div className="mt-2 text-center font-mono text-xs text-slate-500">{data.total} players today</div>
        )}
        {onPlayDaily && (
          <button className="btn btn-primary mt-4 w-full py-3 text-base" onClick={onPlayDaily}>Play today's board</button>
        )}
      </div>
    </div>
  );
}

// Game-over panel for a daily run: submit to the leaderboard, share
export function DailyResult({ day, score, maxZ, actions, dailyBest }) {
  const [name, setName] = useState(() => load(KEYS.playerName, ''));
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [data, setData, error, setError] = useBoard(day, {});
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      save(KEYS.playerName, name.trim());
      setData(await submitRun(day, name.trim(), actions));
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const share = async () => {
    const text = `⚛️ Fusion Tiles daily · ${day}\n${score.toLocaleString()} pts · forged ${el(maxZ).name} (Z ${maxZ})${data?.you ? ` · #${data.you.rank} of ${data.total}` : ''}\n${location.origin}${location.pathname}?daily`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* share sheet dismissed */ }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-left">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Daily · {formatDay(day)}</div>
        <div className="font-mono text-xs text-slate-400">today's best {dailyBest.toLocaleString()}</div>
      </div>

      {leaderboardEnabled && status !== 'done' && (
        <form className="flex gap-2" onSubmit={submit}>
          <input
            className="min-w-0 flex-1 rounded-lg border border-slate-500/40 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
            value={name}
            onChange={e => setName(e.target.value.slice(0, 16))}
            placeholder="Your name"
            maxLength={16}
            aria-label="Name for the leaderboard"
          />
          <button className="btn btn-primary px-3" type="submit" disabled={status === 'sending'}>
            <Send className="h-4 w-4" /> {status === 'sending' ? 'Verifying…' : 'Submit'}
          </button>
        </form>
      )}
      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
      {status === 'done' && data?.entries && (
        <div className="max-h-56 overflow-y-auto">
          <Rows data={data} />
        </div>
      )}

      <button className="btn mt-2 w-full text-sm" onClick={share}>
        {copied ? <Check className="h-4 w-4 text-green-300" /> : <Share2 className="h-4 w-4 text-sky-300" />}
        {copied ? 'Copied' : 'Share result'}
      </button>
    </div>
  );
}
