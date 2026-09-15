#!/usr/bin/env python3
"""Build entry_viral.json: 7 viral beats + real VO frames + word-anchored
captions from captions_viral.json. Then emit t311_entry_viral.tsx."""
import json, subprocess

V = '/opt/kinocut-work/convo_runs/topic_311'
FPS = 30
TEMPO = 1.10
GAP = 0.22

beats = json.load(open(f'{V}/script_viral.json'))['beats']
caps = json.load(open(f'{V}/captions_viral.json'))

durs = {}
for b in beats:
    f = f"{V}/voice_viral/b{b['id']}.wav"
    d = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
        '-of','csv=p=0', f], capture_output=True, text=True).stdout.strip())
    durs[b['id']] = d / TEMPO + GAP

tl = []
for gi, g in enumerate(caps['groups']):
    tl.append({'group': gi,
               'frameStart': int(g['start']*FPS),
               'frameEnd': int(g['end']*FPS)+2,
               'beat': g.get('beat'),
               'words': [{'w': w['w'], 'f0': int(w['s']*FPS), 'f1': int(w['e']*FPS)}
                          for w in g['words']]})

# entry beats: reuse the visual template shape; new data from script_viral
entry = {'beats': []}
t = 0
for b in beats:
    frames = int(durs[b['id']]*FPS)
    entry['beats'].append({
        'id': b['id'], 'start': t, 'frames': frames,
        'scene': b['scene'], 'speaker': b['speaker'],
        'vo': b['vo'], 'voText': b['vo'],
        'bubble': b['bubble'], 'caption': b['caption'],
        'text_hook': b['text_hook'], 'visual': b['visual'],
        'sfx': b.get('sfx'),
    })
    t += frames
entry['total_frames'] = t
entry['captions'] = tl
json.dump(entry, open(f'{V}/entry_viral.json','w'), indent=1)

# emit tsx
beats_json = json.dumps(entry['beats'], ensure_ascii=False, indent=1)
caps_json = json.dumps(tl, ensure_ascii=False, indent=1)
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

export const T311ViralRoot = () => (
  <Composition id="XiaoheiConvo" component={{Wrapper}}
    durationInFrames={{CONVO.beats.reduce((a, b) => a + b.frames, 0) + 8}}
    fps={{30}} width={{1080}} height={{1920}} />
);

registerRoot(T311ViralRoot);
"""
open('/opt/remotion-app/src/t311_entry_viral.tsx','w').write(tsx)
print(f"entry_viral: {t} frames ({t/FPS:.1f}s), {len(tl)} caption groups, tsx written")
