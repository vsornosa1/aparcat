import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';
import { c, SAFE_X, sans, useLayout } from '../look';
import { M, T, useStory } from '../timing';
import { AlamedaArt, BenimacletArt, Car, MalvarrosaArt, parkedCars, RussafaArt } from '../ui/Art';
import { Stamp } from '../ui/Brand';
import { enter, glide, leave, shake } from '../ui/motion';
import { WhipFilter } from '../ui/Tap';
import { useUid } from '../ui/Base';

// 0:03 One street of parked cars running through four neighbourhoods. Each
// one gets its landmark and a red COMPLET stamp on the beat. The last stamp
// becomes the red dot that turns into Aparcat's green P.

const SEG = 1080;
const GROUND = 1080;
export const DOT = { x: 540, y: 660 }; // where the last stamp ends, on screen
const NAMES = ['Alameda', 'Russafa', 'Benimaclet', 'La Malva-rosa'];
const TILT = [-8, 6, -7, 5];
const cars = parkedCars(SEG * 4 + 400);

// Camera x along the street: whip pans between tiles (8 frames centred on the
// cut), a slow drift inside each tile.
const DRIFT = 1.6;
const HOLD = 22;
const panAt = (g: number) => {
  if (g < M.tiles[0] + 4) {
    return interpolate(g, [M.tiles[0] - 4, M.tiles[0] + 4], [-SEG, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }
  for (let k = 0; k < 4; k++) {
    const start = M.tiles[k] + 4;
    const next = M.tiles[k + 1];
    const drift = Math.min(HOLD, Math.max(0, g - start)) * DRIFT;
    if (next === undefined) return k * SEG + drift * (1 - glide(g, M.push, 12));
    if (g < next - 4) return k * SEG + drift;
    if (g < next + 4) {
      const from = k * SEG + HOLD * DRIFT;
      return from + (SEG * (k + 1) - from) * glide(g, next - 4, 8);
    }
  }
  return 3 * SEG;
};

const tileAt = (g: number) => {
  let k = 0;
  M.tiles.forEach((t, i) => {
    if (g >= t - 4) k = i;
  });
  return k;
};

export const Montage = () => {
  const g = useStory(T.montage.from);
  const { W, H } = useLayout();
  const blurId = useUid('mwhip');
  const pan = panAt(g);
  const speed = Math.abs(panAt(g + 0.5) - panAt(g - 0.5));
  const k = tileAt(g);
  const impact = M.stamps.reduce((s, at, i) => s + shake(g, at + 4, 12, i), 0);

  // The push into the last stamp, then the stamp collapses into a dot.
  const push = glide(g, M.push, 14);
  const zoom = 1 + push * 1.05;
  const morph = glide(g, M.push + 2, 12);
  const fade = enter(g, M.push + 6, 12);
  const shrink = glide(g, M.push + 12, 10);
  const lastStampScale = 1 - shrink * 0.88;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${c.night} 0%, ${c.night2} 62%, #1A2440 78%, ${c.night} 100%)` }}>
      <WhipFilter id={blurId} amount={speed * 0.32} />
      <Stars g={g} />
      <AbsoluteFill style={{ transform: `translate(${impact}px, ${impact * 0.5}px)` }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ filter: speed > 2 ? `url(#${blurId})` : undefined }}>
          <g transform={`translate(${W / 2} ${DOT.y}) scale(${zoom}) translate(${-W / 2} ${-DOT.y})`}>
            <g transform={`translate(${-pan} 0)`}>
              {NAMES.map((name, i) => (
                <Tile key={name} i={i} g={g} name={name} hidden={i === 3 && fade >= 1} />
              ))}
              <rect x={-400} y={GROUND} width={SEG * 5} height={H - GROUND + 200} fill="#0C121E" />
              <rect x={-400} y={GROUND} width={SEG * 5} height={10} fill="#2A3550" />
              {Array.from({ length: 40 }, (_, i) => (
                <rect key={i} x={-300 + i * 130} y={1222} width={70} height={8} rx={4} fill="#3A4766" />
              ))}
              {cars.map((car) => (
                <Car key={car.seed} x={car.x} y={GROUND} len={car.len} color={car.color} kind={car.kind} seed={car.seed} />
              ))}
              {M.stamps.map((at, i) => {
                const slam = enter(g, at, 6);
                if (g < at) return null;
                const last = i === 3;
                const scale = (2.3 - 1.3 * slam) * (last ? lastStampScale : 1);
                return (
                  <g
                    key={at}
                    transform={`translate(${SEG * i + DOT.x} ${DOT.y}) rotate(${TILT[i] * (1 - (last ? morph : 0))}) scale(${scale})`}
                    opacity={Math.min(1, slam * 2.2)}
                  >
                    <Stamp morph={last ? morph : 0} dot={150} />
                  </g>
                );
              })}
            </g>
          </g>
          <rect width={W} height={H} fill={c.night} opacity={fade} />
          <defs>
            <radialGradient id="dot-glow">
              <stop offset="0%" stopColor={c.red} stopOpacity={0.42} />
              <stop offset="45%" stopColor={c.red} stopOpacity={0.14} />
              <stop offset="100%" stopColor={c.red} stopOpacity={0} />
            </radialGradient>
          </defs>
          {fade > 0 && (
            <circle
              cx={DOT.x}
              cy={DOT.y}
              r={330 * (1 + 0.1 * Math.sin(Math.max(0, g - (M.push + 18)) * 0.9))}
              fill="url(#dot-glow)"
              opacity={fade}
            />
          )}
          {fade > 0 && (
            <circle
              cx={DOT.x}
              cy={DOT.y}
              r={75 * zoom * lastStampScale * (1 + 0.08 * Math.sin(Math.max(0, g - (M.push + 22)) * 0.9))}
              fill={c.red}
              opacity={fade}
            />
          )}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 200px rgba(0,0,0,0.6)', opacity: 1 - fade }} />
      <div style={{ position: 'absolute', left: SAFE_X, top: 1268, fontFamily: sans, fontWeight: 600, fontSize: 24, letterSpacing: 24 * 0.2, color: '#7D8DAA', opacity: (1 - fade) * enter(g, M.tiles[0], 10) }}>
        {String(k + 1).padStart(2, '0')} / 04
      </div>
    </AbsoluteFill>
  );
};

const Tile: React.FC<{ i: number; g: number; name: string; hidden: boolean }> = ({ i, g, name, hidden }) => {
  if (hidden) return null;
  const at = M.tiles[i];
  const draw = enter(g, at - 8, 22);
  const x0 = SEG * i;
  const name0 = enter(g, at - 2, 12);
  const props = { draw, color: c.moonlight, warm: '#FFC46B' };
  return (
    <g>
      <g transform={`translate(${x0} 0)`}>
        {i === 0 && <AlamedaArt {...props} />}
        {i === 1 && <RussafaArt {...props} fruit="#FF9F43" />}
        {i === 2 && <BenimacletArt {...props} />}
        {i === 3 && <MalvarrosaArt {...props} moon="#FFE7A0" />}
      </g>
      <text
        x={x0 + SAFE_X}
        y={300 + (1 - name0) * 30}
        fill="#fff"
        opacity={name0}
        style={{ fontFamily: sans, fontWeight: 900, fontSize: 112, letterSpacing: '-0.035em' }}
      >
        {name}
      </text>
    </g>
  );
};

const Stars: React.FC<{ g: number }> = ({ g }) => (
  <svg width={1080} height={700} style={{ position: 'absolute', left: 0, top: 0 }}>
    {Array.from({ length: 46 }, (_, i) => {
      const x = random(`stx-${i}`) * 1080;
      const y = 40 + random(`sty-${i}`) * 560;
      const tw = 0.35 + 0.35 * Math.sin(g * 0.18 + i);
      return <circle key={i} cx={x} cy={y} r={1 + random(`str-${i}`) * 1.6} fill="#fff" opacity={tw * (1 - leave(g, M.push + 4, 10))} />;
    })}
  </svg>
);
