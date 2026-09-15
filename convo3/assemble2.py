import json, subprocess

PROJ = '/tmp/convo3'
doc = json.load(open(f'{PROJ}/beats_for_remotion.json'))
FPS = 30
TOTAL_F = sum(b['frames'] for b in doc['beats'])
DUR = TOTAL_F / FPS

inputs = ['-i', f'{PROJ}/convo3_visual8.mp4']
for b in doc['beats']:
    inputs += ['-i', f"{PROJ}/voice_v9/b{b["id"]}.wav"]
inputs += ['-i', '/tmp/convo3/music_bed_clean2.wav']
sfx_map = {'whoosh':0,'pop':1,'tick':2,'heartbeat':3,'glitch':4,'bass_hit':5}
sfx_paths = ['/tmp/convo3/sfx/whoosh.wav','/tmp/convo3/sfx/pop.wav','/tmp/convo3/sfx/tick.wav',
             '/tmp/convo3/sfx/heartbeat.wav','/tmp/convo3/sfx/glitch.wav','/tmp/convo3/sfx/bass_hit.wav']
for p in sfx_paths:
    inputs += ['-i', p]

fc = []
# VO bus: amix the delayed VOs. Use duration=longest EXPLICITLY.
vo_labels = []
for i, b in enumerate(doc['beats']):
    ms = round(b['start']/FPS*1000)
    slot_s = b['frames']/FPS
    boost = ',volume=3dB' if b['id'] in (1, 2) else ''
    fc.append(f"[{i+1}:a]volume=1.0{boost},atrim=0:{slot_s:.3f},adelay={ms}|{ms}[d{i}]")
    vo_labels.append(f"[d{i}]")
fc.append(f"{''.join(vo_labels)}amix=inputs={len(vo_labels)}:duration=longest:normalize=0[mvo]")
# extend VO bus to full video length (last VO may end early)
fc.append(f"[mvo]apad=whole_dur={DUR}[voxfull]")
# SFX bus: mix delayed sfx, each padded to full length first
sfx_labels = []
for n, b in enumerate(doc['beats']):
    ms = round(b['start']/FPS*1000)
    idx = 14 + sfx_map[b['sfx']]
    fc.append(f"[{idx}:a]apad=whole_dur={DUR},adelay={ms}|{ms},volume=0.45[s{n}]")
    sfx_labels.append(f"[s{n}]")
fc.append(f"{''.join(sfx_labels)}amix=inputs={len(sfx_labels)}:duration=longest:normalize=0[msfx]")
# bed full length
fc.append(f"[14:a]aloop=loop=-1:size=2e9,atrim=0:{DUR},volume=0.16,apad=whole_dur={DUR}[bed]")
# final mix: VO + SFX + bed
fc.append("[voxfull][msfx][bed]amix=inputs=3:duration=first:normalize=0,aformat=channel_layouts=stereo[out]")

cmd = ['ffmpeg','-y','-v','error'] + inputs + [
    '-filter_complex', ';'.join(fc),
    '-map','0:v','-map','[out]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000',
    '-t', f'{DUR}', f'{PROJ}/convo3_master2.mp4']
r = subprocess.run(cmd, capture_output=True, text=True)
print('rc:', r.returncode)
if r.returncode: print(r.stderr[-1200:])
