import React from 'react';
import { c, sans } from '../look';

// An iPhone-sized frame. Children are laid out in the phone's own CSS pixels
// (390 x 844), exactly like the app's mobile layout, and scaled as a whole.
export const PHONE = { w: 390, h: 844, bezel: 13, status: 47, map: 388 };
export const PHONE_OUTER = { w: PHONE.w + PHONE.bezel * 2, h: PHONE.h + PHONE.bezel * 2 };

export type PhonePose = { x: number; y: number; s: number; rx?: number; ry?: number; rz?: number };

// Where a point of the screen (phone CSS px) lands in the video, for a flat pose.
export const phonePoint = (pose: PhonePose, lx: number, ly: number): [number, number] => [
  pose.x + (lx + PHONE.bezel - PHONE_OUTER.w / 2) * pose.s,
  pose.y + (ly + PHONE.bezel) * pose.s,
];

export const Phone: React.FC<{
  pose: PhonePose;
  time?: string;
  opacity?: number;
  bezelOpacity?: number;
  children: React.ReactNode;
}> = ({ pose, time = '20:31', opacity = 1, bezelOpacity = 1, children }) => {
  const { x, y, s, rx = 0, ry = 0, rz = 0 } = pose;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - PHONE_OUTER.w / 2,
        top: y,
        width: PHONE_OUTER.w,
        height: PHONE_OUTER.h,
        transformOrigin: 'top center',
        transform: `perspective(2600px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 64,
          background: '#0B0B0D',
          boxShadow: `0 0 0 2px #2B2B30, 0 50px 90px rgba(15, 23, 42, ${0.28 * bezelOpacity}), 0 18px 30px rgba(15, 23, 42, ${0.18 * bezelOpacity})`,
          opacity: bezelOpacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: PHONE.bezel,
          top: PHONE.bezel,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: 51 * bezelOpacity,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {children}
        <StatusBar time={time} opacity={bezelOpacity} />
        <div
          style={{
            position: 'absolute',
            left: PHONE.w / 2 - 60,
            top: 11,
            width: 120,
            height: 35,
            borderRadius: 20,
            background: '#000',
            opacity: bezelOpacity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: PHONE.w / 2 - 67,
            bottom: 8,
            width: 134,
            height: 5,
            borderRadius: 3,
            background: c.ink,
            opacity: bezelOpacity,
          }}
        />
      </div>
    </div>
  );
};

const StatusBar: React.FC<{ time: string; opacity: number }> = ({ time, opacity }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: PHONE.w,
      height: PHONE.status,
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '4px 30px 0 34px',
      boxSizing: 'border-box',
      fontFamily: sans,
      fontWeight: 600,
      fontSize: 16,
      color: c.ink,
      opacity,
    }}
  >
    <span>{time}</span>
    <svg width={70} height={14} viewBox="0 0 70 14">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={10 - i * 3} width={3.4} height={4 + i * 3} rx={1} fill={c.ink} />
      ))}
      <path d="M27 5.5 Q34 0 41 5.5 L39.3 7.3 Q34 3.4 28.7 7.3 Z M30.4 9 Q34 6 37.6 9 L34 12.6 Z" fill={c.ink} />
      <rect x={46} y={1.5} width={21} height={11} rx={3} fill="none" stroke={c.ink} strokeOpacity={0.4} />
      <rect x={48} y={3.5} width={15} height={7} rx={1.6} fill={c.ink} />
      <rect x={68} y={5} width={1.6} height={4} rx={0.8} fill={c.ink} fillOpacity={0.4} />
    </svg>
  </div>
);
