import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { XiaoheiConvo } from './XiaoheiConvo';

const CONVO = {
 "beats": [
 {
  "id": 1,
  "start": 0,
  "frames": 171,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Stop scrolling. The 20-20-20 rule saves your eyes. Your screen is damaging them right now.",
  "voText": "Stop scrolling. The 20-20-20 rule saves your eyes. Your screen is damaging them right now.",
  "bubble": [],
  "caption": "YOUR EYES ARE SUFFERING",
  "text_hook": "EYES DAMAGED RIGHT NOW",
  "visual": {
   "kind": "rule_card",
   "rule": "20-20-20",
   "lines": [
    "Every 20 minutes",
    "Look 20 feet away",
    "For 20 seconds"
   ]
  },
  "sfx": "bass_drop"
 },
 {
  "id": 2,
  "start": 171,
  "frames": 106,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "You're staring at your screen right now. But you're not blinking enough.",
  "voText": "You're staring at your screen right now. But you're not blinking enough.",
  "bubble": [],
  "caption": "YOU ARE NOT BLINKING",
  "text_hook": "BLINK RATE CRASHING",
  "visual": {
   "kind": "stat_pair",
   "left": {
    "label": "NORMAL BLINKS",
    "value": "15/min"
   },
   "right": {
    "label": "ON SCREEN",
    "value": "5/min"
   }
  },
  "sfx": "heartbeat"
 },
 {
  "id": 4,
  "start": 277,
  "frames": 133,
  "scene": "city_park",
  "speaker": "NARRATOR",
  "vo": "Normally you blink fifteen times a minute. Now it drops to five.",
  "voText": "Normally you blink fifteen times a minute. Now it drops to five.",
  "bubble": [],
  "caption": "15 DROPS TO 5",
  "text_hook": "THREE TIMES LESS PROTECTION",
  "visual": {
   "kind": "stat_pair",
   "left": {
    "label": "NORMAL",
    "value": "15"
   },
   "right": {
    "label": "SCROLLING",
    "value": "5"
   }
  },
  "sfx": "tick"
 },
 {
  "id": 5,
  "start": 410,
  "frames": 128,
  "scene": "city_park",
  "speaker": "NARRATOR",
  "vo": "Your screen is stressing your eyes. Here's how to fix it.",
  "voText": "Your screen is stressing your eyes. Here's how to fix it.",
  "bubble": [],
  "caption": "HERE'S THE FIX",
  "text_hook": "DOCTORS USE THIS RULE",
  "visual": {
   "kind": "rule_card",
   "rule": "20-20-20",
   "lines": [
    "Every 20 minutes",
    "Look 20 feet away",
    "For 20 seconds"
   ]
  },
  "sfx": "ding"
 },
 {
  "id": 6,
  "start": 538,
  "frames": 175,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Every twenty minutes, look twenty feet away, for twenty seconds. Do this, or it gets worse.",
  "voText": "Every twenty minutes, look twenty feet away, for twenty seconds. Do this, or it gets worse.",
  "bubble": [],
  "caption": "DO IT OR IT GETS WORSE",
  "text_hook": "SET A PHONE REMINDER",
  "visual": {
   "kind": "rule_card",
   "rule": "20-20-20",
   "lines": [
    "20 minutes",
    "20 feet",
    "20 seconds"
   ]
  },
  "sfx": "pop"
 },
 {
  "id": 7,
  "start": 713,
  "frames": 59,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "And you're still scrolling.",
  "voText": "And you're still scrolling.",
  "bubble": [],
  "caption": "AND YOU'RE STILL SCROLLING",
  "text_hook": "THE LOOP IS OPEN",
  "visual": {
   "kind": "countdown",
   "value": "24h",
   "label": "STILL TICKING"
  },
  "sfx": "bass_drop"
 },
 {
  "id": 8,
  "start": 772,
  "frames": 75,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Save this. Comment EYES for the free 20-20-20 phone reminder. Consult link in bio.",
  "voText": "Save this. Comment EYES for the free 20-20-20 phone reminder. Consult link in bio.",
  "bubble": [],
  "caption": "",
  "text_hook": "",
  "visual": {
   "kind": "cta",
   "headline": "SAVE THIS",
   "sub": "Comment EYES — free phone reminder • Consult in bio"
  },
  "sfx": null
 }
],
 "captions": [
 {
  "group": 0,
  "frameStart": 0,
  "frameEnd": 89,
  "beat": 1,
  "words": [
   {
    "w": "Stop",
    "f0": 0,
    "f1": 8
   },
   {
    "w": "scrolling.",
    "f0": 8,
    "f1": 16
   },
   {
    "w": "The",
    "f0": 34,
    "f1": 34
   },
   {
    "w": "2020",
    "f0": 34,
    "f1": 43
   },
   {
    "w": "rule",
    "f0": 43,
    "f1": 67
   },
   {
    "w": "saves",
    "f0": 67,
    "f1": 87
   }
  ]
 },
 {
  "group": 1,
  "frameStart": 87,
  "frameEnd": 144,
  "beat": 1,
  "words": [
   {
    "w": "your",
    "f0": 87,
    "f1": 96
   },
   {
    "w": "eyes.",
    "f0": 96,
    "f1": 102
   },
   {
    "w": "Your",
    "f0": 118,
    "f1": 120
   },
   {
    "w": "screen",
    "f0": 120,
    "f1": 129
   },
   {
    "w": "is",
    "f0": 129,
    "f1": 135
   },
   {
    "w": "damaging",
    "f0": 135,
    "f1": 142
   }
  ]
 },
 {
  "group": 2,
  "frameStart": 142,
  "frameEnd": 192,
  "beat": 1,
  "words": [
   {
    "w": "them",
    "f0": 142,
    "f1": 153
   },
   {
    "w": "right",
    "f0": 153,
    "f1": 158
   },
   {
    "w": "now.",
    "f0": 158,
    "f1": 166
   },
   {
    "w": "You're",
    "f0": 171,
    "f1": 174
   },
   {
    "w": "staring",
    "f0": 174,
    "f1": 181
   },
   {
    "w": "at",
    "f0": 181,
    "f1": 190
   }
  ]
 },
 {
  "group": 3,
  "frameStart": 190,
  "frameEnd": 223,
  "beat": 2,
  "words": [
   {
    "w": "your",
    "f0": 190,
    "f1": 193
   },
   {
    "w": "screen",
    "f0": 193,
    "f1": 201
   },
   {
    "w": "right",
    "f0": 201,
    "f1": 210
   },
   {
    "w": "now,",
    "f0": 210,
    "f1": 221
   }
  ]
 },
 {
  "group": 4,
  "frameStart": 220,
  "frameEnd": 246,
  "beat": 7,
  "words": [
   {
    "w": "is",
    "f0": 220,
    "f1": 224
   },
   {
    "w": "but",
    "f0": 221,
    "f1": 237
   },
   {
    "w": "the",
    "f0": 224,
    "f1": 229
   },
   {
    "w": "start",
    "f0": 229,
    "f1": 235
   },
   {
    "w": "of",
    "f0": 235,
    "f1": 242
   },
   {
    "w": "you're",
    "f0": 237,
    "f1": 244
   }
  ]
 },
 {
  "group": 5,
  "frameStart": 242,
  "frameEnd": 270,
  "beat": 7,
  "words": [
   {
    "w": "damage.",
    "f0": 242,
    "f1": 251
   },
   {
    "w": "not",
    "f0": 244,
    "f1": 249
   },
   {
    "w": "blinking",
    "f0": 249,
    "f1": 256
   },
   {
    "w": "enough.",
    "f0": 256,
    "f1": 268
   }
  ]
 },
 {
  "group": 6,
  "frameStart": 268,
  "frameEnd": 330,
  "beat": 7,
  "words": [
   {
    "w": "Normally",
    "f0": 268,
    "f1": 278
   },
   {
    "w": "you",
    "f0": 278,
    "f1": 292
   },
   {
    "w": "blink",
    "f0": 292,
    "f1": 297
   },
   {
    "w": "15",
    "f0": 297,
    "f1": 322
   },
   {
    "w": "times",
    "f0": 322,
    "f1": 328
   }
  ]
 },
 {
  "group": 7,
  "frameStart": 328,
  "frameEnd": 382,
  "beat": 7,
  "words": [
   {
    "w": "a",
    "f0": 328,
    "f1": 335
   },
   {
    "w": "minute.",
    "f0": 335,
    "f1": 341
   },
   {
    "w": "Now",
    "f0": 352,
    "f1": 355
   },
   {
    "w": "it",
    "f0": 355,
    "f1": 367
   },
   {
    "w": "drops",
    "f0": 367,
    "f1": 380
   }
  ]
 },
 {
  "group": 8,
  "frameStart": 380,
  "frameEnd": 447,
  "beat": 7,
  "words": [
   {
    "w": "to",
    "f0": 380,
    "f1": 388
   },
   {
    "w": "5.",
    "f0": 388,
    "f1": 395
   },
   {
    "w": "Your",
    "f0": 406,
    "f1": 410
   },
   {
    "w": "screen",
    "f0": 410,
    "f1": 419
   },
   {
    "w": "is",
    "f0": 419,
    "f1": 430
   },
   {
    "w": "stressing",
    "f0": 430,
    "f1": 445
   }
  ]
 },
 {
  "group": 9,
  "frameStart": 445,
  "frameEnd": 503,
  "beat": 7,
  "words": [
   {
    "w": "your",
    "f0": 445,
    "f1": 464
   },
   {
    "w": "eyes.",
    "f0": 464,
    "f1": 472
   },
   {
    "w": "Here",
    "f0": 491,
    "f1": 493
   },
   {
    "w": "is",
    "f0": 493,
    "f1": 495
   },
   {
    "w": "how",
    "f0": 495,
    "f1": 501
   }
  ]
 },
 {
  "group": 10,
  "frameStart": 501,
  "frameEnd": 564,
  "beat": 7,
  "words": [
   {
    "w": "to",
    "f0": 501,
    "f1": 509
   },
   {
    "w": "fix",
    "f0": 509,
    "f1": 521
   },
   {
    "w": "it.",
    "f0": 521,
    "f1": 529
   },
   {
    "w": "Every",
    "f0": 543,
    "f1": 543
   },
   {
    "w": "20",
    "f0": 543,
    "f1": 552
   },
   {
    "w": "minutes",
    "f0": 552,
    "f1": 562
   }
  ]
 },
 {
  "group": 11,
  "frameStart": 562,
  "frameEnd": 630,
  "beat": 7,
  "words": [
   {
    "w": "look",
    "f0": 562,
    "f1": 582
   },
   {
    "w": "20",
    "f0": 582,
    "f1": 592
   },
   {
    "w": "feet",
    "f0": 592,
    "f1": 599
   },
   {
    "w": "away",
    "f0": 599,
    "f1": 607
   },
   {
    "w": "for",
    "f0": 607,
    "f1": 620
   },
   {
    "w": "20",
    "f0": 620,
    "f1": 628
   }
  ]
 },
 {
  "group": 12,
  "frameStart": 628,
  "frameEnd": 694,
  "beat": 7,
  "words": [
   {
    "w": "seconds.",
    "f0": 628,
    "f1": 639
   },
   {
    "w": "Do",
    "f0": 657,
    "f1": 658
   },
   {
    "w": "this",
    "f0": 658,
    "f1": 665
   },
   {
    "w": "or",
    "f0": 665,
    "f1": 683
   },
   {
    "w": "it",
    "f0": 683,
    "f1": 688
   },
   {
    "w": "gets",
    "f0": 688,
    "f1": 692
   }
  ]
 },
 {
  "group": 13,
  "frameStart": 692,
  "frameEnd": 766,
  "beat": 7,
  "words": [
   {
    "w": "worse",
    "f0": 692,
    "f1": 702
   },
   {
    "w": "and",
    "f0": 714,
    "f1": 732
   },
   {
    "w": "you're",
    "f0": 720,
    "f1": 742
   },
   {
    "w": "still",
    "f0": 742,
    "f1": 743
   },
   {
    "w": "scrolling.",
    "f0": 743,
    "f1": 764
   }
  ]
 },
 {
  "group": 14,
  "frameStart": 776,
  "frameEnd": 823,
  "beat": 8,
  "words": [
   {
    "w": "Save",
    "f0": 776,
    "f1": 785
   },
   {
    "w": "this",
    "f0": 785,
    "f1": 792
   },
   {
    "w": "comment",
    "f0": 792,
    "f1": 811
   },
   {
    "w": "ties",
    "f0": 811,
    "f1": 821
   }
  ]
 },
 {
  "group": 15,
  "frameStart": 821,
  "frameEnd": 847,
  "beat": 8,
  "words": [
   {
    "w": "for",
    "f0": 821,
    "f1": 831
   },
   {
    "w": "the",
    "f0": 831,
    "f1": 834
   },
   {
    "w": "free",
    "f0": 834,
    "f1": 845
   },
   {
    "w": "2020",
    "f0": 853,
    "f1": 845
   },
   {
    "w": "-2021",
    "f0": 870,
    "f1": 845
   },
   {
    "w": "reminder.",
    "f0": 895,
    "f1": 845
   }
  ]
 },
 {
  "group": 16,
  "frameStart": 927,
  "frameEnd": 847,
  "beat": 8,
  "words": [
   {
    "w": "Consult",
    "f0": 927,
    "f1": 845
   },
   {
    "w": "link",
    "f0": 932,
    "f1": 845
   },
   {
    "w": "in",
    "f0": 942,
    "f1": 845
   },
   {
    "w": "bio.",
    "f0": 949,
    "f1": 845
   }
  ]
 }
]
};

const Wrapper: React.FC = () => {
  (globalThis as any).__CONVO__ = CONVO;
  return <XiaoheiConvo />;
};

export const T311ViralRoot = () => (
  <Composition id="XiaoheiConvo" component={Wrapper}
    durationInFrames={CONVO.beats.reduce((a, b) => a + b.frames, 0) + 8}
    fps={30} width={1080} height={1920} />
);

registerRoot(T311ViralRoot);
