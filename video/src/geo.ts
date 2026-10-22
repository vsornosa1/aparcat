import city from './data/city.json';
import layers from './data/layers.json';

// Web Mercator at zoom 16, relative to the top-left of the data box: the same
// projection as scripts/build_map.py, so lon/lat constants line up with paths.
const SCALE = 256 * 2 ** city.zoom;

const world = (lon: number, lat: number): [number, number] => {
  const s = Math.sin((lat * Math.PI) / 180);
  return [
    ((lon + 180) / 360) * SCALE,
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * SCALE,
  ];
};

const [X0, Y0] = world(city.origin[0], city.origin[1]);

export const project = (lon: number, lat: number): [number, number] => {
  const [x, y] = world(lon, lat);
  return [x - X0, y - Y0];
};

// Map units per metre at Valencia's latitude (about 0.54).
export const UNITS_PER_METRE = SCALE / (40075016.686 * Math.cos((39.47 * Math.PI) / 180));

export type Cam = { x: number; y: number; z: number; r?: number };

export const camAt = (lon: number, lat: number, z: number, r = 0): Cam => {
  const [x, y] = project(lon, lat);
  return { x, y, z, r };
};

// The camera that puts map point (x, y) at screen point (sx, sy).
export const camFor = (
  x: number,
  y: number,
  sx: number,
  sy: number,
  w: number,
  h: number,
  z: number,
  r = 0,
): Cam => {
  const a = (-r * Math.PI) / 180;
  const dx = (sx - w / 2) / z;
  const dy = (sy - h / 2) / z;
  return {
    x: x - (dx * Math.cos(a) - dy * Math.sin(a)),
    y: y - (dx * Math.sin(a) + dy * Math.cos(a)),
    z,
    r,
  };
};

// Zoom moves geometrically, position linearly: reads like a map fly-to.
export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z * Math.pow(b.z / a.z, t),
  r: (a.r ?? 0) + ((b.r ?? 0) - (a.r ?? 0)) * t,
});

export type Garage = (typeof layers.garages)[number];

export const data = {
  city,
  garages: layers.garages,
  cameras: layers.cameras as [number, number][],
  ora: layers.ora as Record<'Azul' | 'Naranja' | 'Verde' | 'Amarillo', string>,
  nearby: layers.nearby,
  camera: layers.camera,
  snapshot: layers.snapshot,
};

// Places used by the story (lon, lat).
export const places = {
  appCenter: [-0.3763, 39.4699], // the app's default map centre
  alameda: [-0.365, 39.4746], // the demo search (same as the API snapshot)
  russafa: [-0.3735, 39.4622],
  benimaclet: [-0.3593, 39.4849],
  // A real Russafa block: Sueca, Dénia, Cadis and Puerto Rico.
  russafaLoop: [
    [-0.3759368, 39.4626712], // Sueca x Dénia
    [-0.3745942, 39.463243], // Dénia x Cadis
    [-0.3738106, 39.4621345], // Cadis x Puerto Rico
    [-0.3751666, 39.4615676], // Puerto Rico x Sueca
  ],
} as const;

export const labels: { text: string; at: [number, number]; size?: number }[] = [
  { text: 'RUSSAFA', at: [-0.3712, 39.4602] },
  { text: "L'EIXAMPLE", at: [-0.3655, 39.4655] },
  { text: 'EXTRAMURS', at: [-0.3880, 39.4690] },
  { text: 'CIUTAT VELLA', at: [-0.3770, 39.4755] },
  { text: 'ALAMEDA', at: [-0.3598, 39.4712] },
  { text: 'EL PLA DEL REAL', at: [-0.3640, 39.4800] },
  { text: 'BENIMACLET', at: [-0.3593, 39.4880] },
  { text: 'ALGIRÓS', at: [-0.3480, 39.4740] },
  { text: 'CAMINS AL GRAU', at: [-0.3480, 39.4640] },
  { text: 'QUATRE CARRERES', at: [-0.3700, 39.4510] },
  { text: 'LA MALVA-ROSA', at: [-0.3290, 39.4790] },
  { text: 'CAMPANAR', at: [-0.3960, 39.4840] },
  { text: 'LA SAÏDIA', at: [-0.3760, 39.4860] },
  { text: 'PATRAIX', at: [-0.3960, 39.4600] },
];
