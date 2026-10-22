import React from 'react';
import { random } from 'remotion';

// Line art of Valencia. Every stroke takes `draw` (0..1) so it can draw itself
// on: pathLength=1 turns the dash offset into a fraction of the stroke.

export const ink = (draw: number, stroke: string, width = 5): React.SVGAttributes<SVGElement> => ({
  fill: 'none',
  stroke,
  strokeWidth: width,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  pathLength: 1,
  strokeDasharray: '1 1',
  strokeDashoffset: 1 - Math.max(0, Math.min(1, draw)),
});

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Part i of n starts a little later than the previous one; `overlap` is how
// many parts draw at the same time.
const part = (draw: number, i: number, n: number, overlap = 2.2) => {
  const span = Math.min(1, overlap / n);
  const start = n > 1 ? (i / (n - 1)) * (1 - span) : 0;
  return clamp01((draw - start) / span);
};

// --- Small things -----------------------------------------------------------

export const Palm: React.FC<{ x: number; y: number; h: number; lean?: number; draw: number; color: string; w?: number }> = ({
  x,
  y,
  h,
  lean = 0,
  draw,
  color,
  w = 5,
}) => {
  const tx = x + lean;
  const ty = y - h;
  const fronds = [
    [-118, 26], [-92, -26], [-52, -58], [0, -70], [52, -58], [92, -26], [118, 26], [-70, 40], [70, 40],
  ];
  const trunk = part(draw, 0, 2, 1.4);
  const crown = part(draw, 1, 2, 1.4);
  return (
    <g>
      <path d={`M${x} ${y} Q${x + lean * 0.2} ${y - h * 0.55} ${tx} ${ty}`} {...ink(trunk, color, w * 1.4)} />
      {[0.2, 0.38, 0.56, 0.74].map((t) => {
        const px = x + (tx - x) * t + lean * 0.05;
        const py = y + (ty - y) * t;
        return <path key={t} d={`M${px - 9} ${py} L${px + 9} ${py}`} {...ink(trunk, color, w * 0.6)} />;
      })}
      {fronds.map(([dx, dy], i) => (
        <path
          key={i}
          d={`M${tx} ${ty} Q${tx + dx * 0.55} ${ty + dy - 34} ${tx + dx} ${ty + dy + 30}`}
          {...ink(part(crown, i, fronds.length, 4), color, w)}
        />
      ))}
    </g>
  );
};

export const OrangeTree: React.FC<{ x: number; y: number; r: number; draw: number; color: string; fruit: string }> = ({
  x,
  y,
  r,
  draw,
  color,
  fruit,
}) => {
  const oranges = [
    [-0.45, -0.2], [0.1, -0.5], [0.5, -0.05], [-0.1, 0.25], [0.35, 0.4], [-0.55, 0.3], [0.05, -0.05],
  ];
  return (
    <g>
      <path d={`M${x} ${y + r * 0.7} L${x} ${y + r * 2.1}`} {...ink(draw, color, 7)} />
      <circle cx={x} cy={y} r={r} {...ink(draw, color, 5)} />
      {oranges.map(([dx, dy], i) => (
        <circle key={i} cx={x + dx * r} cy={y + dy * r} r={6.5 * clamp01(draw * 3 - 1.6 - i * 0.1)} fill={fruit} />
      ))}
    </g>
  );
};

// A parked car seen from the side, facing right. `y` is the ground line.
export const Car: React.FC<{ x: number; y: number; len: number; color: string; kind: number; seed: number }> = ({
  x,
  y,
  len: L,
  color,
  kind,
  seed,
}) => {
  const wr = 23;
  const sill = y - 30;
  const belt = y - 78;
  const roof = kind === 2 ? y - 136 : y - 122;
  const c0 = kind === 1 ? 0.16 : 0.24; // hatchbacks carry the cabin back
  const c1 = 0.8;
  const lit = random(`lit-${seed}`) > 0.55;
  return (
    <g>
      <path
        d={`M${x + 14} ${sill} L${x + 6} ${belt + 14} Q${x + 8} ${belt} ${x + 26} ${belt}
            L${x + L - 30} ${belt} Q${x + L - 6} ${belt + 4} ${x + L - 4} ${belt + 22}
            L${x + L - 8} ${sill} Z`}
        fill={color}
      />
      <path
        d={`M${x + L * c0} ${belt} L${x + L * (c0 + 0.08)} ${roof} L${x + L * 0.66} ${roof}
            L${x + L * c1} ${belt} Z`}
        fill={color}
      />
      <path
        d={`M${x + L * c0 + 10} ${belt - 4} L${x + L * (c0 + 0.08) + 6} ${roof + 7} L${x + L * 0.47} ${roof + 7}
            L${x + L * 0.47} ${belt - 4} Z M${x + L * 0.5} ${belt - 4} L${x + L * 0.5} ${roof + 7}
            L${x + L * 0.655} ${roof + 7} L${x + L * c1 - 12} ${belt - 4} Z`}
        fill="#0C1320"
        opacity={0.92}
      />
      <path d={`M${x + 26} ${belt + 2} L${x + L - 30} ${belt + 2}`} stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={3} />
      <rect x={x + 4} y={belt + 12} width={9} height={14} rx={3} fill="#FF4D4D" opacity={0.9} />
      <rect x={x + L - 12} y={belt + 14} width={8} height={11} rx={3} fill={lit ? '#FFE7A8' : '#8A93A6'} />
      {[0.19, 0.81].map((t) => (
        <g key={t}>
          <circle cx={x + L * t} cy={y - wr} r={wr} fill="#05080F" />
          <circle cx={x + L * t} cy={y - wr} r={wr * 0.45} fill="#4B5568" />
        </g>
      ))}
    </g>
  );
};

const CAR_COLORS = ['#3E4C66', '#7A3E48', '#2F5D55', '#8A7A5C', '#5B4B7A', '#69707D', '#9A4F2E', '#33475B', '#A39E93'];

// A row of cars parked bumper to bumper, as long as the montage street.
export const parkedCars = (length: number) => {
  const cars: { x: number; len: number; color: string; kind: number; seed: number }[] = [];
  let x = -120;
  let i = 0;
  while (x < length) {
    const len = 196 + Math.round(random(`len-${i}`) * 50);
    cars.push({
      x,
      len,
      color: CAR_COLORS[Math.floor(random(`col-${i}`) * CAR_COLORS.length)],
      kind: Math.floor(random(`kind-${i}`) * 3),
      seed: i,
    });
    x += len + 8 + Math.round(random(`gap-${i}`) * 8);
    i += 1;
  }
  return cars;
};

// --- Landmarks for the montage (segment-local, 1080 wide, ground at y 1080) ---

type ArtProps = { draw: number; color: string; warm: string };

// Alameda: Calatrava's Pont de l'Exposició, "la Peineta", over the Túria garden.
export const AlamedaArt: React.FC<ArtProps> = ({ draw, color, warm }) => {
  const q = (t: number) => {
    const x = (1 - t) ** 2 * 150 + 2 * (1 - t) * t * 540 + t * t * 930;
    const y = (1 - t) ** 2 * 812 + 2 * (1 - t) * t * 300 + t * t * 812;
    return [x, y];
  };
  const hangers = Array.from({ length: 17 }, (_, i) => (i + 1) / 18);
  return (
    <g>
      {[[360, 930, 46], [450, 948, 38], [640, 936, 50], [735, 950, 36], [210, 950, 34], [860, 952, 34]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} {...ink(part(draw, 0, 4), color, 4)} opacity={0.55} />
      ))}
      <path d="M300 834 L330 1000 M780 834 L750 1000" {...ink(part(draw, 0, 4), color, 6)} />
      <path d="M110 810 L970 810 M110 834 L970 834" {...ink(part(draw, 1, 4), color, 6)} />
      <path d="M110 790 L970 790" {...ink(part(draw, 1, 4), color, 3)} />
      {Array.from({ length: 30 }, (_, i) => 120 + i * 29).map((x) => (
        <path key={x} d={`M${x} 790 L${x} 810`} {...ink(part(draw, 1, 4), color, 2.5)} />
      ))}
      <path d="M150 812 Q540 300 930 812" {...ink(part(draw, 2, 4), '#FFFFFF', 9)} />
      <path d="M176 812 Q540 336 904 812" {...ink(part(draw, 2, 4), color, 4)} />
      {hangers.map((t, i) => {
        const [x, y] = q(t);
        return <path key={i} d={`M${x} ${y} L${x + 22} 790`} {...ink(part(draw, 3, 4), color, 2.5)} />;
      })}
      <Palm x={58} y={1000} h={430} lean={14} draw={part(draw, 2, 4)} color={color} />
      <Palm x={1012} y={1000} h={390} lean={-12} draw={part(draw, 3, 4)} color={color} />
      <circle cx={540} cy={250} r={5} fill={warm} opacity={draw > 0.9 ? 0.9 : 0} />
    </g>
  );
};

const Building: React.FC<{ x0: number; x1: number; top: number; cols: number; draw: number; color: string; warm: string; seed: string }> = ({
  x0,
  x1,
  top,
  cols,
  draw,
  color,
  warm,
  seed,
}) => {
  const floors = Math.floor((910 - (top + 60)) / 96);
  const gap = (x1 - x0) / cols;
  return (
    <g>
      <path d={`M${x0} 1000 L${x0} ${top} L${x1} ${top} L${x1} 1000`} {...ink(part(draw, 0, 3), color, 5)} />
      <path d={`M${x0 - 10} ${top + 18} L${x1 + 10} ${top + 18}`} {...ink(part(draw, 0, 3), color, 4)} />
      {Array.from({ length: floors }, (_, f) =>
        Array.from({ length: cols }, (__, k) => {
          const wx = x0 + gap * (k + 0.5) - 21;
          const wy = top + 60 + f * 96;
          const on = random(`${seed}-${f}-${k}`) > 0.6;
          return (
            <g key={`${f}-${k}`}>
              <rect x={wx} y={wy} width={42} height={70} rx={4} fill={on ? warm : 'none'} fillOpacity={on ? clamp01(draw * 2 - 1) * 0.8 : 0} {...ink(part(draw, 1, 3), color, 3)} />
              <path d={`M${wx - 10} ${wy + 76} L${wx + 52} ${wy + 76} M${wx - 6} ${wy + 76} L${wx - 6} ${wy + 58} M${wx + 48} ${wy + 76} L${wx + 48} ${wy + 58} M${wx - 10} ${wy + 58} L${wx + 52} ${wy + 58}`} {...ink(part(draw, 2, 3), color, 2.5)} />
            </g>
          );
        }),
      )}
    </g>
  );
};

// Russafa: Eixample facades with balconies, and orange trees on the pavement.
export const RussafaArt: React.FC<ArtProps & { fruit: string }> = ({ draw, color, warm, fruit }) => (
  <g>
    <Building x0={80} x1={372} top={540} cols={4} draw={part(draw, 0, 3)} color={color} warm={warm} seed="b1" />
    <Building x0={372} x1={716} top={470} cols={4} draw={part(draw, 0.5, 3)} color={color} warm={warm} seed="b2" />
    <path d="M626 470 L626 420 Q671 352 716 420 L716 470 M671 362 L671 330" {...ink(part(draw, 1, 3), color, 5)} />
    <Building x0={716} x1={1010} top={560} cols={4} draw={part(draw, 1, 3)} color={color} warm={warm} seed="b3" />
    {[226, 544, 862].map((x, i) => (
      <OrangeTree key={x} x={x} y={872} r={60} draw={part(draw, 1.6 + i * 0.3, 3)} color={color} fruit={fruit} />
    ))}
  </g>
);

// Benimaclet: the old village church and bell tower, low houses, the horta.
export const BenimacletArt: React.FC<ArtProps> = ({ draw, color, warm }) => (
  <g>
    <path d="M36 1000 L36 770 L138 712 L240 770 L240 1000 M90 1000 L90 900 L130 900 L130 1000" {...ink(part(draw, 0, 4), color, 5)} />
    <rect x={160} y={820} width={40} height={50} rx={4} fill={warm} fillOpacity={clamp01(draw * 2 - 1) * 0.8} {...ink(part(draw, 0, 4), color, 3)} />
    <path d="M262 1000 L262 706 L366 646 L470 706 L470 1000" {...ink(part(draw, 1, 4), color, 5)} />
    <circle cx={366} cy={760} r={30} {...ink(part(draw, 1, 4), color, 4)} />
    <path d="M330 1000 L330 900 Q366 858 402 900 L402 1000" {...ink(part(draw, 1, 4), color, 4)} />
    <path d="M470 1000 L470 470 L590 470 L590 1000 M470 560 L590 560 M462 470 L598 470" {...ink(part(draw, 1.5, 4), color, 5)} />
    <path d="M492 556 L492 512 Q509 488 526 512 L526 556 M534 556 L534 512 Q551 488 568 512 L568 556" {...ink(part(draw, 2, 4), color, 4)} />
    <circle cx={509} cy={540} r={7} fill={warm} opacity={clamp01(draw * 3 - 2)} />
    <circle cx={551} cy={540} r={7} fill={warm} opacity={clamp01(draw * 3 - 2)} />
    <path d="M462 470 L530 404 L598 470 M530 404 L530 360 M516 376 L544 376" {...ink(part(draw, 2.5, 4), color, 5)} />
    {[[610, 790, 820], [780, 740, 990], [990, 800, 1060]].map(([a, top, b], i) => (
      <g key={i}>
        <path d={`M${a} 1000 L${a} ${top} L${(a + b) / 2} ${top - 40} L${b} ${top} L${b} 1000`} {...ink(part(draw, 2 + i * 0.4, 4), color, 5)} />
        {[0, 1].map((k) => {
          const x = a + 36 + k * ((b - a) / 2);
          const on = random(`ben-${i}-${k}`) > 0.4;
          return (
            <rect key={k} x={x} y={top + 40} width={44} height={60} rx={4} fill={warm} fillOpacity={on ? clamp01(draw * 2 - 1) * 0.8 : 0} {...ink(part(draw, 3, 4), color, 3)} />
          );
        })}
      </g>
    ))}
  </g>
);

// La Malva-rosa: the beach at night, palms, the lifeguard tower, the moon.
export const MalvarrosaArt: React.FC<ArtProps & { moon: string }> = ({ draw, color, warm, moon }) => {
  const wave = (y: number, a: number, off: number) =>
    `M-20 ${y} ` +
    Array.from({ length: 19 }, (_, i) => `q 30 ${i % 2 ? a : -a} 60 0`).join(' ') +
    ` M${off} ${y}`;
  return (
    <g>
      <circle cx={830} cy={470} r={64} fill={moon} opacity={0.12 * clamp01(draw * 2)} />
      <circle cx={830} cy={470} r={44} fill={moon} opacity={clamp01(draw * 2)} />
      <path d="M0 760 L1080 760" {...ink(part(draw, 0, 4), color, 4)} />
      <path d={wave(806, 7, 0)} {...ink(part(draw, 1, 4), color, 3.5)} opacity={0.8} />
      <path d={wave(846, 6, 0)} {...ink(part(draw, 1.4, 4), color, 3)} opacity={0.6} />
      <path d="M0 900 L1080 900" {...ink(part(draw, 1.8, 4), color, 4)} />
      <path d="M560 900 L576 712 M660 900 L644 712 M560 900 L644 712 M660 900 L576 712" {...ink(part(draw, 2, 4), color, 4)} />
      <path d="M548 712 L672 712 L672 640 L548 640 Z M536 640 L610 600 L684 640" {...ink(part(draw, 2.4, 4), color, 5)} />
      <rect x={566} y={656} width={40} height={36} rx={3} fill={warm} fillOpacity={clamp01(draw * 2 - 1) * 0.7} />
      <path d="M760 1000 L760 640 Q760 612 790 612 L812 612" {...ink(part(draw, 2.6, 4), color, 5)} />
      <circle cx={814} cy={622} r={12} fill={warm} opacity={clamp01(draw * 3 - 2)} />
      <Palm x={120} y={1000} h={450} lean={18} draw={part(draw, 2, 4)} color={color} />
      <Palm x={300} y={1000} h={360} lean={-10} draw={part(draw, 2.5, 4)} color={color} />
      <Palm x={980} y={1000} h={420} lean={-14} draw={part(draw, 3, 4)} color={color} />
    </g>
  );
};

// --- City of Arts and Sciences, for the skyline and the end card ------------

// Drawn on a 1080 wide strip whose ground is y = 0 (things go up, negative y).
export const ArtsSkyline: React.FC<{ draw: number; color: string; width?: number; accent?: string }> = ({
  draw,
  color,
  width = 4,
  accent,
}) => {
  const a = accent ?? color;
  return (
    <g>
      {/* L'Hemisfèric: the eye */}
      <path d="M90 0 Q250 -170 410 0" {...ink(part(draw, 0, 5), color, width)} />
      <path d="M130 0 Q250 -120 370 0" {...ink(part(draw, 0.4, 5), color, width * 0.7)} />
      {[-0.6, -0.3, 0, 0.3, 0.6].map((k, i) => (
        <path key={i} d={`M${250 + k * 150} ${-Math.round(85 * (1 - k * k))} L${250 + k * 105} ${-Math.round(60 * (1 - k * k))}`} {...ink(part(draw, 0.8, 5), color, width * 0.6)} />
      ))}
      <ellipse cx={250} cy={-48} rx={44} ry={26} {...ink(part(draw, 1, 5), a, width)} />
      {/* El Palau de les Arts: the shell and its feather */}
      <path d="M470 0 L470 -90 Q560 -300 760 -250 Q860 -224 900 -150 L900 0" {...ink(part(draw, 1.5, 5), color, width)} />
      <path d="M520 -110 Q640 -330 905 -275" {...ink(part(draw, 2, 5), a, width * 1.1)} />
      <path d="M560 -60 Q680 -200 860 -150" {...ink(part(draw, 2.3, 5), color, width * 0.7)} />
      {/* L'Assut de l'Or bridge: the leaning pylon and its cables */}
      <path d="M940 0 L1040 -330" {...ink(part(draw, 3, 5), color, width * 1.2)} />
      {Array.from({ length: 9 }, (_, i) => i).map((i) => (
        <path key={i} d={`M${1040 - i * 10} ${-330 + i * 33} L${700 + i * 40} -18`} {...ink(part(draw, 3.4, 5), color, width * 0.45)} />
      ))}
      <path d="M0 0 L1080 0 M640 -18 L1080 -18" {...ink(part(draw, 4, 5), color, width * 0.8)} />
    </g>
  );
};

// --- The Túria at sunset: silhouettes, drawn on a 1080 strip, ground y = 0 ---

export const TuriaSilhouette: React.FC<{ color: string; t: number }> = ({ color, t }) => {
  const trees = [
    [40, 150], [150, 190], [270, 140], [700, 170], [820, 210], [960, 160], [1060, 190],
  ];
  const cyclistX = -120 + t * 1300;
  const walkerX = 1150 - t * 520;
  return (
    <g fill={color}>
      {trees.map(([x, h], i) => (
        <g key={i}>
          <rect x={x - 7} y={-h * 0.55} width={14} height={h * 0.55} />
          <circle cx={x} cy={-h * 0.7} r={h * 0.38} />
          <circle cx={x - h * 0.25} cy={-h * 0.55} r={h * 0.28} />
          <circle cx={x + h * 0.27} cy={-h * 0.58} r={h * 0.3} />
        </g>
      ))}
      {/* A stone bridge with arches across the old riverbed */}
      <path d="M300 -150 L700 -150 L700 -128 L300 -128 Z" />
      {[0, 1, 2, 3].map((k) => (
        <path key={k} d={`M${312 + k * 98} -128 L${312 + k * 98} 0 L${330 + k * 98} 0 Q${361 + k * 98} -86 ${392 + k * 98} 0 L${410 + k * 98} 0 L${410 + k * 98} -128 Z`} />
      ))}
      <rect x={-20} y={-14} width={1120} height={40} />
      {/* A cyclist and someone walking */}
      <g transform={`translate(${cyclistX} -14)`}>
        <circle cx={-22} cy={-20} r={19} fill="none" stroke={color} strokeWidth={5} />
        <circle cx={26} cy={-20} r={19} fill="none" stroke={color} strokeWidth={5} />
        <path d="M-22 -20 L0 -48 L26 -20 M0 -48 L-6 -62 M-2 -62 L10 -98 M10 -98 L28 -70 L22 -52" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
        <circle cx={12} cy={-110} r={10} />
      </g>
      <g transform={`translate(${walkerX} -14)`}>
        <path d="M0 0 L8 -44 L16 0 M8 -44 L8 -86 M8 -76 L-6 -50 M8 -76 L22 -52" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <circle cx={8} cy={-98} r={11} />
      </g>
    </g>
  );
};

// A soft "worn ink" mask for the COMPLET stamp: specks where ink is missing.
export const stampSpecks = (w: number, h: number, n = 70) =>
  Array.from({ length: n }, (_, i) => ({
    x: (random(`sx-${i}`) - 0.5) * w,
    y: (random(`sy-${i}`) - 0.5) * h,
    r: 1.5 + random(`sr-${i}`) * 4,
  }));
