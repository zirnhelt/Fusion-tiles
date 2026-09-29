// Tiny synthesized sound effects (Web Audio, no asset files).

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = false;

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

const audio = () => {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const tone = (freq, { type = 'sine', dur = 0.15, vol = 0.5, at = 0, slide = null, attack = 0.005 } = {}) => {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};

const noise = ({ dur = 0.2, vol = 0.4, at = 0, filter = 'lowpass', freq = 1200, sweepTo = null } = {}) => {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(gain).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
};

const note = (semitones, base = 440) => base * 2 ** (semitones / 12);

export const sfx = {
  setMuted(value) { muted = value; if (muted && ctx) ctx.suspend?.(); },
  select() { tone(880, { type: 'triangle', dur: 0.05, vol: 0.18 }); },
  swap() { tone(320, { type: 'sine', dur: 0.09, vol: 0.25, slide: 520 }); },
  dud() { tone(150, { type: 'sine', dur: 0.12, vol: 0.35, slide: 90 }); },
  match(combo = 1, size = 3) {
    const step = PENTATONIC[Math.min(PENTATONIC.length - 1, combo - 1 + Math.max(0, size - 3))];
    const f = note(step, 523.25);
    tone(f, { type: 'triangle', dur: 0.22, vol: 0.32 });
    tone(f * 2, { type: 'sine', dur: 0.16, vol: 0.1, at: 0.01 });
  },
  fuse(z = 1) {
    const f = 220 + Math.min(118, z) * 4;
    tone(f, { type: 'sine', dur: 0.35, vol: 0.28 });
    tone(f * 1.5, { type: 'sine', dur: 0.28, vol: 0.12, at: 0.03 });
  },
  bonus() {
    tone(note(7, 660), { type: 'square', dur: 0.06, vol: 0.06 });
    tone(note(12, 660), { type: 'square', dur: 0.08, vol: 0.06, at: 0.06 });
  },
  discover() {
    [0, 4, 7, 12, 16].forEach((s, i) => tone(note(s, 523.25), { type: 'triangle', dur: 0.3, vol: 0.2, at: i * 0.07 }));
  },
  fission() {
    noise({ dur: 0.7, vol: 0.6, freq: 3000, sweepTo: 120 });
    tone(110, { type: 'sine', dur: 0.6, vol: 0.6, slide: 38 });
    tone(880, { type: 'sawtooth', dur: 0.25, vol: 0.05, slide: 220 });
  },
  decay() {
    for (let i = 0; i < 5; i++) noise({ dur: 0.03, vol: 0.25, at: i * 0.045 + Math.random() * 0.02, filter: 'highpass', freq: 3500 });
    tone(400, { type: 'sine', dur: 0.3, vol: 0.12, slide: 200 });
  },
  shuffle() {
    for (let i = 0; i < 6; i++) tone(500 + Math.random() * 500, { type: 'triangle', dur: 0.04, vol: 0.1, at: i * 0.04 });
  },
  catalyst() {
    tone(392, { type: 'sine', dur: 0.4, vol: 0.2, slide: 784 });
    noise({ dur: 0.35, vol: 0.12, filter: 'bandpass', freq: 1800, sweepTo: 4000 });
  },
  retire() { tone(300, { type: 'sine', dur: 0.25, vol: 0.12, slide: 150 }); },
  gameOver() {
    [7, 3, 0, -5].forEach((s, i) => tone(note(s, 330), { type: 'triangle', dur: 0.45, vol: 0.22, at: i * 0.16 }));
  },
};
