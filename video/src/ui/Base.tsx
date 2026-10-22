import React from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile } from 'remotion';

// Offline fonts (copied from node_modules/@fontsource/geist*/files/ into
// public/fonts/). Loaded once before the first frame is captured.
const faces = [
  ['Geist', 400, 'geist-latin-400-normal.woff2'],
  ['Geist', 500, 'geist-latin-500-normal.woff2'],
  ['Geist', 600, 'geist-latin-600-normal.woff2'],
  ['Geist', 700, 'geist-latin-700-normal.woff2'],
  ['Geist', 800, 'geist-latin-800-normal.woff2'],
  ['Geist', 900, 'geist-latin-900-normal.woff2'],
  ['Geist Mono', 400, 'geist-mono-latin-400-normal.woff2'],
  ['Geist Mono', 500, 'geist-mono-latin-500-normal.woff2'],
  ['Geist Mono', 600, 'geist-mono-latin-600-normal.woff2'],
  ['Geist Mono', 700, 'geist-mono-latin-700-normal.woff2'],
] as const;

const fontsReady =
  typeof document === 'undefined'
    ? Promise.resolve()
    : Promise.all(
        faces.map(([family, weight, file]) =>
          new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format("woff2")`, {
            weight: String(weight),
          })
            .load()
            .then((face) => document.fonts.add(face)),
        ),
      ).then(() => undefined);

// Renders nothing until Geist is loaded, so text measurements are always right.
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = React.useState(false);
  const [handle] = React.useState(() => delayRender('Loading Geist'));
  React.useEffect(() => {
    fontsReady.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return ready ? <>{children}</> : null;
};

let canvas: HTMLCanvasElement | null = null;

// Width of a line of text in px (fonts are loaded before anything renders).
export const measure = (text: string, weight: number, size: number, family = 'Geist', trackingEm = 0) => {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.font = `${weight} ${size}px "${family}"`;
  return ctx.measureText(text).width + trackingEm * size * text.length;
};

// Fine static grain over everything, so flat colour does not look digital.
export const Grain = ({ opacity = 0.05 }: { opacity?: number }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'overlay', opacity }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);

export const useUid = (prefix: string) => `${prefix}-${React.useId().replace(/:/g, '')}`;
