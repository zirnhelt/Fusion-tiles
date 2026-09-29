import React, { useEffect, useRef } from 'react';
import Tile from './Tile.jsx';
import {
  GRID_SIZE, DECAY_THRESHOLD, getDecayMoveLimit, getCatalystArea, classifySwap,
} from '../game/engine.js';

const CELL = 100 / GRID_SIZE;
const at = (list, i, j) => list?.some(([r, c]) => r === i && c === j);

// ── Effect factories (positions are % of the board) ─────────────────────────
let fxId = 0;
export const cellCenter = ([i, j]) => ({ x: (j + 0.5) * CELL, y: (i + 0.5) * CELL });

export const makeBurst = (cell, color, { count = 14, spread = 14, size = 1.6, wave = true, waveScale = 2.4 } = {}) => ({
  id: ++fxId,
  ...cellCenter(cell),
  color,
  wave,
  waveScale,
  parts: Array.from({ length: count }, () => ({
    a: Math.random() * 360,
    r: spread * (0.45 + Math.random() * 0.75),
    s: size * (0.5 + Math.random()),
    d: 450 + Math.random() * 450,
  })),
});
export const makeFloater = (cell, text, color = '#fff') => ({ id: ++fxId, ...cellCenter(cell), text, color });
export const makeCallout = (text, sub = '', color = '#38bdf8') => ({ id: ++fxId, text, sub, color });
export const makeFlash = (cell) => ({ id: ++fxId, ...cellCenter(cell) });

export default function Board({
  grid, ages, poolMax, selected, hint, catalystMode, catalystHover, motion, tileFx, fx, shakeKey,
  disabled, onTap, onSwipe, onHover,
}) {
  const boardRef = useRef(null);
  const frameRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!shakeKey || !frameRef.current?.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    frameRef.current.animate(
      [
        { transform: 'translate(0,0)' }, { transform: 'translate(-6px, 3px)' }, { transform: 'translate(6px, -3px)' },
        { transform: 'translate(-5px, -2px)' }, { transform: 'translate(4px, 3px)' }, { transform: 'translate(-2px, 1px)' },
        { transform: 'translate(0,0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.36,.07,.19,.97)' }
    );
  }, [shakeKey]);

  const cellFromEvent = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const size = rect.width / GRID_SIZE;
    const i = Math.floor((e.clientY - rect.top) / size);
    const j = Math.floor((e.clientX - rect.left) / size);
    if (i < 0 || j < 0 || i >= GRID_SIZE || j >= GRID_SIZE) return null;
    return { i, j, size };
  };

  const handleDown = (e) => {
    if (disabled) return;
    const hit = cellFromEvent(e);
    if (!hit) return;
    drag.current = { ...hit, x: e.clientX, y: e.clientY, done: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleMove = (e) => {
    if (catalystMode && e.pointerType === 'mouse') {
      const hit = cellFromEvent(e);
      onHover(hit ? { row: hit.i, col: hit.j } : null);
    }
    const d = drag.current;
    if (!d || d.done || catalystMode) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < d.size * 0.35) return;
    const [ti, tj] = Math.abs(dx) > Math.abs(dy) ? [d.i, d.j + Math.sign(dx)] : [d.i + Math.sign(dy), d.j];
    d.done = true;
    if (ti >= 0 && tj >= 0 && ti < GRID_SIZE && tj < GRID_SIZE) onSwipe([d.i, d.j], [ti, tj]);
  };

  const handleUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.done) onTap(d.i, d.j);
  };

  const catalystArea = catalystMode && catalystHover ? getCatalystArea(catalystHover.row, catalystHover.col) : null;

  const stateClass = (i, j, z) => {
    const f = tileFx[`${i}-${j}`];
    if (f) {
      const map = {
        matched: 'is-matched', pop: 'is-pop', retire: 'is-retire', decay: 'is-decaying',
        fission: 'is-fission', convert: 'is-convert', capturing: 'is-capturing',
      };
      if (map[f.kind]) return map[f.kind];
    }
    if (catalystMode && catalystHover) {
      if (catalystHover.row === i && catalystHover.col === j) return 'is-catalyst-center';
      return at(catalystArea, i, j) ? 'is-catalyst-area' : 'is-dim';
    }
    if (selected?.row === i && selected?.col === j) return 'is-selected';
    // Neighbours a selected neutron (or a selected target of one) would react with
    if (selected && Math.abs(i - selected.row) + Math.abs(j - selected.col) === 1) {
      const { type } = classifySwap(grid, [selected.row, selected.col], [i, j]);
      if (type === 'fission') return 'is-fission-target';
      if (type === 'capture') return 'is-capture-target';
    }
    if (hint && at(hint.cells, i, j)) return hint.type === 'direct' ? 'is-hint' : 'is-hint-path';
    return '';
  };

  return (
    <div
      ref={frameRef}
      className="board-frame"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => { drag.current = null; }}
      onPointerLeave={() => catalystMode && onHover(null)}
    >
      <div ref={boardRef} className="board" role="grid" aria-label="Game board">
        <div className="board-slots">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, k) => (
            <div key={k} className="slot" style={{ left: `${(k % GRID_SIZE) * CELL}%`, top: `${Math.floor(k / GRID_SIZE) * CELL}%`, width: `${CELL}%`, height: `${CELL}%` }} />
          ))}
        </div>

        <div className="board-tiles">
          {grid.map((row, i) => row.map((z, j) => {
            if (!z) return null;
            const id = `${i}-${j}`;
            const m = motion.cells[id];
            const f = tileFx[id];
            const state = stateClass(i, j, z);
            const radioactive = z >= DECAY_THRESHOLD;
            const progress = radioactive ? Math.min(1, (ages[i]?.[j] ?? 0) / getDecayMoveLimit(z)) : 0;
            const heat = radioactive && !state ? (progress >= 0.75 ? 'is-critical' : 'is-hot') : '';
            const style = {
              left: `${j * CELL}%`, top: `${i * CELL}%`, width: `${CELL}%`, height: `${CELL}%`,
            };
            if (m) Object.assign(style, { '--dx': m.dx ?? 0, '--dy': m.dy ?? 0, '--dur': `${m.dur}ms`, '--delay': `${m.delay || 0}ms` });
            if (f?.kind === 'fuse') Object.assign(style, { '--tx': f.tx, '--ty': f.ty });
            return (
              <div
                key={m ? `${id}-${motion.key}` : id}
                className={`cell ${m ? (m.kind === 'fall' ? 'fall' : 'mv') : ''} ${f?.kind === 'fuse' ? 'fusing' : ''}`}
                style={style}
              >
                <Tile z={z} className={`${state} ${heat}`} decay={radioactive ? progress : null} forged={z > poolMax} />
              </div>
            );
          }))}
        </div>

        <div className="board-fx">
          {fx.flashes.map(f => <div key={f.id} className="flash" style={{ '--fx': `${f.x}%`, '--fy': `${f.y}%` }} />)}
          {fx.bursts.map(b => (
            <React.Fragment key={b.id}>
              {b.wave && <div className="shockwave" style={{ left: `${b.x}%`, top: `${b.y}%`, '--pc': b.color, '--sw': b.waveScale }} />}
              {b.parts.map((p, k) => (
                <div
                  key={k}
                  className="particle"
                  style={{ left: `${b.x}%`, top: `${b.y}%`, '--pc': b.color, '--a': `${p.a}deg`, '--r': `${p.r}cqw`, '--s': `${p.s}cqw`, '--pd': `${p.d}ms` }}
                />
              ))}
            </React.Fragment>
          ))}
          {fx.floaters.map(f => (
            <div key={f.id} className="floater" style={{ left: `${f.x}%`, top: `${f.y}%`, '--fc': f.color }}>{f.text}</div>
          ))}
          {fx.callouts.map(c => (
            <div key={c.id} className="callout" style={{ '--cc': c.color }}>
              <div className="callout-main" style={{ fontSize: `${Math.min(10, 130 / c.text.length)}cqw` }}>{c.text}</div>
              {c.sub && <div className="callout-sub">{c.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
