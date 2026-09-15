import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { XiaoheiConvo } from './XiaoheiConvo';

const CONVO = {
 "beats": [
  {
   "id": 1,
   "start": 0,
   "frames": 244,
   "scene": "home_desk",
   "speaker": "NARRATOR",
   "bubble": [
    "7 in 10 screen workers",
    "get eye strain"
   ],
   "visual": {
    "kind": "stat_cards"
   },
   "voText": "Seven in ten screen workers get Computer Vision Syndrome. Here's what it sounds like in real life."
  },
  {
   "id": 2,
   "start": 244,
   "frames": 178,
   "scene": "home_desk",
   "speaker": "RAVI",
   "bubble": [
    "My eyes are BURNING!",
    "4 hours of code..."
   ],
   "visual": {
    "kind": "price_tag"
   },
   "voText": "Uncle, my eyes are burning! Four hours of coding and I can barely read the screen."
  },
  {
   "id": 3,
   "start": 422,
   "frames": 207,
   "scene": "tea_stall",
   "speaker": "VIKRAM",
   "bubble": [
    "Your eyes are drying out",
    "right now, beta"
   ],
   "visual": {
    "kind": "stat_cards"
   },
   "voText": "That is your eyes drying out, beta. You blink sixty percent less when you stare at screens."
  },
  {
   "id": 4,
   "start": 629,
   "frames": 159,
   "scene": "tea_stall",
   "speaker": "RAVI",
   "bubble": [
    "60% less?!",
    "Moisture just",
    "evaporates?"
   ],
   "visual": {
    "kind": "real_rate"
   },
   "voText": "Sixty percent less? So the moisture just evaporates?"
  },
  {
   "id": 5,
   "start": 788,
   "frames": 303,
   "scene": "city_park",
   "speaker": "VIKRAM",
   "bubble": [
    "20-20-20:",
    "every 20 min",
    "20 feet \u2014 20 sec"
   ],
   "visual": {
    "kind": "rule72"
   },
   "voText": "Exactly. Dryness, strain, headaches, blurred vision. Follow the twenty rule. Every twenty minutes, look twenty feet away for twenty seconds."
  },
  {
   "id": 6,
   "start": 1091,
   "frames": 188,
   "scene": "evening_road",
   "speaker": "NARRATOR",
   "bubble": [
    "Education only,",
    "not medical advice."
   ],
   "visual": {
    "kind": "cta"
   },
   "voText": "Education only, not medical advice. Follow for the science behind your screen habits."
  }
 ],
 "size": {
  "w": 704,
  "h": 1280,
  "fps": 30
 }
};

const Wrapper: React.FC = () => {
  (globalThis as any).__CONVO__ = CONVO;
  return <XiaoheiConvo />;
};

export const ConvoRoot = () => (
  <Composition id="XiaoheiConvo" component={Wrapper}
    durationInFrames={CONVO.beats.reduce((a, b) => a + b.frames, 0)}
    fps={30} width={1080} height={1920} />
);

registerRoot(ConvoRoot);
