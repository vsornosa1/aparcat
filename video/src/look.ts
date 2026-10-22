import { useVideoConfig } from 'remotion';

// The look, taken from the app (src/app/globals.css, Tailwind zinc/emerald and
// the map colours in src/components/map/ParkingMap.tsx). Every scene reads here.
export const video = { width: 1080, height: 1350, fps: 30 };

export const c = {
  ground: '#F8FAFC', // the app's background
  night: '#0A0F1A', // the problem happens at night
  night2: '#131C2E',
  ink: '#18181B', // zinc-900
  ink2: '#3F3F46', // zinc-700
  muted: '#71717A', // zinc-500
  faint: '#A1A1AA', // zinc-400
  line: '#E4E4E7', // zinc-200
  soft: '#F4F4F5', // zinc-100
  panel: '#FAFAFA', // zinc-50
  white: '#FFFFFF',
  accent: '#059669', // emerald-600: the one thing to look at
  accentDark: '#047857', // emerald-700
  accentSoft: '#ECFDF5', // emerald-50
  accentLine: '#A7F3D0', // emerald-200
  red: '#E5484D', // COMPLET
  trail: '#FF5A36', // the car going round the block
  amber: '#D97706',
  camera: '#475569', // slate-600, camera pins
  report: '#7C3AED', // violet-600, "hueco libre"
  moonlight: '#DCE6F5', // line art at night
};

export const ora = {
  Azul: '#2563EB',
  Naranja: '#F97316',
  Verde: '#16A34A',
  Amarillo: '#EAB308',
} as const;

export const sans = '"Geist", system-ui, sans-serif';
export const mono = '"Geist Mono", ui-monospace, monospace';

// Title-safe margin.
export const SAFE_X = 72;

export const useLayout = () => {
  const { width, height } = useVideoConfig();
  return { W: width, H: height, cx: width / 2, cy: height / 2 };
};
