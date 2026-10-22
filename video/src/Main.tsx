import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { c } from './look';
import { DURATION, T, toFrames } from './timing';
import { FontGate, Grain } from './ui/Base';
import { Hook } from './scenes/Hook';
import { Montage } from './scenes/Montage';
import { Reveal } from './scenes/Reveal';
import { City } from './scenes/City';
import { Community } from './scenes/Community';
import { Finale } from './scenes/Finale';

// Scenes are written in story frames; the Sequences place them on the slower
// composition timeline (see SPEED in timing.ts).
const scene = (key: keyof typeof T) => ({
  from: toFrames(T[key].from),
  durationInFrames: toFrames(T[key].to) - toFrames(T[key].from),
});

export const Main = ({ music = true }: { music?: boolean }) => (
  <AbsoluteFill style={{ background: c.night }}>
    <FontGate>
      <Sequence {...scene('hook')}>
        <Hook />
      </Sequence>
      <Sequence {...scene('montage')}>
        <Montage />
      </Sequence>
      <Sequence {...scene('reveal')}>
        <Reveal />
      </Sequence>
      <Sequence {...scene('city')}>
        <City />
      </Sequence>
      <Sequence {...scene('community')}>
        <Community />
      </Sequence>
      <Sequence {...scene('mission')}>
        <Finale />
      </Sequence>
    </FontGate>
    <Grain opacity={0.06} />
    {music && (
      <Audio
        src={staticFile('music.wav')}
        volume={(f) => interpolate(f, [DURATION - 54, DURATION - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
    )}
  </AbsoluteFill>
);
