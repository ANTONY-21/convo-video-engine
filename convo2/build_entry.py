#!/usr/bin/env python3
"""Build the XiaoheiConvo Remotion entry: scene plan from REAL VO durations (ffprobe),
beats.json as single source of truth, then render via npx remotion."""
import json, subprocess, os, sys

PROJ = '/opt/kinocut-work/convo2_eyes'
REM = '/opt/remotion-app'
FPS = 30

BUBBLES = {
  1: ["7 in 10 screen workers", "get eye strain"],
  2: ["My eyes are BURNING!", "4 hours of code..."],
  3: ["Your eyes are drying out", "right now, beta"],
  4: ["60% less?!", "Moisture just", "evaporates?"],
  5: ["20-20-20:", "every 20 min", "20 feet — 20 sec"],
  6: ["Education only,", "not medical advice."],
}
VISUALS = {
  1: {"kind": "stat_cards"},
  2: {"kind": "price_tag"},
  3: {"kind": "stat_cards"},
  4: {"kind": "real_rate"},
  5: {"kind": "rule72"},
  6: {"kind": "cta"},
}

def vo_durations():
    durs = {}
    for f in sorted(os.listdir(f'{PROJ}/voice')):
        if f.endswith('.wav'):
            r = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                '-of','csv=p=0', f'{PROJ}/voice/{f}'], capture_output=True, text=True)
            try: durs[f.replace('.wav','')] = float(r.stdout.strip())
            except ValueError: pass
    return durs

def main():
    b = json.load(open(f'{PROJ}/beats.json'))
    durs = vo_durations()
    missing = [bt['id'] for bt in b['beats'] if f"b{bt['id']}" not in durs]
    if missing:
        print('MISSING VO for beats:', missing); sys.exit(1)
    beats = []
    acc = 0
    for bt in b['beats']:
        bid = f"b{bt['id']}"
        secs = round(durs[bid] + 0.4, 2)
        frames = int(secs * FPS)
        beats.append({
            'id': bt['id'], 'start': acc, 'frames': frames, 'scene': bt['scene'],
            'speaker': bt['speaker'], 'bubble': BUBBLES[bt['id']], 'visual': VISUALS[bt['id']],
            'voText': bt['vo'],
        })
        acc += frames
    size = {'w': 704, 'h': 1280, 'fps': FPS}
    entry = f"""import {{ registerRoot, Composition }} from 'remotion';
import React from 'react';
import {{ XiaoheiConvo }} from './XiaoheiConvo';

const CONVO = {json.dumps({'beats': beats, 'size': size}, indent=1)};

const Wrapper: React.FC = () => {{
  (globalThis as any).__CONVO__ = CONVO;
  return <XiaoheiConvo />;
}};

export const ConvoRoot = () => (
  <Composition id="XiaoheiConvo" component={{Wrapper}}
    durationInFrames={{CONVO.beats.reduce((a, b) => a + b.frames, 0)}}
    fps={{30}} width={{1080}} height={{1920}} />
);

registerRoot(ConvoRoot);
"""
    with open(f'{REM}/src/convo_entry.tsx', 'w') as f:
        f.write(entry)
    total = acc
    json.dump(beats, open(f'{PROJ}/scene_plan.json', 'w'), indent=1)
    print(f'scenes: {len(beats)}, total frames: {total} ({total/FPS:.1f}s)')
    for bt in beats:
        print(f"  b{bt['id']} {bt['scene']} {bt['speaker']}: {bt['frames']}f")

if __name__ == '__main__':
    main()
