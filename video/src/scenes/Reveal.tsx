import React from 'react';
import { AbsoluteFill } from 'remotion';
import { c, sans, mono, useLayout } from '../look';
import { Cam, camFor, data, mixCam, places, project } from '../geo';
import { M, T, useStory } from '../timing';
import { ArtsSkyline } from '../ui/Art';
import { AppLayout, CandidateCard, IdleCard, LayerChips, MAP_H, SearchBar, SHEET, sheetTitleTop, Summary } from '../ui/AppUI';
import { measure } from '../ui/Base';
import { PinBadge, Wordmark } from '../ui/Brand';
import { MapView, OraLayer, OriginDot, PinP, toneColor } from '../ui/MapView';
import { enter, glide, leave, lerp, pop, ramp, rise } from '../ui/motion';
import { Phone, PHONE, PhonePose, phonePoint } from '../ui/Phone';
import { Tap } from '../ui/Tap';
import { DOT } from './Montage';

// 0:08 The red dot flips into the green P and opens the light. The name
// appears, flies into the app's header and the phone shows a real search.

const WORD = 128; // lockup title size
const PIN = 120;
const PIN_GAP = 34;

export const phonePoseAt = (g: number): PhonePose => {
  const up = glide(g, M.phoneIn, 28);
  const tilt = glide(g, 332, 18) * (1 - glide(g, M.breakout - 18, 14));
  return { x: 540, y: lerp(up, 1420, 330), s: 1.42, ry: -9 * tilt, rx: 5 * tilt };
};

const [appX, appY] = project(...places.appCenter);
export const ORIGIN = project(...places.alameda);
// The map fills the screen; the results panel covers its lower part, so the
// camera frames things in the part above it.
const IDLE: Cam = camFor(appX, appY, PHONE.w / 2, 230, PHONE.w, MAP_H, 0.55);

// After locating: the chosen point and both nearby garages, framed below the
// search bar and the layer chips.
const nearbyGarages = data.nearby.candidates.map((cand) => data.garages.find((gar) => gar.name === cand.name.trim()));
const box = [ORIGIN, ...nearbyGarages.filter((x) => x !== undefined).map((x) => [x.x, x.y] as [number, number])];
const bx = (Math.min(...box.map((p) => p[0])) + Math.max(...box.map((p) => p[0]))) / 2;
const by = (Math.min(...box.map((p) => p[1])) + Math.max(...box.map((p) => p[1]))) / 2;
export const LOCATED: Cam = camFor(bx, by, PHONE.w / 2, 275, PHONE.w, MAP_H, 1.0);
export const SELECTED = nearbyGarages[0];

export const phoneCamAt = (g: number) => mixCam(IDLE, LOCATED, glide(g, M.tapSearch + 7, 24));

export const Reveal = () => {
  const g = useStory(T.reveal.from);
  const { W, H } = useLayout();

  // Dot -> green P, and the light coming in.
  const flip = ramp(g, M.drop, 6);
  const isGreen = flip >= 0.5;
  const grow = pop(g, M.drop + 3, 14);
  const dotSize = lerp(grow, 37, PIN);
  const wipe = enter(g, M.drop + 2, 16);

  // The lockup, measured so it sits centred.
  const wordW = measure('Aparcat', 600, WORD, 'Geist', -0.035);
  const pillFont = WORD * 0.32;
  const pillW = measure('Valencia', 500, pillFont) + pillFont * 1.44;
  const total = PIN + PIN_GAP + wordW + WORD * 0.11 + pillW;
  const startX = W / 2 - total / 2;
  const slide = glide(g, M.drop + 12, 14);
  const pinX = lerp(slide, DOT.x, startX + PIN / 2);
  const wordReveal = enter(g, M.drop + 22, 16);
  const pinOut = leave(g, 298, 10);

  // The name flies into the phone's header (same layout as the app).
  const pose = phonePoseAt(g);
  const fly = glide(g, M.phoneIn + 2, 26);
  const flying = g >= M.phoneIn + 2 && g < M.phoneIn + 28;
  const [hx, hy] = phonePoint(pose, 12, sheetTitleTop(SHEET.half));
  const headerSize = 18 * pose.s;
  const size = WORD * Math.pow(headerSize / WORD, fly);
  const wx = lerp(fly, startX + PIN + PIN_GAP, hx);
  const wy = lerp(fly, DOT.y - WORD / 2, hy + 5 * pose.s);

  const showLockup = g < M.phoneIn + 28;
  const light = g >= M.drop + 2;

  // The red heartbeat glow carried over from the montage, gone with the light.
  const glow = (1 - ramp(g, M.drop, 6)) * (1 + 0.1 * Math.sin((g - (M.push + 18)) * 0.9));

  return (
    <AbsoluteFill style={{ background: c.night }}>
      {glow > 0 && (
        <div
          style={{
            position: 'absolute',
            left: DOT.x - 330 * glow,
            top: DOT.y - 330 * glow,
            width: 660 * glow,
            height: 660 * glow,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(229,72,77,0.42) 0%, rgba(229,72,77,0.14) 45%, rgba(229,72,77,0) 100%)`,
          }}
        />
      )}
      {light && (
        <div
          style={{
            position: 'absolute',
            left: DOT.x - 1000 * wipe,
            top: DOT.y - 1000 * wipe,
            width: 2000 * wipe,
            height: 2000 * wipe,
            borderRadius: '50%',
            background: c.ground,
          }}
        />
      )}
      {g >= M.phoneIn && <Demo g={g} pose={pose} headerVisible={!flying && g >= M.phoneIn + 28} />}
      {showLockup && (
        <>
          <div
            style={{
              position: 'absolute',
              left: pinX - dotSize / 2,
              top: DOT.y - dotSize / 2,
              transform: `scaleX(${Math.abs(Math.cos(flip * Math.PI))}) scale(${1 - pinOut})`,
              opacity: 1 - pinOut,
            }}
          >
            {isGreen ? (
              <PinBadge size={dotSize} style={{ boxShadow: grow > 0.5 ? undefined : 'none' }} />
            ) : (
              <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: c.red }} />
            )}
          </div>
          {g >= M.drop + 22 && (
            <div
              style={{
                position: 'absolute',
                left: wx,
                top: wy,
                clipPath: fly > 0 ? undefined : `inset(-20% ${(1 - wordReveal) * 100}% -20% 0)`,
                transform: `translateX(${(1 - wordReveal) * -40}px)`,
              }}
            >
              <Wordmark
                size={size}
                pillRatio={lerp(fly, 0.32, 11 / 18)}
                gapRatio={lerp(fly, 0.11, 8 / 18)}
                pillScale={pop(g, M.drop + 28, 12)}
              />
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: W,
              top: DOT.y + 104,
              textAlign: 'center',
              fontFamily: sans,
              fontSize: 40,
              color: c.ink2,
              ...rise(g, M.drop + 34, 294),
            }}
          >
            <span style={{ fontWeight: 600, color: c.ink }}>aparcat</span>
            <span style={{ fontFamily: mono, fontSize: 30, color: c.faint }}> (val.) </span>
            <span>aparcado</span>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

const Demo: React.FC<{ g: number; pose: PhonePose; headerVisible: boolean }> = ({ g, pose, headerVisible }) => {
  const { W } = useLayout();
  const out = enter(g, M.breakout - 2, 10);
  const cam = phoneCamAt(g);
  const locating = g >= M.tapSearch + 2 && g < M.results;
  const results = g >= M.results;
  const press = g >= M.tapSearch && g < M.tapSearch + 6 ? 1 : 0;
  const cands = data.nearby.candidates;
  const sheetH = sheetAt(g);
  const dragging = g >= M.sheetDown && g < M.sheetDown + 18;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 62%, rgba(16,185,129,0.16), rgba(16,185,129,0) 46%)`,
          opacity: enter(g, M.phoneIn, 30),
        }}
      />
      <svg width={1080} height={1350} style={{ position: 'absolute', left: 0, top: 0 }}>
        <g transform="translate(0 1290)">
          <ArtsSkyline draw={enter(g, M.phoneIn + 6, 46)} color="#D4D4D8" width={4} accent="#A7F3D0" />
        </g>
      </svg>
      <Caption g={g} out={out} />
      <Phone pose={pose}>
        <AppLayout
          headerOpacity={headerVisible ? 1 : 0}
          sheetH={sheetH}
          grabberPress={dragging ? 1 : 0}
          map={
            <MapView
              cam={cam}
              w={PHONE.w}
              h={MAP_H}
              labels={0.9}
              labelSize={9}
              inMap={(ctx) => <OraLayer ctx={ctx} width={1.3} opacity={0.85} />}
              overlay={({ toScreen }) => (
                <g>
                  {SELECTED && g >= M.results + 3 && (
                    <circle
                      cx={toScreen(SELECTED.x, SELECTED.y)[0]}
                      cy={toScreen(SELECTED.x, SELECTED.y)[1]}
                      r={15 * pop(g, M.results + 3, 10)}
                      fill="none"
                      stroke={c.ink}
                      strokeWidth={3}
                    />
                  )}
                  {data.garages.map((gar) => {
                    const [x, y] = toScreen(gar.x, gar.y);
                    return <PinP key={gar.id} x={x} y={y} r={9} color={toneColor(gar.free)} />;
                  })}
                  <OriginDot
                    x={toScreen(ORIGIN[0], ORIGIN[1])[0]}
                    y={toScreen(ORIGIN[0], ORIGIN[1])[1]}
                    appear={pop(g, M.results - 6, 12)}
                    pulse={(Math.max(0, g - M.results) % 30) / 30}
                  />
                </g>
              )}
            />
          }
          overlay={
            <>
              <div style={{ alignSelf: 'stretch', opacity: 1 - leave(g, M.breakout - 10, 8) }}>
                <SearchBar spin={locating ? (g - M.tapSearch) / 20 : 0} />
              </div>
              <div style={{ opacity: 1 - leave(g, M.breakout - 10, 8) }}>
                <LayerChips layers={{ garages: true, reports: true, ora: true, cameras: false }} />
              </div>
            </>
          }
          sheet={
            results ? (
              <>
                <div style={rise(g, M.results, undefined, 16)}>
                  <Summary shown={cands.length} radius={data.nearby.radius} />
                </div>
                {cands.map((cand, i) => (
                  <div key={cand.name} style={rise(g, M.results + 3 + i * 4, undefined, 24)}>
                    <CandidateCard c={cand} rank={i + 1} selected={i === 0} />
                  </div>
                ))}
              </>
            ) : (
              <IdleCard locating={locating} press={press} />
            )
          }
        />
        <div style={{ position: 'absolute', inset: 0 }}>
          <Tap frame={g} at={M.tapSearch} from={[318, 820]} to={[195, 662]} enterAt={328} leaveAt={352} />
          <DragFinger g={g} sheetH={sheetH} />
        </div>
      </Phone>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 0 }} />
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ g: number; out: number }> = ({ g, out }) => {
  const words: [string, number, string][] = [
    ['Abre.', 330, c.ink],
    ['Toca.', M.tapSearch, c.ink],
    ['Listo.', M.results + 3, c.accent],
  ];
  return (
    <div style={{ position: 'absolute', left: 0, width: 1080, top: 104, textAlign: 'center', opacity: 1 - out }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 26 }}>
        {words.map(([w, at, color]) => {
          const t = enter(g, at, 12);
          return (
            <span
              key={w}
              style={{
                fontFamily: sans,
                fontWeight: 900,
                fontSize: 96,
                letterSpacing: '-0.04em',
                color,
                opacity: t,
                transform: `translateY(${(1 - t) * 34}px) scale(${0.9 + 0.1 * t})`,
                display: 'inline-block',
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 36, color: c.muted, marginTop: 10, ...rise(g, M.results + 10) }}>
        Sin descargas. Sin registro.
      </div>
    </div>
  );
};

// The finger pulls the results panel down to the peek, like in Google Maps,
// and the map takes the screen.
export const sheetAt = (g: number) => lerp(glide(g, M.sheetDown + 3, 14), SHEET.half, SHEET.peek);

const DragFinger: React.FC<{ g: number; sheetH: number }> = ({ g, sheetH }) => {
  const start = M.sheetDown - 8;
  const end = M.sheetDown + 20;
  if (g < start || g > end + 8) return null;
  const y = PHONE.h - sheetH + SHEET.grabber / 2;
  const pressed = g >= M.sheetDown && g < M.sheetDown + 18;
  const opacity = enter(g, start, 6) * (1 - leave(g, end, 8));
  return (
    <div
      style={{
        position: 'absolute',
        left: PHONE.w / 2 - 22,
        top: y - 22,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'rgba(24,24,27,0.28)',
        border: '3px solid rgba(255,255,255,0.95)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        transform: `scale(${pressed ? 0.82 : 1})`,
        opacity,
      }}
    />
  );
};
