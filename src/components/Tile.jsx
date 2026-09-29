import React from 'react';
import { el } from '../game/elements.js';

export const tileColorVars = (z) => {
  const { palette } = el(z);
  return { '--c': palette.base, '--cl': palette.light, '--cd': palette.dark, '--cg': palette.glow };
};

// One element tile, styled like a periodic-table cell.
// `size` (px) renders it standalone; without it the tile fills its board cell.
export default function Tile({ z, className = '', decay = null, size = null, showWeight = true }) {
  const e = el(z);
  const style = { ...tileColorVars(z) };
  if (size) Object.assign(style, { width: size, height: size, '--u': `${size / 16.67}px` });
  return (
    <div className={`tile ${className}`} style={style} aria-label={`${e.name}, atomic number ${e.number}`}>
      <span className="tile-z">{e.number}</span>
      <span className="tile-sym">{e.symbol}</span>
      {showWeight && decay == null && <span className="tile-w">{e.weight}</span>}
      {decay != null && (
        <>
          <span className="tile-rad">☢</span>
          <span className="tile-decay"><i style={{ width: `${Math.max(0, 1 - decay) * 100}%` }} /></span>
        </>
      )}
    </div>
  );
}
