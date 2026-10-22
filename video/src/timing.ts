import { useCurrentFrame } from 'remotion';

// The cut list, in "story frames": the film was cut on a 15-frame beat and is
// played SPEED times slower, so on screen a beat lasts 18 frames (100 BPM)
// and the whole piece 54 s. music/score.py reads the same numbers and SPEED.
export const SPEED = 1.2;
export const BEAT = 15;
export const BAR = 60;

// Story frame <-> composition frame.
export const toFrames = (story: number) => Math.round(story * SPEED);

// The story frame a scene is at, given where its Sequence starts.
export const useStory = (from: number) => (useCurrentFrame() + toFrames(from)) / SPEED;

// Scenes overlap so the next one can take over the carrier.
export const T = {
  hook: { from: 0, to: 96 },
  montage: { from: 86, to: 246 },
  reveal: { from: 236, to: 444 }, // the green P, the name, then the phone demo
  city: { from: 420, to: 860 },
  community: { from: 836, to: 1040 },
  mission: { from: 1000, to: 1350 }, // the Túria at sunset, then night and the end card
};

export const TOTAL = 1350; // story frames
export const DURATION = toFrames(TOTAL); // composition frames (54 s)

// Moments inside scenes, on the beat grid.
export const M = {
  tiles: [90, 120, 150, 180], // montage cuts
  stamps: [105, 135, 165, 195], // COMPLET lands
  push: 210, // push into the last stamp
  silence: 225, // music stops for half a second
  drop: 240, // the red dot turns into the green P
  phoneIn: 300,
  tapSearch: 340,
  results: 366,
  sheetDown: 400, // the finger pulls the results panel down to free the map
  breakout: 420,
  ora: 540,
  cameras: 660,
  tapCameras: 675,
  zoomCamera: 735,
  tapViewer: 795,
  community: 840,
  tapReport: 870,
  pinLands: 900,
  parks: 975,
  sunset: 1020,
  night: 1185,
  end: 1200,
};
