import React from 'react';
import { mono, sans } from '../look';
import { PHONE } from './Phone';

// The app's mobile UI rebuilt from its components (SearchBar, LayerControls,
// RecommendationSheet, ReportButtons, map popups), in the phone's CSS pixels.

const zinc = { 900: '#18181B', 700: '#3F3F46', 600: '#52525B', 500: '#71717A', 300: '#D4D4D8', 200: '#E4E4E7', 100: '#F4F4F5', 50: '#FAFAFA' };
const em = { 700: '#047857', 600: '#059669', 500: '#10B981', 200: '#A7F3D0', 50: '#ECFDF5' };

const text = (size: number, weight = 400, color = zinc[900], lh = 1.35): React.CSSProperties => ({
  fontFamily: sans,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: lh,
});

const LOWERCASE = new Set(['de', 'del', 'la', 'las', 'el', 'els', 'los', 'i', 'y', 'en', 'l', 'd']);

// Same as src/lib/format.ts: garages arrive in capitals and show in title case.
export const formatPlaceName = (name: string) => {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toLocaleUpperCase('es')) return trimmed;
  return trimmed
    .toLocaleLowerCase('es')
    .split(/(\s+|-|’|')/)
    .map((part, i) => (i > 0 && LOWERCASE.has(part) ? part : part.replace(/\p{L}/u, (l) => l.toLocaleUpperCase('es'))))
    .join('');
};

const SearchIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={zinc[500]} strokeWidth={2}>
    <circle cx={11} cy={11} r={7} />
    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
  </svg>
);

const LocateIcon: React.FC<{ spin?: number }> = ({ spin = 0 }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={em[700]} strokeWidth={2} style={{ transform: `rotate(${spin * 360}deg)` }}>
    <circle cx={12} cy={12} r={3} />
    <path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round" />
  </svg>
);

export const SearchBar: React.FC<{ spin?: number }> = ({ spin = 0 }) => (
  <div
    style={{
      borderRadius: 12,
      border: `1px solid ${zinc[200]}`,
      background: 'rgba(255,255,255,0.97)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
    }}
  >
    <SearchIcon />
    <span style={{ ...text(16, 400, zinc[500]), flex: 1 }}>¿Dónde quieres aparcar?</span>
    <div style={{ width: 36, height: 36, borderRadius: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LocateIcon spin={spin} />
    </div>
  </div>
);

export type Layers = { garages: boolean; reports: boolean; ora: boolean; cameras: boolean };

const CHIPS: { key: keyof Layers; label: string; symbol: string }[] = [
  { key: 'garages', label: 'Garajes', symbol: 'P' },
  { key: 'reports', label: 'Reportes', symbol: '●' },
  { key: 'ora', label: 'ORA', symbol: '▦' },
  { key: 'cameras', label: 'Cámaras', symbol: 'C' },
];

export const LayerChips: React.FC<{ layers: Layers; showLabel?: boolean; pressed?: keyof Layers; press?: number }> = ({
  layers,
  showLabel = false,
  pressed,
  press = 0,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      border: `1px solid ${zinc[200]}`,
      background: 'rgba(255,255,255,0.95)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      padding: '6px 8px',
    }}
  >
    {showLabel && <span style={{ ...text(11, 500, zinc[500]), paddingRight: 2 }}>Capas</span>}
    {CHIPS.map((chip) => {
      const active = layers[chip.key];
      const k = chip.key === pressed ? 1 - press * 0.08 : 1;
      return (
        <span
          key={chip.key}
          style={{
            ...text(11, 500, active ? '#fff' : zinc[700], 1.3),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            border: `1px solid ${active ? em[600] : zinc[300]}`,
            background: active ? em[600] : '#fff',
            padding: '4px 8px',
            transform: `scale(${k})`,
          }}
        >
          <span style={{ fontWeight: 600 }}>{chip.symbol}</span>
          {chip.label}
        </span>
      );
    })}
  </div>
);

export const SheetHeader: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div style={{ borderBottom: `1px solid ${zinc[200]}`, padding: '0 12px 8px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, opacity }}>
      <span style={{ ...text(18, 600, zinc[900], 28 / 18), letterSpacing: '-0.025em' }}>Aparcat</span>
      <span style={{ ...text(11, 500, zinc[600]), background: zinc[100], borderRadius: 999, padding: '2px 8px' }}>Valencia</span>
    </div>
  </div>
);

const Button: React.FC<{ label: string; press?: number; style?: React.CSSProperties; size?: number }> = ({
  label,
  press = 0,
  style,
  size = 14,
}) => (
  <div
    style={{
      ...text(size, 600, '#fff', 20 / 14),
      textAlign: 'center',
      borderRadius: 8,
      background: press > 0 ? em[700] : em[600],
      padding: '8px 12px',
      transform: `scale(${1 - press * 0.04})`,
      ...style,
    }}
  >
    {label}
  </div>
);

export const IdleCard: React.FC<{ locating?: boolean; press?: number }> = ({ locating = false, press = 0 }) => (
  <div style={{ borderRadius: 12, border: `1px solid ${zinc[200]}`, background: zinc[50], padding: 16 }}>
    <div style={text(14, 600, zinc[900], 20 / 14)}>Encuentra aparcamiento libre cerca</div>
    <div style={{ ...text(12, 400, zinc[600], 1.375), marginTop: 4 }}>
      Te mostramos los garajes públicos con plazas libres más cerca del punto que elijas.
    </div>
    <Button label={locating ? 'Obteniendo ubicación…' : 'Buscar cerca de mí'} press={press} style={{ marginTop: 12, opacity: locating ? 0.6 : 1 }} />
    <div style={{ ...text(11, 400, zinc[500]), textAlign: 'center', marginTop: 8 }}>
      o busca una dirección arriba, o toca cualquier punto del mapa
    </div>
  </div>
);

export const Summary: React.FC<{ shown: number; radius: number }> = ({ shown, radius }) => (
  <div style={{ ...text(12, 400, zinc[500]) }}>
    <span style={{ fontWeight: 500, color: zinc[700] }}>{shown === 1 ? 'La mejor opción' : `Las ${shown} mejores opciones`}</span> a menos de {radius} m
  </div>
);

export type CandidateView = { name: string; free: number; walk: number; distance: number; age: number };

export const CandidateCard: React.FC<{ c: CandidateView; rank: number; selected?: boolean; free?: number }> = ({
  c: cand,
  rank,
  selected = false,
  free,
}) => (
  <div
    style={{
      borderRadius: 12,
      border: `1px solid ${selected ? em[500] : zinc[200]}`,
      boxShadow: selected ? `0 0 0 1px rgba(16,185,129,0.3)` : undefined,
      background: '#fff',
      overflow: 'hidden',
    }}
  >
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
      <span
        style={{
          ...text(12, 600, selected ? '#fff' : zinc[600], 1),
          width: 24,
          height: 24,
          borderRadius: 24,
          flexShrink: 0,
          marginTop: 2,
          background: selected ? em[600] : zinc[100],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span style={text(14, 600, zinc[900], 20 / 14)}>{formatPlaceName(cand.name)}</span>
          <span
            style={{
              ...text(12, 500, em[700], 1.4),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '2px 10px',
              background: em[50],
              boxShadow: 'inset 0 0 0 1px rgba(5,150,105,0.2)',
              flexShrink: 0,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 6, background: em[600] }} />
            {free ?? cand.free} plazas libres
          </span>
        </div>
        <div style={{ ...text(12, 400, zinc[500]), marginTop: 2 }}>
          Garaje público · <span style={{ color: zinc[700] }}>{cand.walk} min a pie</span> ({cand.distance} m)
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${zinc[100]}`, padding: '6px 12px 6px 44px' }}>
      <span style={text(11, 400, em[700])}>En vivo · {cand.age <= 1 ? 'ahora' : `hace ${cand.age} min`}</span>
      <span
        style={{
          ...text(12, 600, em[700], 1.4),
          borderRadius: 6,
          border: `1px solid ${em[200]}`,
          background: em[50],
          padding: '3px 10px',
        }}
      >
        Cómo llegar ↗
      </span>
    </div>
  </div>
);

export const ReportBox: React.FC<{ status?: number; press?: number }> = ({ status = 0, press = 0 }) => (
  <div style={{ borderRadius: 12, border: `1px solid ${zinc[200]}`, background: zinc[50], padding: 12 }}>
    <div style={text(12, 600, zinc[900])}>Avisa a otros conductores</div>
    <div style={{ ...text(11, 400, zinc[500], 1.375), marginTop: 2 }}>
      Se marca en el punto elegido del mapa · anónimo · caduca en 15 min
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
      <Button label="He dejado un hueco" press={press} size={12} style={{ padding: '8px 10px' }} />
      <div
        style={{
          ...text(12, 600, zinc[700], 20 / 14),
          textAlign: 'center',
          borderRadius: 8,
          border: `1px solid ${zinc[300]}`,
          background: '#fff',
          padding: '8px 10px',
        }}
      >
        Está lleno
      </div>
    </div>
    <div style={{ ...text(11, 500, em[700]), marginTop: 8 * status, height: 15 * status, opacity: status, overflow: 'hidden' }}>
      Hueco reportado. Gracias por avisar.
    </div>
  </div>
);

export const SheetFooter = () => (
  <div style={{ borderTop: `1px solid ${zinc[200]}`, padding: '8px 12px', ...text(10, 400, zinc[500], 1.6) }}>
    Predicción orientativa · no reserva · Datos: <span style={{ textDecoration: 'underline' }}>Ajuntament de València</span> (CC BY 4.0) · Mapa: MapTiler © OpenStreetMap
  </div>
);

// The map fills the screen below the status bar; the results panel is a sheet
// over it that can be dragged (src/components/parking/BottomSheet.tsx).
export const MAP_H = PHONE.h - PHONE.status;
export const SHEET = {
  peek: 76,
  half: Math.round(MAP_H * 0.45),
  full: Math.round(MAP_H * 0.9),
  grabber: 24,
};

// Where the sheet's title sits, for things that fly into it.
export const sheetTitleTop = (sheetH: number) => PHONE.h - sheetH + SHEET.grabber;

export const AppLayout: React.FC<{
  map: React.ReactNode;
  overlay?: React.ReactNode;
  sheet: React.ReactNode;
  scroll?: number;
  headerOpacity?: number;
  sheetH?: number;
  grabberPress?: number;
}> = ({ map, overlay, sheet, scroll = 0, headerOpacity = 1, sheetH = SHEET.half, grabberPress = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
    <div style={{ position: 'absolute', left: 0, top: PHONE.status, width: PHONE.w, height: MAP_H, overflow: 'hidden' }}>
      {map}
      <div style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        {overlay}
      </div>
    </div>
    <div
      style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: PHONE.w,
        height: sheetH,
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -6px 24px rgba(24,24,27,0.14)',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div style={{ height: SHEET.grabber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 6, borderRadius: 6, background: grabberPress > 0 ? zinc[500] : zinc[300], transform: `scale(${1 + 0.15 * grabberPress})` }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, background: '#fff' }}>
        <SheetHeader opacity={headerOpacity} />
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, transform: `translateY(${-scroll}px)` }}>{sheet}</div>
    </div>
  </div>
);

// A MapLibre popup as the app styles it (white card, small tip below).
export const Popup: React.FC<{ width: number; children: React.ReactNode; k?: number }> = ({ width, children, k = 1 }) => (
  <div style={{ position: 'relative', width, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))' }}>
    <div style={{ background: '#fff', borderRadius: 8 * k, padding: `${12 * k}px ${14 * k}px ${14 * k}px` }}>{children}</div>
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: -10 * k,
        marginLeft: -10 * k,
        width: 0,
        height: 0,
        borderLeft: `${10 * k}px solid transparent`,
        borderRight: `${10 * k}px solid transparent`,
        borderTop: `${10 * k}px solid #fff`,
      }}
    />
  </div>
);

export const popupText = {
  title: (k: number) => text(14 * k, 700, zinc[900], 1.3),
  meta: (k: number) => ({ ...text(12 * k, 400, zinc[500], 1.4), marginTop: 4 * k }),
  link: (k: number) => ({ ...text(12 * k, 500, em[700], 1.4), marginTop: 4 * k, textDecoration: 'underline', textUnderlineOffset: 2 * k }),
};

export const Mono: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <span style={{ fontFamily: mono, ...style }}>{children}</span>
);
