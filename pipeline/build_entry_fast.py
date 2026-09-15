#!/usr/bin/env python3
"""Rebuild entry.json for a given VO timeline: real per-beat durations
(atempo applied) + fresh word-anchored captions -> entry_fast.json."""
import json, subprocess

V = '/opt/kinocut-work/convo_runs/topic_311'
FPS = 30
TEMPO = 1.10
GAP = 0.22

beats = json.load(open(f'{V}/script.json'))['beats']
caps = json.load(open(f'{V}/captions_fast.json'))

durs = {}
for b in beats:
    f = f"{V}/voice/b{b['id']}.wav"
    d = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
        '-of','csv=p=0', f], capture_output=True, text=True).stdout.strip())
    durs[b['id']] = d / TEMPO + GAP   # atempo compresses, then pad

tl = []
for gi, g in enumerate(caps['groups']):
    tl.append({'group': gi,
               'frameStart': int(g['start']*FPS),
               'frameEnd': int(g['end']*FPS)+2,
               'beat': g.get('beat'),
               'words': [{'w': w['w'], 'f0': int(w['s']*FPS), 'f1': int(w['e']*FPS)}
                          for w in g['words']]})

entry = json.load(open(f'{V}/entry.json'))
t = 0
for b in entry['beats']:
    bid = b.get('id')
    b['frames'] = int(durs[bid]*FPS)
    b['start'] = t
    t += b['frames']
entry['total_frames'] = t
entry['captions'] = tl

json.dump(entry, open(f'{V}/entry_fast.json','w'), indent=1)
print(f"entry_fast.json: {t} frames ({t/FPS:.1f}s), {len(tl)} caption groups")
