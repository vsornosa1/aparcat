import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { c, mono, ora, sans, useLayout } from '../look';
import { Cam, camFor, data, mixCam } from '../geo';
import { M, T, useStory } from '../timing';
import { LayerChips, MAP_H, Popup, popupText, SHEET } from '../ui/AppUI';
import { measure } from '../ui/Base';
import { CameraPin, MapView, OraLayer, OriginDot, PinP, toneColor } from '../ui/MapView';
import { countUp, enter, glide, leave, lerp, pop, ramp, rise } from '../ui/motion';
import { PHONE, phonePoint } from '../ui/Phone';
import { Tap } from '../ui/Tap';
import { LOCATED, ORIGIN, phonePoseAt, SELECTED } from './Reveal';

// 0:14 The map breaks out of the phone and becomes the whole frame: the live
// garages, the ORA zones painting in, then the 679 traffic cameras, a zoom to
// one on Blasco Ibáñez and its popup with the link to the official viewer.

const centreOf = (pts: number[][]) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};

// Where the phone's map sat on screen when the window starts to open.
const pose = phonePoseAt(M.breakout);
const [winL, winT] = phonePoint(pose, 0, PHONE.status);
const [winR, winB] = phonePoint(pose, PHONE.w, PHONE.h - SHEET.peek);
const mapCentre = phonePoint(pose, PHONE.w / 2, PHONE.status + MAP_H / 2);

const garageCentre = centreOf(data.garages.map((g) => [g.x, g.y]));
const oraCentre = [garageCentre[0] - 60, garageCentre[1] + 120];
const camPoint = [data.camera.x, data.camera.y];

// Each framing keeps drifting slowly while it holds, so the map never freezes;
// the next move starts from wherever the drift got to.
const camsAt = (W: number, H: number) => {
  const k0 = camFor(LOCATED.x, LOCATED.y, mapCentre[0], mapCentre[1], W, H, LOCATED.z * pose.s);
  const hold = (target: number[], sy: number, z: number, from: number, to: number, grow: number) => (g: number) =>
    camFor(target[0], target[1], W / 2, sy, W, H, z * (1 + grow * ramp(g, from, to - from)));
  const garages = hold(garageCentre, 840, 0.39, 472, M.ora + 6, 0.05);
  const zones = hold(oraCentre, 850, 0.6, M.ora + 42, M.cameras + 20, 0.05);
  const city = hold([garageCentre[0], garageCentre[1] - 60], 870, 0.3, M.cameras + 56, M.zoomCamera, 0.02);
  const camera = hold(camPoint, 960, 2.4, M.zoomCamera + 38, 860, 0.05);
  return (g: number): Cam => {
    if (g < 432) return k0;
    if (g < M.ora + 6) return mixCam(k0, garages(g), glide(g, 432, 40));
    if (g < M.cameras + 20) return mixCam(garages(g), zones(g), glide(g, M.ora + 6, 36));
    if (g < M.zoomCamera) return mixCam(zones(g), city(g), glide(g, M.cameras + 20, 36));
    return mixCam(city(g), camera(g), glide(g, M.zoomCamera, 38));
  };
};

// Which side each garage label goes, so close garages do not collide.
const SIDE: Record<string, 'left' | 'right' | 'up'> = {
  'CENTRE HISTÒRIC-MERCAT CENTRAL': 'left',
  'AVINGUDA DE L’OEST': 'left',
  REINA: 'up',
};

export const City = () => {
  const g = useStory(T.city.from);
  const { W, H } = useLayout();
  const cam = camsAt(W, H)(g);
  const open = glide(g, M.breakout, 16);
  const clip = `inset(${lerp(open, winT, 0)}px ${lerp(open, W - winR, 0)}px ${lerp(open, H - winB, 0)}px ${lerp(open, winL, 0)}px)`;

  const garagesIn = g >= 444;
  const dimGarages = 1 - 0.45 * enter(g, M.ora, 12);
  const labelsOut = leave(g, M.ora, 10);
  const oraIn = g >= M.ora + 8;
  const oraR = lerp(enter(g, M.ora + 8, 46), 0, 2600);

  // Cameras: the chip is tapped, then the dots pop out from the centre.
  const camsOn = g >= M.tapCameras + 2;
  const sorted = React.useMemo(() => {
    const [cx, cy] = garageCentre;
    const dist = data.cameras.map(([x, y]) => Math.hypot(x - cx, y - cy));
    const max = Math.max(...dist);
    return data.cameras.map((p, i) => ({ p, d: dist[i] / max }));
  }, []);
  const camR = 4 + 3.4 * cam.z;
  const zoomed = g >= M.zoomCamera + 20;

  // The popup of the camera on Blasco Ibáñez, and its link.
  const popupAt = M.zoomCamera + 36;
  const k = 2;
  const popupW = 300 * k;

  return (
    <AbsoluteFill style={{ clipPath: open < 1 ? clip : undefined }}>
      <MapView
        cam={cam}
        w={W}
        h={H}
        labels={0.9 * (1 - leave(g, M.zoomCamera, 12))}
        labelSize={22}
        inMap={(ctx) =>
          oraIn ? (
            <OraLayer
              ctx={ctx}
              reveal={{ x: oraCentre[0], y: oraCentre[1], r: oraR }}
              width={2.6}
              fill={0.45}
              opacity={0.92 - 0.55 * enter(g, M.cameras + 8, 16)}
            />
          ) : null
        }
        overlay={({ toScreen, z }) => (
          <g>
            {camsOn &&
              sorted.map(({ p, d }, i) => {
                const at = M.tapCameras + 4 + d * 46;
                const s = pop(g, at, 8);
                if (s <= 0) return null;
                const [x, y] = toScreen(p[0], p[1]);
                if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return null;
                const ring = enter(g, at, 14);
                const focus = zoomed && p[0] === data.camera.x && p[1] === data.camera.y;
                return (
                  <g key={i}>
                    {ring < 1 && <circle cx={x} cy={y} r={camR * (1 + ring * 2.6)} fill="none" stroke={c.camera} strokeWidth={2} opacity={0.5 * (1 - ring)} />}
                    {focus && <circle cx={x} cy={y} r={camR * (1.8 + 0.4 * Math.sin(g * 0.3))} fill={c.camera} opacity={0.18} />}
                    <CameraPin x={x} y={y} r={camR * (focus ? 1.25 : 1)} scale={s} glyph={camR > 10} />
                  </g>
                );
              })}
            {garagesIn &&
              data.garages.map((gar, i) => {
                const at = 444 + i * 4;
                const [x, y] = toScreen(gar.x, gar.y);
                const s = pop(g, at, 12);
                const r = lerp(Math.min(1, z / 0.6), 15, 22) * (g < 470 ? 1 : 1);
                return (
                  <g key={gar.id} opacity={dimGarages * (1 - leave(g, M.cameras + 10, 10) * 0.4)}>
                    <PinP x={x} y={y} r={r} color={toneColor(gar.free)} scale={s} />
                    {labelsOut < 1 && s > 0 && (
                      <GarageLabel x={x} y={y} r={r} side={SIDE[gar.name] ?? 'right'} free={countUp(g, at + 4, gar.free, 22)} opacity={enter(g, at + 4, 10) * (1 - labelsOut)} />
                    )}
                  </g>
                );
              })}
            {g < 470 && (
              <>
                {SELECTED && (
                  <circle cx={toScreen(SELECTED.x, SELECTED.y)[0]} cy={toScreen(SELECTED.x, SELECTED.y)[1]} r={15 * 1.42} fill="none" stroke={c.ink} strokeWidth={4} opacity={1 - enter(g, 440, 16)} />
                )}
                <g opacity={1 - enter(g, 440, 16)}>
                  {data.garages.map((gar) => (
                    <PinP key={gar.id} x={toScreen(gar.x, gar.y)[0]} y={toScreen(gar.x, gar.y)[1]} r={9 * 1.42} color={toneColor(gar.free)} />
                  ))}
                </g>
                <OriginDot x={toScreen(ORIGIN[0], ORIGIN[1])[0]} y={toScreen(ORIGIN[0], ORIGIN[1])[1]} k={1.42} appear={1 - enter(g, 446, 14)} />
              </>
            )}
          </g>
        )}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(248,250,252,0.97) 0%, rgba(248,250,252,0.94) 24%, rgba(248,250,252,0) 36%)',
          opacity: enter(g, M.breakout + 8, 12),
        }}
      />
      <GaragesCaption g={g} />
      <OraCaption g={g} />
      <CamerasCaption g={g} />
      {g >= M.zoomCamera + 30 && <CameraPopup g={g} at={popupAt} width={popupW} k={k} />}
    </AbsoluteFill>
  );
};

const GarageLabel: React.FC<{ x: number; y: number; r: number; side: 'left' | 'right' | 'up'; free: number; opacity: number }> = ({
  x,
  y,
  r,
  side,
  free,
  opacity,
}) => {
  const text = `${free} libres`;
  const w = measure(text, 600, 22) + 26;
  const lx = side === 'left' ? x - r - 10 - w : side === 'right' ? x + r + 10 : x - w / 2;
  const ly = side === 'up' ? y - r - 46 : y - 19;
  return (
    <g opacity={opacity}>
      <rect x={lx} y={ly} width={w} height={38} rx={19} fill="#fff" stroke="rgba(5,150,105,0.25)" strokeWidth={1.5} />
      <text x={lx + 13} y={ly + 27} fill={c.accentDark} style={{ fontFamily: sans, fontWeight: 600, fontSize: 22 }}>
        {text}
      </text>
    </g>
  );
};

const Headline: React.FC<{ children: React.ReactNode; style: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: sans,
      fontWeight: 800,
      fontSize: 70,
      lineHeight: 1.04,
      letterSpacing: '-0.035em',
      color: c.ink,
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

const Sub: React.FC<{ children: React.ReactNode; style: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 34, color: c.muted, textAlign: 'center', marginTop: 16, ...style }}>{children}</div>
);

const Block: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'absolute', left: 70, right: 70, top: 92 }}>{children}</div>
);

const GaragesCaption: React.FC<{ g: number }> = ({ g }) => {
  if (g > M.ora + 12) return null;
  const live = 0.5 + 0.5 * Math.sin(g * 0.35);
  return (
    <Block>
      <Headline style={rise(g, 436, M.ora - 14)}>
        Plazas libres en los
        <br />
        parkings públicos
      </Headline>
      <Sub style={rise(g, 446, M.ora - 14)}>
        <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 16, background: c.accent, marginRight: 12, boxShadow: `0 0 0 ${6 * live}px rgba(5,150,105,${0.25 * (1 - live)})` }} />
        En directo, con datos del Ajuntament
      </Sub>
    </Block>
  );
};

const LEGEND: [keyof typeof ora, string][] = [
  ['Azul', 'Azul · pago'],
  ['Naranja', 'Naranja · mixta'],
  ['Verde', 'Verde · residentes'],
  ['Amarillo', 'Amarillo · restringido'],
];

const OraCaption: React.FC<{ g: number }> = ({ g }) => {
  if (g < M.ora - 2 || g > M.cameras + 4) return null;
  const out = M.cameras - 14;
  return (
    <Block>
      <Headline style={rise(g, M.ora + 4, out)}>
        Las zonas ORA,
        <br />
        antes de llegar
      </Headline>
      <Sub style={rise(g, M.ora + 12, out)}>Sabes si toca pagar o si es de residentes.</Sub>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, margin: '26px auto 0', maxWidth: 640 }}>
        {LEGEND.map(([key, label], i) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              border: '1.5px solid #E4E4E7',
              borderRadius: 999,
              padding: '9px 18px',
              fontFamily: sans,
              fontWeight: 500,
              fontSize: 26,
              color: c.ink2,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              ...rise(g, M.ora + 22 + i * 4, out, 18),
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 16, background: ora[key] }} />
            {label}
          </div>
        ))}
      </div>
    </Block>
  );
};

const CamerasCaption: React.FC<{ g: number }> = ({ g }) => {
  if (g < M.cameras - 2) return null;
  const out = 818;
  const chipsK = 2.3;
  const chipsIn = enter(g, M.cameras + 6, 12) * (1 - leave(g, M.zoomCamera + 4, 10));
  const press = interpolate(g, [M.tapCameras - 1, M.tapCameras + 2, M.tapCameras + 7], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Locate the "Cámaras" chip inside the scaled chips bar (app CSS pixels).
  const chipW = (symbol: string, label: string) => 16 + 2 + measure(symbol, 600, 11) + 4 + measure(label, 500, 11);
  const widths = [chipW('P', 'Garajes'), chipW('●', 'Reportes'), chipW('▦', 'ORA'), chipW('C', 'Cámaras')];
  const barW = 16 + 2 + measure('Capas', 500, 11) + 2 + 6 + widths.reduce((a, b) => a + b, 0) + 6 * 3;
  const camChipCentre = barW - 8 - 1 - widths[3] / 2;
  const barLeft = 540 - (barW * chipsK) / 2;
  const tapX = barLeft + camChipCentre * chipsK;
  const tapY = 392 + 16 * chipsK;

  return (
    <>
      <Block>
        <Headline style={rise(g, M.cameras + 2, out)}>
          Las cámaras de tráfico
          <br />
          de València, en tu mapa
        </Headline>
        <Sub style={rise(g, M.cameras + 12, out)}>Mira cómo está el tráfico antes de salir.</Sub>
      </Block>
      <div
        style={{
          position: 'absolute',
          left: barLeft,
          top: 392,
          transformOrigin: 'top left',
          transform: `scale(${chipsK}) translateY(${(1 - chipsIn) * 10}px)`,
          opacity: chipsIn,
        }}
      >
        <LayerChips layers={{ garages: true, reports: true, ora: true, cameras: g >= M.tapCameras + 2 }} showLabel pressed="cameras" press={press} />
      </div>
      <Tap frame={g} at={M.tapCameras} from={[tapX + 160, tapY + 260]} to={[tapX, tapY]} enterAt={M.tapCameras - 13} leaveAt={M.tapCameras + 12} size={60} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 380,
          background: 'linear-gradient(0deg, rgba(248,250,252,0.95) 0%, rgba(248,250,252,0.8) 45%, rgba(248,250,252,0) 100%)',
          opacity: enter(g, M.tapCameras + 14, 12) * (1 - leave(g, M.zoomCamera + 2, 14)),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 70,
          bottom: 84,
          ...rise(g, M.tapCameras + 18, M.zoomCamera + 2),
        }}
      >
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 132, lineHeight: 1, letterSpacing: '-0.05em', color: c.ink }}>
          {countUp(g, M.tapCameras + 10, data.cameras.length, 40)}
        </div>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 30, color: c.ink2, marginTop: 6 }}>cámaras de tráfico en el mapa</div>
      </div>
    </>
  );
};

const CameraPopup: React.FC<{ g: number; at: number; width: number; k: number }> = ({ g, at, width, k }) => {
  const s = pop(g, at, 12);
  const press = g >= M.tapViewer && g < M.tapViewer + 6;
  const linkW = measure('Abrir el visor oficial', 500, 12 * k);
  const pinY = 960;
  const linkX = 540 - width / 2 + 14 * k + linkW / 2;
  const linkY = pinY - 40 - 14 * k - 8.4 * k;
  const hide = enter(g, M.tapViewer + 3, 6);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 540 - width / 2,
          bottom: 1350 - (pinY - 40),
          transformOrigin: '50% 100%',
          transform: `scale(${s})`,
          opacity: Math.min(1, s * 1.5) * (1 - hide),
        }}
      >
        <Popup width={width} k={k}>
          <div style={popupText.title(k)}>{data.camera.title}</div>
          <div style={popupText.meta(k)}>Solo ubicación · sin imágenes en Aparcat</div>
          <div style={{ ...popupText.link(k), background: press ? 'rgba(5,150,105,0.12)' : undefined, display: 'inline-block' }}>Abrir el visor oficial</div>
        </Popup>
      </div>
      <Tap frame={g} at={M.tapViewer} from={[linkX + 200, linkY + 240]} to={[linkX, linkY]} enterAt={M.tapViewer - 14} leaveAt={M.tapViewer + 8} size={60} />
      {g >= M.tapViewer + 3 && <ViewerCard g={g} from={[linkX - linkW / 2, linkY - 9 * k, linkW, 18 * k]} />}
    </>
  );
};

// The official viewer opens as a browser card, and we cut before any image.
export const VIEWER_TARGET = { x: 75.5, y: 344.3, w: 429, h: 928.4, r: 56 };

const ViewerCard: React.FC<{ g: number; from: [number, number, number, number] }> = ({ g, from }) => {
  const t = enter(g, M.tapViewer + 3, 24);
  const x = lerp(t, from[0], VIEWER_TARGET.x);
  const y = lerp(t, from[1], VIEWER_TARGET.y);
  const w = lerp(t, from[2], VIEWER_TARGET.w);
  const h = lerp(t, from[3], VIEWER_TARGET.h);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: lerp(t, 6, VIEWER_TARGET.r),
        background: '#fff',
        boxShadow: `0 30px 80px rgba(15,23,42,${0.3 * t})`,
        overflow: 'hidden',
      }}
    >
      <ViewerFace g={g} opacity={t} />
    </div>
  );
};

// The browser chrome and spinner inside the viewer card (also used by the
// next scene, which takes the card over).
export const ViewerFace: React.FC<{ g: number; opacity: number }> = ({ g, opacity: t }) => {
  const load = enter(g, M.tapViewer + 14, 30);
  return (
    <>
      <div style={{ height: 120, background: '#F4F4F5', borderBottom: '1px solid #E4E4E7', opacity: t, display: 'flex', alignItems: 'flex-end', padding: '0 22px 18px' }}>
        <div style={{ flex: 1, height: 52, borderRadius: 14, background: '#fff', border: '1px solid #E4E4E7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: sans, fontSize: 24, color: c.ink2 }}>
          <svg width={16} height={20} viewBox="0 0 16 20">
            <rect x={1} y={8} width={14} height={11} rx={2} fill={c.ink2} />
            <path d="M4 8 V5 a4 4 0 0 1 8 0 V8" fill="none" stroke={c.ink2} strokeWidth={2} />
          </svg>
          camaras.valencia.es
        </div>
      </div>
      <div style={{ height: 5, width: `${load * 100}%`, background: c.accent, opacity: t }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 56, height: 56, marginLeft: -28, marginTop: -28, opacity: t }}>
        <svg width={56} height={56} viewBox="0 0 56 56" style={{ transform: `rotate(${g * 14}deg)` }}>
          <circle cx={28} cy={28} r={22} fill="none" stroke="#E4E4E7" strokeWidth={6} />
          <path d="M28 6 a22 22 0 0 1 22 22" fill="none" stroke={c.muted} strokeWidth={6} strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
};
