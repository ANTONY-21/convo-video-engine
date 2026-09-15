#!/usr/bin/env python3
"""gen_t311_entry.py — regenerate t311_entry.tsx from entry.json.
entry.json carries: beats (visual data + real VO frame counts) and
captions (word-anchored timeline from word_captions.py on the REAL VO).
Regenerable forever: python3 gen_t311_entry.py  ->  src/t311_entry.tsx
"""
import json

V = '/opt/kinocut-work/convo_runs/topic_311'
OUT = '/opt/remotion-app/src/t311_entry.tsx'

entry = json.load(open(f'{V}/entry.json'))

beats_json = json.dumps(entry['beats'], ensure_ascii=False, indent=1)
caps_json = json.dumps(entry.get('captions', []), ensure_ascii=False, indent=1)
total = sum(b['frames'] for b in entry['beats'])

tsx = f"""import {{ registerRoot, Composition }} from 'remotion';
import React from 'react';
import {{ XiaoheiConvo }} from './XiaoheiConvo';

const CONVO = {{
 \"beats\": {beats_json},
 \"captions\": {caps_json}
}};

const Wrapper: React.FC = () => {{
  (globalThis as any).__CONVO__ = CONVO;
  return <XiaoheiConvo />;
}};

export const T311Root = () => (
  <Composition id="XiaoheiConvo" component={{Wrapper}}
    durationInFrames={{CONVO.beats.reduce((a, b) => a + b.frames, 0) + 30}}
    fps={{30}} width={{1080}} height={{1920}} />
);

registerRoot(T311Root);
"""

open(OUT, 'w').write(tsx)
print(f"{OUT} written: {total} frames + 30 tail, {len(entry.get('captions', []))} caption groups")
