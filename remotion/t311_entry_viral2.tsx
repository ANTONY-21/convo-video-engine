import { registerRoot, Composition } from 'remotion';
import React from 'react';
import { XiaoheiConvo } from './XiaoheiConvo';

const CONVO = {
 "beats": [
 {
  "id": 1,
  "start": 0,
  "frames": 101,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Stop scrolling. Your eyes are suffering right now.",
  "voText": "Stop scrolling. Your eyes are suffering right now.",
  "bubble": [
   "STOP SCROLLING"
  ],
  "caption": "YOUR EYES ARE SUFFERING",
  "text_hook": "EYES DAMAGED RIGHT NOW",
  "visual": {
   "kind": "flag_list",
   "icon": "bolt",
   "title": "RED FLAGS",
   "items": [
    {
     "icon": "screen",
     "text": "SCREEN TIME 4+ HRS?"
    },
    {
     "icon": "fire",
     "text": "EYES BURNING?"
    },
    {
     "icon": "blur",
     "text": "BLURRED VISION?"
    }
   ]
  },
  "sfx": "bass_drop"
 },
 {
  "id": 2,
  "start": 101,
  "frames": 108,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "You're staring at your screen right now. But you're not blinking enough.",
  "voText": "You're staring at your screen right now. But you're not blinking enough.",
  "bubble": [
   "YOU ARE NOT BLINKING"
  ],
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
  "id": 3,
  "start": 209,
  "frames": 147,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Your eyes are drying out. That burning feeling? That's the start of damage.",
  "voText": "Your eyes are drying out. That burning feeling? That's the start of damage.",
  "bubble": [
   "DAMAGE STARTS HERE"
  ],
  "caption": "DAMAGE STARTS HERE",
  "text_hook": "BURNING = WARNING LIGHT",
  "visual": {
   "kind": "flag_list",
   "icon": "lightning",
   "title": "DAMAGE STARTS HERE",
   "items": [
    {
     "icon": "blur",
     "text": "DRY EYES"
    },
    {
     "icon": "fire",
     "text": "BURNING"
    }
   ]
  },
  "sfx": "bass_hit"
 },
 {
  "id": 4,
  "start": 356,
  "frames": 136,
  "scene": "city_park",
  "speaker": "NARRATOR",
  "vo": "Normally you blink fifteen times a minute. Now it drops to five.",
  "voText": "Normally you blink fifteen times a minute. Now it drops to five.",
  "bubble": [
   "15 → 5 BLINKS"
  ],
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
  "start": 492,
  "frames": 130,
  "scene": "city_park",
  "speaker": "NARRATOR",
  "vo": "Your screen is stressing your eyes. Here's how to fix it.",
  "voText": "Your screen is stressing your eyes. Here's how to fix it.",
  "bubble": [
   "THE 20 SECOND FIX"
  ],
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
  "start": 622,
  "frames": 178,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "Every twenty minutes, look twenty feet away, for twenty seconds. Do this, or it gets worse.",
  "voText": "Every twenty minutes, look twenty feet away, for twenty seconds. Do this, or it gets worse.",
  "bubble": [
   "DO IT DAILY"
  ],
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
  "start": 800,
  "frames": 62,
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
  "start": 862,
  "frames": 120,
  "scene": "home_desk",
  "speaker": "NARRATOR",
  "vo": "",
  "voText": "",
  "bubble": [],
  "caption": "",
  "text_hook": "",
  "visual": {
   "kind": "cta",
   "headline": "SAVE THIS",
   "sub": "Follow for the science"
  },
  "sfx": null
 }
],
 "captions": [
 {
  "group": 0,
  "frameStart": 0,
  "frameEnd": 27,
  "beat": 1,
  "words": [
   {
    "w": "Stop",
    "f0": 0,
    "f1": 9
   },
   {
    "w": "scrolling.",
    "f0": 9,
    "f1": 22
   }
  ]
 },
 {
  "group": 1,
  "frameStart": 40,
  "frameEnd": 96,
  "beat": 1,
  "words": [
   {
    "w": "Your",
    "f0": 40,
    "f1": 42
   },
   {
    "w": "eyes",
    "f0": 42,
    "f1": 49
   },
   {
    "w": "are",
    "f0": 49,
    "f1": 57
   },
   {
    "w": "suffering",
    "f0": 57,
    "f1": 66
   },
   {
    "w": "right",
    "f0": 66,
    "f1": 82
   },
   {
    "w": "now.",
    "f0": 82,
    "f1": 90
   }
  ]
 },
 {
  "group": 2,
  "frameStart": 102,
  "frameEnd": 146,
  "beat": 2,
  "words": [
   {
    "w": "You're",
    "f0": 102,
    "f1": 105
   },
   {
    "w": "staring",
    "f0": 105,
    "f1": 111
   },
   {
    "w": "at",
    "f0": 111,
    "f1": 120
   },
   {
    "w": "your",
    "f0": 120,
    "f1": 123
   },
   {
    "w": "screen",
    "f0": 123,
    "f1": 132
   },
   {
    "w": "right",
    "f0": 132,
    "f1": 141
   }
  ]
 },
 {
  "group": 3,
  "frameStart": 141,
  "frameEnd": 204,
  "beat": 2,
  "words": [
   {
    "w": "now,",
    "f0": 141,
    "f1": 151
   },
   {
    "w": "but",
    "f0": 151,
    "f1": 168
   },
   {
    "w": "you're",
    "f0": 168,
    "f1": 174
   },
   {
    "w": "not",
    "f0": 174,
    "f1": 179
   },
   {
    "w": "blinking",
    "f0": 179,
    "f1": 186
   },
   {
    "w": "enough.",
    "f0": 186,
    "f1": 198
   }
  ]
 },
 {
  "group": 4,
  "frameStart": 207,
  "frameEnd": 265,
  "beat": 3,
  "words": [
   {
    "w": "Your",
    "f0": 207,
    "f1": 212
   },
   {
    "w": "eyes",
    "f0": 212,
    "f1": 218
   },
   {
    "w": "are",
    "f0": 218,
    "f1": 224
   },
   {
    "w": "drying",
    "f0": 224,
    "f1": 231
   },
   {
    "w": "out",
    "f0": 231,
    "f1": 241
   },
   {
    "w": "that",
    "f0": 241,
    "f1": 260
   }
  ]
 },
 {
  "group": 5,
  "frameStart": 260,
  "frameEnd": 285,
  "beat": 3,
  "words": [
   {
    "w": "burning",
    "f0": 260,
    "f1": 269
   },
   {
    "w": "feeling.",
    "f0": 269,
    "f1": 280
   }
  ]
 },
 {
  "group": 6,
  "frameStart": 297,
  "frameEnd": 313,
  "beat": 3,
  "words": [
   {
    "w": "That",
    "f0": 297,
    "f1": 307
   }
  ]
 },
 {
  "group": 7,
  "frameStart": 307,
  "frameEnd": 344,
  "beat": 7,
  "words": [
   {
    "w": "is",
    "f0": 307,
    "f1": 311
   },
   {
    "w": "the",
    "f0": 311,
    "f1": 316
   },
   {
    "w": "start",
    "f0": 316,
    "f1": 322
   },
   {
    "w": "of",
    "f0": 322,
    "f1": 330
   },
   {
    "w": "damage.",
    "f0": 330,
    "f1": 339
   }
  ]
 },
 {
  "group": 8,
  "frameStart": 355,
  "frameEnd": 428,
  "beat": 7,
  "words": [
   {
    "w": "Normally",
    "f0": 355,
    "f1": 366
   },
   {
    "w": "you",
    "f0": 366,
    "f1": 379
   },
   {
    "w": "blink",
    "f0": 379,
    "f1": 384
   },
   {
    "w": "15",
    "f0": 384,
    "f1": 409
   },
   {
    "w": "times",
    "f0": 409,
    "f1": 415
   },
   {
    "w": "a",
    "f0": 415,
    "f1": 422
   }
  ]
 },
 {
  "group": 9,
  "frameStart": 422,
  "frameEnd": 488,
  "beat": 7,
  "words": [
   {
    "w": "minute.",
    "f0": 422,
    "f1": 428
   },
   {
    "w": "Now",
    "f0": 439,
    "f1": 442
   },
   {
    "w": "it",
    "f0": 442,
    "f1": 454
   },
   {
    "w": "drops",
    "f0": 454,
    "f1": 467
   },
   {
    "w": "to",
    "f0": 467,
    "f1": 475
   },
   {
    "w": "5.",
    "f0": 475,
    "f1": 482
   }
  ]
 },
 {
  "group": 10,
  "frameStart": 493,
  "frameEnd": 564,
  "beat": 7,
  "words": [
   {
    "w": "Your",
    "f0": 493,
    "f1": 497
   },
   {
    "w": "screen",
    "f0": 497,
    "f1": 506
   },
   {
    "w": "is",
    "f0": 506,
    "f1": 517
   },
   {
    "w": "stressing",
    "f0": 517,
    "f1": 532
   },
   {
    "w": "your",
    "f0": 532,
    "f1": 552
   },
   {
    "w": "eyes.",
    "f0": 552,
    "f1": 559
   }
  ]
 },
 {
  "group": 11,
  "frameStart": 578,
  "frameEnd": 621,
  "beat": 7,
  "words": [
   {
    "w": "Here",
    "f0": 578,
    "f1": 580
   },
   {
    "w": "is",
    "f0": 580,
    "f1": 582
   },
   {
    "w": "how",
    "f0": 582,
    "f1": 588
   },
   {
    "w": "to",
    "f0": 588,
    "f1": 597
   },
   {
    "w": "fix",
    "f0": 597,
    "f1": 609
   },
   {
    "w": "it.",
    "f0": 609,
    "f1": 616
   }
  ]
 },
 {
  "group": 12,
  "frameStart": 630,
  "frameEnd": 692,
  "beat": 7,
  "words": [
   {
    "w": "Every",
    "f0": 630,
    "f1": 630
   },
   {
    "w": "20",
    "f0": 630,
    "f1": 639
   },
   {
    "w": "minutes",
    "f0": 639,
    "f1": 649
   },
   {
    "w": "look",
    "f0": 649,
    "f1": 669
   },
   {
    "w": "20",
    "f0": 669,
    "f1": 679
   },
   {
    "w": "feet",
    "f0": 679,
    "f1": 686
   }
  ]
 },
 {
  "group": 13,
  "frameStart": 686,
  "frameEnd": 732,
  "beat": 7,
  "words": [
   {
    "w": "away",
    "f0": 686,
    "f1": 694
   },
   {
    "w": "for",
    "f0": 694,
    "f1": 708
   },
   {
    "w": "20",
    "f0": 708,
    "f1": 715
   },
   {
    "w": "seconds.",
    "f0": 715,
    "f1": 726
   }
  ]
 },
 {
  "group": 14,
  "frameStart": 744,
  "frameEnd": 795,
  "beat": 7,
  "words": [
   {
    "w": "Do",
    "f0": 744,
    "f1": 745
   },
   {
    "w": "this",
    "f0": 745,
    "f1": 752
   },
   {
    "w": "or",
    "f0": 752,
    "f1": 771
   },
   {
    "w": "it",
    "f0": 771,
    "f1": 775
   },
   {
    "w": "gets",
    "f0": 775,
    "f1": 779
   },
   {
    "w": "worse",
    "f0": 779,
    "f1": 789
   }
  ]
 },
 {
  "group": 15,
  "frameStart": 825,
  "frameEnd": 893,
  "beat": 7,
  "words": [
   {
    "w": "and",
    "f0": 825,
    "f1": 843
   },
   {
    "w": "you're",
    "f0": 843,
    "f1": 865
   },
   {
    "w": "still",
    "f0": 865,
    "f1": 866
   },
   {
    "w": "scrolling.",
    "f0": 866,
    "f1": 887
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
