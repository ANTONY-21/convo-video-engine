import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { Convo3Main, type ConvoData } from './Convo3';
import data from '/tmp/convo3/beats_for_remotion.json';

const Wrapper: React.FC = () => <Convo3Main data={data as unknown as ConvoData} />;

registerRoot(() => (
  <Composition
    id="Convo3"
    component={Wrapper}
    durationInFrames={(data as any).beats.reduce((a: number, b: any) => a + b.frames, 0)}
    fps={30}
    width={1080}
    height={1920}
  />
));
