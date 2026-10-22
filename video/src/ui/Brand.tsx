import React from 'react';
import QRCode from 'qrcode';
import { c, sans } from '../look';
import { stampSpecks } from './Art';

// The app has no logo file: its identity is the "Aparcat" title with the
// "Valencia" pill (RecommendationSheet header) and the green P of the garage
// pins. The lockup puts those two together.

export const PinBadge: React.FC<{ size: number; color?: string; style?: React.CSSProperties }> = ({
  size,
  color = c.accent,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size,
      background: color,
      boxShadow: `0 0 0 ${size * 0.09}px #fff, 0 ${size * 0.12}px ${size * 0.4}px rgba(5,150,105,0.35)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: sans,
      fontWeight: 800,
      fontSize: size * 0.56,
      lineHeight: 1,
      ...style,
    }}
  >
    <span style={{ transform: `translateY(${size * 0.02}px)` }}>P</span>
  </div>
);

// Title + pill, laid out like the app header (items-baseline, gap-2).
export const Wordmark: React.FC<{
  size: number;
  pillRatio?: number;
  gapRatio?: number;
  color?: string;
  pillOpacity?: number;
  pillScale?: number;
}> = ({ size, pillRatio = 0.32, gapRatio = 0.11, color = c.ink, pillOpacity = 1, pillScale = 1 }) => {
  const pill = size * pillRatio;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: size * gapRatio, whiteSpace: 'nowrap' }}>
      <span
        style={{
          fontFamily: sans,
          fontWeight: 600,
          fontSize: size,
          letterSpacing: '-0.035em',
          color,
          lineHeight: 1,
        }}
      >
        Aparcat
      </span>
      <span
        style={{
          fontFamily: sans,
          fontWeight: 500,
          fontSize: pill,
          color: '#52525B',
          background: c.soft,
          borderRadius: 999,
          padding: `${pill * 0.18}px ${pill * 0.72}px`,
          lineHeight: 1.2,
          opacity: pillOpacity,
          display: 'inline-block',
          transform: `scale(${pillScale})`,
          transformOrigin: 'left center',
        }}
      >
        Valencia
      </span>
    </div>
  );
};

// The red COMPLET stamp. `morph` turns it into a solid dot of diameter `dot`.
export const Stamp: React.FC<{
  w?: number;
  h?: number;
  color?: string;
  morph?: number;
  dot?: number;
  textOpacity?: number;
  ground?: string;
}> = ({ w = 580, h = 176, color = c.red, morph = 0, dot = 150, textOpacity = 1, ground = c.night }) => {
  const W = w + (dot - w) * morph;
  const H = h + (dot - h) * morph;
  const rx = 26 + (dot / 2 - 26) * morph;
  const specks = React.useMemo(() => stampSpecks(w, h), [w, h]);
  return (
    <g>
      <rect x={-W / 2} y={-H / 2} width={W} height={H} rx={rx} fill={color} fillOpacity={morph} stroke={color} strokeWidth={11} />
      <rect
        x={-W / 2 + 17}
        y={-H / 2 + 17}
        width={Math.max(0, W - 34)}
        height={Math.max(0, H - 34)}
        rx={Math.max(0, rx - 14)}
        fill="none"
        stroke={color}
        strokeWidth={4}
        opacity={1 - morph}
      />
      <text
        y={h * 0.18}
        textAnchor="middle"
        fill={color}
        opacity={textOpacity * (1 - morph)}
        style={{ fontFamily: sans, fontWeight: 900, fontSize: h * 0.5, letterSpacing: h * 0.05 }}
      >
        COMPLET
      </text>
      {morph < 0.5 && specks.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={ground} opacity={0.85 * (1 - morph * 2)} />)}
    </g>
  );
};

const qr = QRCode.create('https://aparcat.vercel.app', { errorCorrectionLevel: 'M' });

export const QR: React.FC<{ size: number; color?: string; background?: string }> = ({
  size,
  color = c.ink,
  background = '#fff',
}) => {
  const n = qr.modules.size;
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  const pad = 2;
  return (
    <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`} style={{ display: 'block' }} shapeRendering="crispEdges">
      <rect x={-pad} y={-pad} width={n + pad * 2} height={n + pad * 2} rx={2} fill={background} />
      <path d={d} fill={color} />
    </svg>
  );
};
