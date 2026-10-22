import React from 'react';
import { interpolate } from 'remotion';
import { enter, glide, leave } from './motion';

// A touch indicator, like the simulator's: it glides to the target, presses at
// `at` and leaves a ripple. Coordinates are in whatever space it is placed in.
export const Tap: React.FC<{
  frame: number;
  at: number;
  from: [number, number];
  to: [number, number];
  enterAt?: number;
  leaveAt?: number;
  size?: number;
  dark?: boolean;
}> = ({ frame, at, from, to, enterAt = at - 16, leaveAt = at + 14, size = 44, dark = false }) => {
  if (frame < enterAt || frame > leaveAt + 10) return null;
  const move = glide(frame, enterAt, Math.max(1, at - 3 - enterAt));
  const x = from[0] + (to[0] - from[0]) * move;
  const y = from[1] + (to[1] - from[1]) * move;
  const press = interpolate(frame, [at - 1, at + 2, at + 7], [1, 0.78, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = enter(frame, enterAt, 6) * (1 - leave(frame, leaveAt, 8));
  const ripple = frame >= at ? enter(frame, at, 16) : 0;
  const ring = dark ? 'rgba(255,255,255,0.85)' : 'rgba(24,24,27,0.55)';
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, opacity, pointerEvents: 'none' }}>
      {ripple > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -size * (0.5 + ripple),
            top: -size * (0.5 + ripple),
            width: size * (1 + ripple * 2),
            height: size * (1 + ripple * 2),
            borderRadius: '50%',
            border: `${size * 0.06}px solid ${ring}`,
            opacity: 1 - ripple,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: dark ? 'rgba(255,255,255,0.35)' : 'rgba(24,24,27,0.28)',
          border: `${size * 0.07}px solid rgba(255,255,255,0.95)`,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          transform: `scale(${press})`,
        }}
      />
    </div>
  );
};

// A CSS filter that blurs only horizontally, for whip pans.
export const WhipFilter: React.FC<{ id: string; amount: number }> = ({ id, amount }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id={id} x="-20%" y="0" width="140%" height="100%">
      <feGaussianBlur stdDeviation={`${Math.max(0.01, amount)} 0`} />
    </filter>
  </svg>
);
