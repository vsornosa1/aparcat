import React from 'react';
import { AbsoluteFill, interpolateColors, random } from 'remotion';
import { c, mono, sans, useLayout } from '../look';
import { M, T, useStory } from '../timing';
import { ArtsSkyline, TuriaSilhouette } from '../ui/Art';
import { PinBadge, QR, Wordmark } from '../ui/Brand';
import { enter, glide, leave, lerp, pop, ramp, rise, typed } from '../ui/motion';
import { PIN_EXIT } from './Community';

// 0:34 The Túria at sunset carries the one idea: every spot you share is one
// less lap for someone. Night falls on the City of Arts and Sciences for the
// end card.

const SKY = {
  dusk: ['#3B1E5A', '#B23E6A', '#FF7A4D', '#FFC46B'],
  night: ['#060A16', '#0B1430', '#14204A', '#22335F'],
};

export const Finale = () => {
  const g = useStory(T.mission.from);
  const { W, H } = useLayout();
  const open = enter(g, 1004, 22);
  const night = glide(g, M.night - 8, 30);
  const sky = SKY.dusk.map((col, i) => interpolateColors(night, [0, 1], [col, SKY.night[i]]));
  const silhouette = interpolateColors(night, [0, 1], ['#2A1240', '#03050C']);

  const sunY = lerp(glide(g, 1004, 200), 980, 1240);
  const sunR = 132;
  const turiaUp = enter(g, 1006, 26) * (1 - leave(g, M.night, 24));
  const textOut = leave(g, M.night - 14, 12);

  return (
    <AbsoluteFill
      style={{
        clipPath: open < 1 ? `circle(${open * 1500}px at ${PIN_EXIT[0]}px ${PIN_EXIT[1]}px)` : undefined,
        background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 42%, ${sky[2]} 72%, ${sky[3]} 92%)`,
      }}
    >
      <Stars g={g} opacity={night} />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - sunR * 2.6,
          top: sunY - sunR * 2.6,
          width: sunR * 5.2,
          height: sunR * 5.2,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,214,140,0.55) 0%, rgba(255,160,90,0.18) 38%, rgba(255,140,80,0) 70%)',
          opacity: 1 - night,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - sunR,
          top: sunY - sunR,
          width: sunR * 2,
          height: sunR * 2,
          borderRadius: '50%',
          background: '#FFD99A',
          opacity: 1 - night,
        }}
      />
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
        <g transform={`translate(0 ${H - 52 + (1 - turiaUp) * 420})`}>
          <TuriaSilhouette color={silhouette} t={glide(g, 1010, 190)} />
        </g>
        <g
          transform={`translate(${W / 2} ${H - 100}) scale(${1 + 0.035 * ramp(g, M.end, 150)}) translate(${-W / 2} 0)`}
          opacity={enter(g, M.end - 6, 10)}
        >
          <g transform={`translate(0 0) scale(1 -0.42)`} opacity={0.22}>
            <ArtsSkyline draw={enter(g, M.end - 6, 44)} color="#A7F3D0" width={4} />
          </g>
          <ArtsSkyline draw={enter(g, M.end - 6, 44)} color="#E2F7EF" width={4.5} accent="#34D399" />
        </g>
      </svg>
      <Mission g={g} out={textOut} />
      {g >= M.end - 10 && <EndCard g={g} />}
    </AbsoluteFill>
  );
};

const Mission: React.FC<{ g: number; out: number }> = ({ g, out }) => {
  const lines = [['Cada', 'hueco'], ['que', 'compartes'], ['es', 'una', 'vuelta', 'menos'], ['para', 'alguien.']];
  let i = 0;
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 150, textAlign: 'center', opacity: 1 - out }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', justifyContent: 'center', gap: 22, marginBottom: 4 }}>
          {line.map((word) => {
            const t = enter(g, 1030 + i++ * 4, 14);
            return (
              <span
                key={word}
                style={{
                  fontFamily: sans,
                  fontWeight: 800,
                  fontSize: 86,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.05,
                  color: '#fff',
                  opacity: t,
                  transform: `translateY(${(1 - t) * 30}px)`,
                  display: 'inline-block',
                  textShadow: '0 4px 30px rgba(60, 10, 60, 0.35)',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
      <div
        style={{
          marginTop: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 28,
          letterSpacing: 28 * 0.24,
          color: 'rgba(255,255,255,0.88)',
          ...rise(g, 1086),
        }}
      >
        <span style={{ width: 54, height: 2, background: 'rgba(255,255,255,0.6)' }} />
        FET A VALÈNCIA
        <span style={{ width: 54, height: 2, background: 'rgba(255,255,255,0.6)' }} />
      </div>
    </div>
  );
};

const EndCard: React.FC<{ g: number }> = ({ g }) => {
  const url = 'aparcat.vercel.app';
  const shown = typed(url, g, M.end + 14, 30);
  const caret = g < M.end + 14 + 40 || Math.floor(g / 15) % 2 === 0;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 214, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30, ...rise(g, M.end, undefined, 24) }}>
        <div style={{ transform: `scale(${pop(g, M.end, 14)})` }}>
          <PinBadge size={96} style={{ boxShadow: '0 0 0 8px rgba(255,255,255,0.12), 0 10px 40px rgba(16,185,129,0.45)' }} />
        </div>
        <Wordmark size={104} color="#fff" pillOpacity={0.9} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 400,
          textAlign: 'center',
          fontFamily: mono,
          fontWeight: 600,
          fontSize: 62,
          letterSpacing: '-0.03em',
          color: '#fff',
          opacity: enter(g, M.end + 10, 8),
        }}
      >
        {shown}
        <span style={{ display: 'inline-block', width: 4, height: 60, marginLeft: 6, background: '#34D399', verticalAlign: '-8px', opacity: caret ? 1 : 0 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 494,
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 40,
          color: '#A7F3D0',
          ...rise(g, M.end + 34),
        }}
      >
        Aparca antes, ayuda al siguiente.
      </div>
      <div style={{ position: 'absolute', left: 540 - 95, top: 598, ...rise(g, M.end + 46, undefined, 20) }}>
        <div style={{ padding: 10, background: '#fff', borderRadius: 22, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
          <QR size={170} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontFamily: sans, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,0.75)' }}>Gratis · sin registro</div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 30,
          textAlign: 'center',
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 20,
          color: 'rgba(255,255,255,0.55)',
          opacity: enter(g, M.end + 56, 12),
        }}
      >
        Datos: Ajuntament de València · Mapas: © OpenStreetMap
      </div>
    </AbsoluteFill>
  );
};

const Stars: React.FC<{ g: number; opacity: number }> = ({ g, opacity }) => (
  <svg width={1080} height={900} style={{ position: 'absolute', left: 0, top: 0, opacity }}>
    {Array.from({ length: 70 }, (_, i) => (
      <circle
        key={i}
        cx={random(`fx-${i}`) * 1080}
        cy={random(`fy-${i}`) * 880}
        r={0.8 + random(`fr-${i}`) * 1.8}
        fill="#fff"
        opacity={0.3 + 0.4 * (0.5 + 0.5 * Math.sin(g * 0.15 + i * 1.7))}
      />
    ))}
  </svg>
);
