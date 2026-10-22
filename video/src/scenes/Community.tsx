import React from 'react';
import { AbsoluteFill } from 'remotion';
import { c, mono, sans, useLayout } from '../look';
import { camFor, project } from '../geo';
import { M, T, useStory } from '../timing';
import { AppLayout, MAP_H, Popup, popupText, ReportBox, SHEET } from '../ui/AppUI';
import { MapView, OraLayer, OriginDot } from '../ui/MapView';
import { enter, glide, leave, lerp, pop, rise } from '../ui/motion';
import { Phone, PHONE, PhonePose, phonePoint } from '../ui/Phone';
import { Tap } from '../ui/Tap';
import { VIEWER_TARGET, ViewerFace } from './City';

// 0:28 Two phones in Benimaclet. One person leaves and taps "He dejado un
// hueco"; the spot appears on the other phone for 15 minutes and someone
// else parks there. Real street: Carrer del Reverend Rafael Tramoyeres.

const SPOT = project(-0.36005, 39.48478);
const DRIVE_FROM = project(-0.361939, 39.485335);

const A: PhonePose = { x: 290, y: 330, s: 1.1 };
const B0: PhonePose = { x: 790, y: 330, s: 1.1 };

// "He dejado un hueco" in A's panel (at half height), and the spot on B's map
// (B keeps its panel down, so the map has the whole screen).
const A_BUTTON: [number, number] = [108.5, 646];
const B_PIN: [number, number] = [195, PHONE.status + 330];

// Stage camera: zoom `u` (0..1) towards a focus point, pulling it 60% of the
// way to the middle of the frame.
const stage = (u: number, focus: [number, number], scale = 0.5) => {
  const S = 1 + scale * u;
  const tx = focus[0] + (540 - focus[0]) * 0.6 * Math.min(1, u);
  const ty = focus[1] + (780 - focus[1]) * 0.6 * Math.min(1, u);
  return { S, tx, ty, focus };
};

export const PIN_EXIT = (() => {
  const pin = phonePoint(B0, ...B_PIN);
  return [pin[0] + (540 - pin[0]) * 0.6, pin[1] + (780 - pin[1]) * 0.6] as [number, number];
})();

export const Community = () => {
  const g = useStory(T.community.from);
  const { W, H } = useLayout();

  const bSlide = glide(g, M.community + 4, 22);
  const B: PhonePose = { ...B0, x: lerp(bSlide, 1500, B0.x) };
  const appIn = enter(g, M.community + 4, 12);

  const aBtn = phonePoint(A, ...A_BUTTON);
  const bPin = phonePoint(B0, ...B_PIN);

  // Where the stage camera looks.
  const zoomA = glide(g, 850, 16) * (1 - glide(g, 880, 16));
  const zoomB = glide(g, M.pinLands + 4, 16);
  const final = enter(g, 992, 24);
  const cam =
    g < M.pinLands
      ? stage(zoomA, aBtn)
      : stage(zoomB + final * 18, bPin);
  const transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.S}) translate(${-cam.focus[0]}px, ${-cam.focus[1]}px)`;

  // The spot travelling from one phone to the other.
  const fly = glide(g, 884, 18);
  const flyX = lerp(fly, aBtn[0], bPin[0]);
  const flyY = lerp(fly, aBtn[1], bPin[1]) - Math.sin(fly * Math.PI) * 260;
  const landed = g >= M.pinLands;

  // Someone else drives to the spot and parks.
  const drive = glide(g, 936, 40);
  const parked = g >= M.parks;

  const aCam = camFor(SPOT[0], SPOT[1], PHONE.w / 2, 260, PHONE.w, MAP_H, 1.5);
  const bCam = camFor(SPOT[0], SPOT[1], B_PIN[0], B_PIN[1] - PHONE.status, PHONE.w, MAP_H, 1.8);
  const backdrop = camFor(SPOT[0], SPOT[1], 540, 760, W, H, 1.1);

  const remaining = Math.max(0, 15 * 60 - Math.floor(Math.max(0, g - M.pinLands) / 30));
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  // The viewer card of the previous scene is still underneath: the ground
  // fades in around it while the app takes over the card.
  const ground = enter(g, M.community - 2, 14);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: c.ground, opacity: ground }} />
      <AbsoluteFill style={{ opacity: 0.22 * ground }}>
        <MapView cam={backdrop} w={W} h={H} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transform, transformOrigin: '0 0' }}>
        <div
          style={{
            position: 'absolute',
            left: VIEWER_TARGET.x,
            top: VIEWER_TARGET.y,
            width: VIEWER_TARGET.w,
            height: VIEWER_TARGET.h,
            borderRadius: VIEWER_TARGET.r,
            background: '#fff',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(15,23,42,0.3)',
            opacity: 1 - appIn,
          }}
        >
          <ViewerFace g={g} opacity={1} />
        </div>
        <Phone pose={A} time="20:44" opacity={appIn} bezelOpacity={appIn}>
          <AppLayout
            map={
              <MapView
                cam={aCam}
                w={PHONE.w}
                h={MAP_H}
                labels={0.9}
                labelSize={9}
                inMap={(ctx) => <OraLayer ctx={ctx} width={1.3} opacity={0.85} />}
                overlay={({ toScreen }) => <OriginDot x={toScreen(...SPOT)[0]} y={toScreen(...SPOT)[1]} />}
              />
            }
            sheet={<ReportBox status={enter(g, M.tapReport + 3, 8)} press={g >= M.tapReport && g < M.tapReport + 6 ? 1 : 0} />}
          />
          <div style={{ position: 'absolute', inset: 0 }}>
            <Tap frame={g} at={M.tapReport} from={[260, 760]} to={A_BUTTON} enterAt={856} leaveAt={884} />
          </div>
        </Phone>
        <Phone pose={B} time="20:44">
          <AppLayout
            map={
              <MapView
                cam={bCam}
                w={PHONE.w}
                h={MAP_H}
                labels={0.9}
                labelSize={9}
                inMap={(ctx) => <OraLayer ctx={ctx} width={1.3} opacity={0.85} />}
                overlay={({ toScreen }) => {
                  const [px, py] = toScreen(...SPOT);
                  const [cx, cy] = toScreen(lerp(drive, DRIVE_FROM[0], SPOT[0]), lerp(drive, DRIVE_FROM[1], SPOT[1]));
                  const angle = (Math.atan2(py - toScreen(...DRIVE_FROM)[1], px - toScreen(...DRIVE_FROM)[0]) * 180) / Math.PI;
                  const ripple = (Math.max(0, g - M.pinLands) % 36) / 36;
                  return (
                    <g>
                      {landed && !parked && (
                        <circle cx={px} cy={py} r={8 + ripple * 26} fill="none" stroke={c.report} strokeWidth={2.5} opacity={1 - ripple} />
                      )}
                      {landed && (
                        <g transform={`translate(${px} ${py}) scale(${pop(g, M.pinLands, 10)})`}>
                          <circle r={7.5} fill={parked ? c.accent : c.report} stroke="#fff" strokeWidth={2.5} />
                          {parked && <path d="M-3.4 0.2 L-0.8 2.8 L3.8 -2.4" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                        </g>
                      )}
                      {g >= 930 && (
                        <g transform={`translate(${cx} ${cy}) rotate(${angle}) scale(${enter(g, 930, 8)})`}>
                          <rect x={-11} y={-6} width={22} height={12} rx={4} fill={c.ink} />
                          <rect x={2} y={-4.5} width={5} height={9} rx={1.5} fill="#7DD3FC" />
                        </g>
                      )}
                    </g>
                  );
                }}
              />
            }
            sheet={<ReportBox />}
            sheetH={SHEET.peek}
          />
          {landed && g >= 914 && (
            <div style={{ position: 'absolute', left: B_PIN[0] - 120, bottom: PHONE.h - (B_PIN[1] - 20), transformOrigin: '50% 100%', transform: `scale(${pop(g, 914, 10)})`, opacity: 1 - leave(g, M.parks - 4, 8) }}>
              <Popup width={240}>
                <div style={popupText.title(1)}>Hueco reportado</div>
                <div style={popupText.meta(1)}>Reporte de la comunidad · hace 0 min. Caduca a los 15 minutos.</div>
              </Popup>
            </div>
          )}
          {landed && (
            <div
              style={{
                position: 'absolute',
                left: B_PIN[0] + 20,
                top: B_PIN[1] + 16,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: parked ? c.accent : c.report,
                color: '#fff',
                borderRadius: 999,
                padding: '3px 9px 3px 7px',
                fontFamily: mono,
                fontWeight: 600,
                fontSize: 11,
                opacity: enter(g, 920, 8),
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {parked ? (
                <span style={{ fontFamily: sans }}>Aparcado</span>
              ) : (
                <>
                  <svg width={11} height={11} viewBox="0 0 12 12">
                    <circle cx={6} cy={6.5} r={4.6} fill="none" stroke="#fff" strokeWidth={1.4} />
                    <path d="M6 4.2 V6.6 L7.6 7.6 M4.6 1 H7.4" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
                  </svg>
                  {clock}
                </>
              )}
            </div>
          )}
        </Phone>
        {g >= 884 && g < M.pinLands + 2 && (
          <div style={{ position: 'absolute', left: flyX - 16, top: flyY - 16, width: 32, height: 32, borderRadius: 32, background: c.report, border: '5px solid #fff', boxShadow: '0 6px 18px rgba(124,58,237,0.5)' }} />
        )}
      </AbsoluteFill>
      {/* The spot's colour fills the frame and hands over to the sunset. */}
      {g >= 994 && (
        <div
          style={{
            position: 'absolute',
            left: PIN_EXIT[0] - 1200 * enter(g, 994, 16),
            top: PIN_EXIT[1] - 1200 * enter(g, 994, 16),
            width: 2400 * enter(g, 994, 16),
            height: 2400 * enter(g, 994, 16),
            borderRadius: '50%',
            background: c.report,
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(248,250,252,0.95) 22%, rgba(248,250,252,0) 34%)',
          opacity: ground * (1 - enter(g, 990, 8)),
        }}
      />
      <div style={{ position: 'absolute', left: 70, right: 70, top: 92, textAlign: 'center', opacity: 1 - enter(g, 988, 8) }}>
        <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 92, letterSpacing: '-0.04em', color: c.ink, lineHeight: 1, ...rise(g, M.community + 8) }}>
          Avisa de tu <span style={{ color: c.report }}>hueco</span>
        </div>
        <div style={{ fontFamily: sans, fontWeight: 500, fontSize: 34, color: c.muted, marginTop: 16, lineHeight: 1.3, ...rise(g, M.pinLands + 6) }}>
          Dura 15 minutos. Cuando te vas,
          <br />
          otra persona aparca.
        </div>
      </div>
    </AbsoluteFill>
  );
};
