import { Easing, interpolate } from 'remotion';

const outExpo = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const inCubic = Easing.bezier(0.55, 0, 1, 0.45);
// Overshoots by about 8% and settles: logos, pins and stamps.
const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

// 0 -> 1 over [start, start + dur], fast in, soft landing (entrances).
export const enter = (frame: number, start: number, dur = 24) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: outExpo });

// 0 -> 1, eased both ends (camera moves, carried objects).
export const glide = (frame: number, start: number, dur = 30) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: inOut });

// 0 -> 1, accelerating (exits).
export const leave = (frame: number, start: number, dur = 18) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: inCubic });

// 0 -> 1 with a small overshoot (things that pop).
export const pop = (frame: number, start: number, dur = 14) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: outBack });

// Linear 0 -> 1, clamped.
export const ramp = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], clamp);

export const lerp = (t: number, a: number, b: number) => a + (b - a) * t;

// An element that rises in and, optionally, eases out.
export const rise = (frame: number, start: number, out?: number, distance = 28) => {
  const i = enter(frame, start, 26);
  const o = out === undefined ? 0 : leave(frame, out, 14);
  return {
    opacity: i * (1 - o),
    transform: `translateY(${(1 - i) * distance - o * distance * 0.5}px)`,
  };
};

// Characters typed in at a steady rate, starting at `start`.
export const typed = (text: string, frame: number, start: number, cps = 22) => {
  const n = Math.max(0, Math.floor(((frame - start) / 30) * cps));
  return text.slice(0, n);
};

// A number that counts up with an ease-out, for live figures.
export const countUp = (frame: number, start: number, to: number, dur = 20) =>
  Math.round(to * enter(frame, start, dur));

// A decaying shake for impacts: returns a pixel offset.
export const shake = (frame: number, at: number, amp = 10, seed = 1) => {
  const t = frame - at;
  if (t < 0 || t > 10) return 0;
  return Math.sin(t * 2.7 + seed) * amp * Math.exp(-t / 3);
};
