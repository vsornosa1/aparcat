import React from 'react';
import { Composition } from 'remotion';
import { Main } from './Main';
import { video } from './look';
import { DURATION } from './timing';

export const Root = () => (
  <Composition
    id="Main"
    component={Main}
    width={video.width}
    height={video.height}
    fps={video.fps}
    durationInFrames={DURATION}
    defaultProps={{ music: true }}
  />
);
