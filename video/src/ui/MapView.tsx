import React from 'react';
import { c, ora, sans } from '../look';
import { Cam, data, labels as placeLabels, project } from '../geo';
import { useUid } from './Base';

// A map of Valencia drawn from OpenStreetMap streets and Aparcat's own layers.
// The camera is { x, y } in map units (Web Mercator z16 pixels) and z screen
// pixels per unit; overlays get a toScreen() so pins stay crisp at any zoom.

export type Theme = 'light' | 'night';

const THEMES = {
  light: {
    land: '#F2EFE9',
    park: '#D4E8C6',
    water: '#A9D3EF',
    beach: '#F3E4B8',
    minor: '#FFFFFF',
    secondary: '#FFF4CF',
    major: '#FFD584',
    majorCase: '#EFBF63',
    label: '#8A8F98',
  },
  night: {
    land: '#0A0F1A',
    park: '#0D1C1B',
    water: '#0B1A2D',
    beach: '#121822',
    minor: '#1A2332',
    secondary: '#233045',
    major: '#2E3E58',
    majorCase: '#2E3E58',
    label: '#53647F',
  },
} as const;

const roadWidth = (base: number, z: number) => base * Math.pow(z, 0.75);

export type MapCtx = {
  cam: Cam;
  w: number;
  h: number;
  z: number;
  toScreen: (x: number, y: number) => [number, number];
};

export const makeCtx = (cam: Cam, w: number, h: number): MapCtx => {
  const r = ((cam.r ?? 0) * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    cam,
    w,
    h,
    z: cam.z,
    toScreen: (x, y) => {
      const dx = (x - cam.x) * cam.z;
      const dy = (y - cam.y) * cam.z;
      return [w / 2 + dx * cos - dy * sin, h / 2 + dx * sin + dy * cos];
    },
  };
};

type MapViewProps = {
  cam: Cam;
  w: number;
  h: number;
  theme?: Theme;
  labels?: number; // opacity of neighbourhood labels
  labelSize?: number;
  inMap?: (ctx: MapCtx) => React.ReactNode; // drawn in map units
  overlay?: (ctx: MapCtx) => React.ReactNode; // drawn in screen pixels
  style?: React.CSSProperties;
};

export const MapView: React.FC<MapViewProps> = ({
  cam,
  w,
  h,
  theme = 'light',
  labels = 0,
  labelSize = 20,
  inMap,
  overlay,
  style,
}) => {
  const t = THEMES[theme];
  const ctx = makeCtx(cam, w, h);
  const { z } = cam;
  const city = data.city;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', ...style }}>
      <rect width={w} height={h} fill={t.land} />
      <g transform={`translate(${w / 2} ${h / 2}) rotate(${cam.r ?? 0}) scale(${z}) translate(${-cam.x} ${-cam.y})`}>
        <path d={city.sea} fill={t.water} />
        <path d={city.beach} fill={t.beach} />
        <path d={city.parks} fill={t.park} />
        <path d={city.water} fill={t.water} />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={city.roads.minor} stroke={t.minor} strokeWidth={roadWidth(3.2, z) / z} />
          {theme === 'light' && (
            <path d={city.roads.major} stroke={t.majorCase} strokeWidth={(roadWidth(7.5, z) + 2) / z} />
          )}
          <path d={city.roads.secondary} stroke={t.secondary} strokeWidth={roadWidth(5, z) / z} />
          <path d={city.roads.major} stroke={t.major} strokeWidth={roadWidth(7.5, z) / z} />
        </g>
        {inMap?.(ctx)}
      </g>
      {labels > 0 &&
        placeLabels.map((l) => {
          const [x, y] = ctx.toScreen(...project(l.at[0], l.at[1]));
          if (x < -200 || x > w + 200 || y < -50 || y > h + 50) return null;
          return (
            <text
              key={l.text}
              x={x}
              y={y}
              textAnchor="middle"
              fill={t.label}
              opacity={labels}
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: labelSize,
                letterSpacing: labelSize * 0.16,
              }}
            >
              {l.text}
            </text>
          );
        })}
      {overlay?.(ctx)}
    </svg>
  );
};

// ORA zones, painted inside a growing circle (map units) when `reveal` is set.
export const OraLayer: React.FC<{
  ctx: MapCtx;
  reveal?: { x: number; y: number; r: number };
  width?: number; // screen px
  opacity?: number;
  fill?: number; // like the app: translucent fill, solid outline
}> = ({ ctx, reveal, width = 3, opacity = 0.92, fill = 0.4 }) => {
  const id = useUid('ora');
  const sw = Math.max(width, roadWidth(width, ctx.z)) / ctx.z;
  const order = ['Amarillo', 'Verde', 'Naranja', 'Azul'] as const;
  return (
    <g opacity={opacity}>
      {reveal && (
        <mask id={id} maskUnits="userSpaceOnUse" x={-5000} y={-5000} width={20000} height={20000}>
          <circle cx={reveal.x} cy={reveal.y} r={Math.max(0, reveal.r)} fill="white" />
        </mask>
      )}
      <g mask={reveal ? `url(#${id})` : undefined} strokeLinecap="round" strokeLinejoin="round">
        {order.map((k) => (
          <path key={k} d={data.ora[k]} fill={ora[k]} fillOpacity={fill} stroke={ora[k]} strokeWidth={sw} />
        ))}
      </g>
    </g>
  );
};

export const toneColor = (free: number | null) =>
  free === null ? '#A1A1AA' : free >= 20 ? c.accent : free >= 5 ? c.amber : '#DC2626';

// The app's garage pin: a green circle with a white P.
export const PinP: React.FC<{ x: number; y: number; r: number; color?: string; scale?: number }> = ({
  x,
  y,
  r,
  color = c.accent,
  scale = 1,
}) => {
  if (scale <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r={r} fill={color} stroke="#fff" strokeWidth={r * 0.2} />
      <text
        y={r * 0.36}
        textAnchor="middle"
        fill="#fff"
        style={{ fontFamily: sans, fontWeight: 800, fontSize: r * 1.08 }}
      >
        P
      </text>
    </g>
  );
};

// The chosen point: dark dot with a white ring and a soft halo.
export const OriginDot: React.FC<{ x: number; y: number; k?: number; appear?: number; pulse?: number }> = ({
  x,
  y,
  k = 1,
  appear = 1,
  pulse = 0,
}) => {
  if (appear <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${appear})`}>
      <circle r={16 * k * (1 + pulse * 0.6)} fill={c.ink} opacity={0.15 * (1 - pulse * 0.6)} />
      <circle r={7 * k} fill={c.ink} stroke="#fff" strokeWidth={3 * k} />
    </g>
  );
};

// A traffic camera: slate dot, with the app's camera glyph when it is big enough.
export const CameraPin: React.FC<{ x: number; y: number; r: number; scale?: number; glyph?: boolean }> = ({
  x,
  y,
  r,
  scale = 1,
  glyph = false,
}) => {
  if (scale <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r={r} fill={c.camera} stroke="#fff" strokeWidth={Math.max(1, r * 0.22)} />
      {glyph && (
        <g fill="#fff" transform={`scale(${r / 16})`}>
          <rect x={-9} y={-5} width={18} height={12} rx={2} />
          <rect x={-4} y={-9} width={7} height={4} rx={1} />
          <circle cx={0} cy={1} r={3.6} fill={c.camera} />
        </g>
      )}
    </g>
  );
};
