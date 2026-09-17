#!/usr/bin/env python3
"""Build topic 313 (rubbing eyes) entry: real VO frames + word-anchored captions.
Cloned from t312 build_entry_v4.py — emotion specs now in script."""
import json, subprocess, os, sys

V = '/opt/kinocut-work/topic_313'
FPS = 30
GAP = 0.10

import sys, os
SCRIPT = sys.argv[1] if len(sys.argv) > 1 else 'script_rub_v2.json'
_sc = json.load(open(f'{V}/{SCRIPT}'))
beats = _sc['beats']
CHARS = _sc.get('characters', 'egg')

durs = {}
for b in beats:
    f = f'{V}/voice/b{b["id"]}.wav'
    if os.path.exists(f):
        d = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
            '-of','csv=p=0', f], capture_output=True, text=True).stdout.strip())
        durs[b['id']] = d + GAP
    else:
        print('MISSING WAV beat', b['id'], file=sys.stderr)
        durs[b['id']] = b['frames'] / FPS

try:
    from faster_whisper import WhisperModel
    model = WhisperModel('base', device='cpu', compute_type='int8')
    groups = []
    for b in beats:
        wav = f'{V}/voice/b{b["id"]}.wav'
        if not os.path.exists(wav):
            continue
        segs, _ = model.transcribe(wav, word_timestamps=True)
        MISHEAR = {'tarot': 'tear it', 'tarot,': 'tear it?'}
        words = []
        for s in segs:
            for w in (s.words or []):
                ww = w.word.strip()
                ww = MISHEAR.get(ww.lower(), ww)
                words.append({'w': ww, 's': w.start, 'e': w.end})
        for w in words:
            lw = w['w'].lower().strip('.,!?')
            if lw in ('cornea', 'cornia'): w['w'] = 'cornea'
            if lw in ('carries', 'carry'): w['w'] = 'carry'
            if 'caretokeness' in lw or 'careto' in lw: w['w'] = 'KERATOCONUS...'
        STOP = {'a','an','the','and','or','that','to','of','in','on','for','your','it'}
        cur, chunks = [], []
        for w in words:
            cur.append(w)
            if len(cur) >= 2 and (cur[-1]['w'].strip('.,!?').lower() not in STOP and (len(cur) >= 6 or any(p in w['w'] for p in '.,!?'))):
                chunks.append(cur); cur = []
        if cur: chunks.append(cur)
        for ch in chunks:
            groups.append({'beat': b['id'], 'start': ch[0]['s'], 'end': ch[-1]['e'], 'words': ch})
    print('caption groups:', len(groups))
except Exception as e:
    print('whisper failed:', e, file=sys.stderr)
    groups = []

entry = {'beats': []}
t = 0
total_frames = sum(max(int(durs[b['id']] * FPS), 30) for b in beats)
for bi, b in enumerate(beats):
    is_last = bi == len(beats) - 1
    frames = max(int(durs[b['id']] * FPS), 30)
    if is_last:
        frames = min(frames, 155)
    entry['beats'].append({
        'id': b['id'], 'start': t, 'frames': frames,
        'scene': b['scene'], 'speaker': b['speaker'],
        'vo': b['vo'], 'voText': b['voText'],
        'after_visual': b.get('after_visual'),
        'bubble': b['bubble'], 'caption': b['caption'],
        'text_hook': b['caption'], 'visual': b['visual'],
        'sfx': b.get('sfx'), 'scene_label': b.get('scene_label', 'DAILY HABIT CHECK'),
    })
    t += frames
entry['total_frames'] = t

tl = []
beat_start = {b['id']: b['start'] / FPS for b in entry['beats']}
for gi, g in enumerate(groups):
    fs = int((beat_start[g['beat']] + g['start']) * FPS)
    fe = int((beat_start[g['beat']] + g['end']) * FPS) + 2
    if fe <= fs:
        fe = fs + 3
    tl.append({'group': gi, 'frameStart': fs, 'frameEnd': fe, 'beat': g['beat'],
               'words': [{'w': w['w'], 'f0': int((beat_start[g['beat']] + w['s'])*FPS),
                          'f1': int((beat_start[g['beat']] + w['e'])*FPS)} for w in g['words']]})
entry['captions'] = tl
json.dump(entry, open(f'{V}/entry_v1.json', 'w'), indent=1)

beats_json = json.dumps(entry['beats'], ensure_ascii=False, indent=1)
caps_json = json.dumps(tl, ensure_ascii=False, indent=1)
tsx = f"""import {{ registerRoot, Composition }} from 'remotion';
import React from 'react';
import {{ XiaoheiConvo }} from './XiaoheiConvo';

const CONVO = {{
 \"beats\": {beats_json},
 \"captions\": {caps_json},
 \"characters\": \"{CHARS}\",\n \"consult\": {_sc.get("consult", False) and "true" or "false"}
}};

const Wrapper: React.FC = () => {{
  (globalThis as any).__CONVO__ = CONVO;
  return <XiaoheiConvo />;
}};

export const T313Root = () => (
  <Composition id=\"XiaoheiConvo\" component={{Wrapper}}
    durationInFrames={{CONVO.beats.reduce((a, b) => a + b.frames, 0)}}
    fps={{30}} width={{1080}} height={{1920}} />
);

registerRoot(T313Root);
"""
open('/opt/remotion-app/src/t313_entry_v1.tsx','w').write(tsx)
print(f"entry: {t} frames ({t/FPS:.1f}s), {len(tl)} caption groups -> /opt/remotion-app/src/t313_entry_v1.tsx")
