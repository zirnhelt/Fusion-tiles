import React from 'react';

const TONES = {
  normal: ['#00d95a', '#00ff66'],
  nuclear: ['#e0a030', '#ffcc33'],
  discovery: ['#4fc9e0', '#8ef0ff'],
  warn: ['#d06060', '#ff8080'],
};

// Retro reactor terminal: last three events
export default function Console({ lines }) {
  const recent = lines.slice(-3);
  return (
    <div className="crt" aria-live="polite">
      <div className="pointer-events-none absolute right-3 top-1.5 z-[2] text-[8px] tracking-[0.2em] text-green-800">SYS LOG</div>
      <div className="crt-line" style={{ color: '#00b050' }}>&gt; FUSION-TILES v2.0 | REACTOR ONLINE</div>
      {recent.length === 0 ? (
        <div className="crt-line" style={{ color: '#00cc55' }}>&gt; AWAITING OPERATOR INPUT<span className="caret">_</span></div>
      ) : (
        recent.map((line, i) => {
          const latest = i === recent.length - 1;
          const [older, newest] = TONES[line.tone] || TONES.normal;
          const color = latest ? newest : older;
          return (
            <div
              key={line.id}
              className={`crt-line ${latest ? 'new' : ''}`}
              style={{ color, opacity: latest ? 1 : 0.75, textShadow: latest ? `0 0 8px ${color}99` : 'none' }}
            >
              &gt; {line.text}{latest && <span className="caret">_</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
