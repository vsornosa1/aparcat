import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { c, mono, SAFE_X, sans, useLayout } from '../look';
import { camFor, places, project } from '../geo';
import { T, useStory } from '../timing';
import { MapView } from '../ui/MapView';
import { enter, leave, ramp } from '../ui/motion';
import { WhipFilter } from '../ui/Tap';
import { useUid } from '../ui/Base';

// 0:00 Russafa, Friday night: a car goes round the same real block again and
// again (Sueca, Dénia, Cadis, Puerto Rico).

const LAP = 22; // frames per lap
const loop = places.russafaLoop.map(([lon, lat]) => project(lon, lat));
const segLen = loop.map((p, i) => {
  const q = loop[(i + 1) % loop.length];
  return Math.hypot(q[0] - p[0], q[1] - p[1]);
});
const total = segLen.reduce((a, b) => a + b, 0);
const centre: [number, number] = [
  loop.reduce((s, p) => s + p[0], 0) / loop.length,
  loop.reduce((s, p) => s + p[1], 0) / loop.length,
];

const pointAt = (f: number): [number, number] => {
  let d = (((f % 1) + 1) % 1) * total;
  for (let i = 0; i < loop.length; i++) {
    if (d <= segLen[i]) {
      const p = loop[i];
      const q = loop[(i + 1) % loop.length];
      const t = d / segLen[i];
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    }
    d -= segLen[i];
  }
  return loop[0];
};

const loopPath = `M${loop.map((p) => p.join(' ')).join(' L')} Z`;

const STREETS = ['Carrer de Dénia', 'Carrer de Cadis', 'Carrer de Puerto Rico', 'Carrer de Sueca'];

export const Hook = () => {
  const g = useStory(T.hook.from);
  const { W, H } = useLayout();
  const blur = useUid('whip');
  const z = interpolate(g, [0, 96], [2.5, 3.15]);
  const r = interpolate(g, [0, 96], [20, 31]);
  const cam = camFor(centre[0], centre[1], W / 2, 455, W, H, z, r);
  const f = g / LAP;
  const lap = Math.min(4, Math.floor(g / LAP) + 1);
  const sinceLap = g - (lap - 1) * LAP;
  const out = leave(g, 86, 10);
  const trail = 0.42;

  return (
    <AbsoluteFill style={{ background: c.night }}>
      <WhipFilter id={blur} amount={out * 70} />
      <AbsoluteFill style={{ transform: `translateX(${-out * 1250}px)`, filter: out > 0 ? `url(#${blur})` : undefined }}>
        <MapView
          cam={cam}
          w={W}
          h={H}
          theme="night"
          inMap={({ z: k }) => (
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={loopPath} stroke={c.trail} strokeOpacity={0.22} strokeWidth={5 / k} />
              {[
                [30, 0.1],
                [16, 0.28],
                [7, 1],
              ].map(([w, o]) => (
                <path
                  key={w}
                  d={loopPath}
                  stroke={w === 7 ? '#FFB199' : c.trail}
                  strokeOpacity={o}
                  strokeWidth={w / k}
                  pathLength={1}
                  strokeDasharray={`${trail} ${1 - trail}`}
                  strokeDashoffset={-(f - trail)}
                />
              ))}
            </g>
          )}
          overlay={({ toScreen }) => {
            const [x, y] = toScreen(...pointAt(f));
            return (
              <g>
                {loop.map((p, i) => {
                  const q = loop[(i + 1) % loop.length];
                  const [ax, ay] = toScreen(p[0], p[1]);
                  const [bx, by] = toScreen(q[0], q[1]);
                  let angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
                  if (angle > 90) angle -= 180;
                  if (angle < -90) angle += 180;
                  const mx = (ax + bx) / 2;
                  const my = (ay + by) / 2;
                  const nx = -(by - ay);
                  const ny = bx - ax;
                  const n = Math.hypot(nx, ny) || 1;
                  const sx = (W / 2 - mx) * nx + (455 - my) * ny > 0 ? -1 : 1;
                  return (
                    <text
                      key={i}
                      x={mx + (nx / n) * 34 * sx}
                      y={my + (ny / n) * 34 * sx + 8}
                      transform={`rotate(${angle} ${mx + (nx / n) * 34 * sx} ${my + (ny / n) * 34 * sx + 8})`}
                      textAnchor="middle"
                      fill="#6F81A0"
                      opacity={enter(g, 4 + i * 3, 12)}
                      style={{ fontFamily: sans, fontWeight: 500, fontSize: 24 }}
                    >
                      {STREETS[i]}
                    </text>
                  );
                })}
                <circle cx={x} cy={y} r={34} fill={c.trail} opacity={0.18} />
                <circle cx={x} cy={y} r={15} fill="#FF8A65" opacity={0.9} />
                <circle cx={x} cy={y} r={7} fill="#fff" />
              </g>
            );
          }}
        />
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, rgba(10,15,26,0) 48%, rgba(10,15,26,0.88) 68%, ${c.night} 86%)`,
          }}
        />
        <AbsoluteFill style={{ boxShadow: 'inset 0 0 220px rgba(0,0,0,0.65)' }} />
        <Counter g={g} lap={lap} since={sinceLap} />
        <div style={{ position: 'absolute', left: SAFE_X, top: 868 }}>
          {['Russafa.', 'Viernes.', '20:30.'].map((word, i) => {
            // The first word is already on screen at frame 0 (the feed's still).
            const t = i === 0 ? enter(g, -10, 12) : enter(g, 2 + i * 12, 12);
            return (
              <div
                key={word}
                style={{
                  fontFamily: i === 2 ? mono : sans,
                  fontWeight: i === 2 ? 700 : 900,
                  fontSize: 128,
                  lineHeight: 1.0,
                  letterSpacing: i === 2 ? '-0.04em' : '-0.035em',
                  color: i === 2 ? '#FFB199' : '#fff',
                  opacity: t,
                  transform: `translateY(${(1 - t) * 40}px)`,
                  marginBottom: 8,
                }}
              >
                {word}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Counter: React.FC<{ g: number; lap: number; since: number }> = ({ g, lap, since }) => {
  const flip = lap > 1 ? ramp(since, 0, 6) : 1;
  const punch = lap > 1 ? 1 + 0.12 * (1 - ramp(since, 0, 8)) : 1;
  return (
    <div style={{ position: 'absolute', right: SAFE_X, top: 96, textAlign: 'right', opacity: enter(g, -4, 8) }}>
      <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 26, letterSpacing: 26 * 0.22, color: '#8FA3C4' }}>VUELTA</div>
      <div style={{ position: 'relative', height: 150, overflow: 'hidden', transform: `scale(${punch})`, transformOrigin: 'right center' }}>
        {lap > 1 && (
          <div style={{ position: 'absolute', right: 0, top: 0, fontFamily: mono, fontWeight: 700, fontSize: 150, lineHeight: 1, color: '#fff', opacity: 1 - flip, transform: `translateY(${-flip * 60}px)` }}>
            {lap - 1}
          </div>
        )}
        <div style={{ position: 'absolute', right: 0, top: 0, fontFamily: mono, fontWeight: 700, fontSize: 150, lineHeight: 1, color: lap === 4 ? '#FF8A65' : '#fff', opacity: flip, transform: `translateY(${(1 - flip) * 60}px)` }}>
          {lap}
        </div>
      </div>
    </div>
  );
};
