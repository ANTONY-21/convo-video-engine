#!/usr/bin/env python3
"""AK's audio stack (v6): tension bed / glitch+bass hook / heartbeat
problem / pop on text / whoosh on transitions."""
import subprocess, json, os

V = '/opt/kinocut-work/convo_runs/topic_311'
S = '/tmp/convo3/sfx'
e = json.load(open(f'{V}/entry_viral.json'))
total = e['total_frames']/30 + 0.25

beats = [b['start']/30 for b in e['beats']]
caps = [g['frameStart']/30 for g in e['captions']]

# whoosh on every beat TRANSITION (skip t=0, hook gets glitch+bass)
whooshes = [('whoosh', int(t*1000)) for t in beats[1:]]
# pop on every caption group START (text appearance = pop), tiny vol
pops = [('pop', int(t*1000)) for t in caps]
# glitch + bass_hit double-hit on hook
hook = [('glitch', 0), ('bass_hit', 250)]
# heartbeat loop through problem section (b2-b3, ~3.4-11.9s)
heart = [('heartbeat', int(x*1000)) for x in [3.37, 4.30, 5.23, 6.97, 7.90, 8.83, 10.0, 10.93]]
# closing bass drop
close = [('bass_drop', int(27.5*1000))]

hits = hook + whooshes + pops + heart + close
inputs, fc = [], ''
for i, (sfx, ms) in enumerate(hits):
    inputs += ['-i', f'{S}/{sfx}.wav']
    fc += f'[{i}:a]adelay={ms}|{ms}[d{i}];'
mix = ''.join(f'[d{i}]' for i in range(len(hits)))
cmd = ['ffmpeg','-y'] + inputs + [
    '-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=44100:cl=mono'] + [
    '-filter_complex', fc + f'{mix}[{len(hits)}:a]amix=inputs={len(hits)+1}:normalize=0[sfxout]',
    '-map','[sfxout]', f'{V}/out/t311_sfx_v6.wav']
r = subprocess.run(cmd, capture_output=True, text=True)
print('sfx v6:', 'OK' if r.returncode==0 else r.stderr[-200:], f'({len(hits)} hits)')
json.dump({'whooshes': [w[1]/1000 for w in whooshes],
           'pops': [p[1]/1000 for p in pops]}, open(f'{V}/out/sfx_v6_map.json','w'))
