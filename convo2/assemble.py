#!/usr/bin/env python3
"""Assemble inflation_convo master:
- scene video (Remotion render, 704x1280@30)
- 8 VOs placed at scene starts; VIKRAM lines pitch-shifted -6% (asetrate*0.94 + atempo 1/0.94)
- music bed looped, ducked 0.12
Outputs vertical master 704x1280 + horizontal blur-pad 1280x720."""
import json, subprocess, os

PROJ = '/opt/kinocut-work/convo2_eyes'
VIDEO = f'{PROJ}/out/convo_v3_1080.mp4'
MUSIC = '/opt/kinocut-work/ch02_video1/audio/music_bed_v4.wav'
FINAL_V = f'{PROJ}/out/convo_v3_master.mp4'
FINAL_H = f'{PROJ}/out/convo_v3_master_horizontal.mp4'
plan = json.load(open(f'{PROJ}/scene_plan.json'))
SPEAKERS = {b['id']: b['speaker'] for b in json.load(open(f'{PROJ}/beats.json'))['beats']}

acc = 0
for p in plan:
    p['start'] = acc
    acc += p['frames']
total_s = acc / 30
print(f'total: {acc}f = {total_s:.1f}s')

# Build filtergraph. Inputs: 0=video, 1..8=VO wavs (b1..b8 in plan order), 9=music
cmd = ['ffmpeg','-y','-v','error','-i', VIDEO]
for p in plan:
    cmd += ['-i', f"{PROJ}/voice/b{p['id']}.wav"]
cmd += ['-stream_loop','-1','-i', MUSIC]

filters, prev = [], '0:a'
for i, p in enumerate(plan):
    delay_ms = int(p['start'] / 30 * 1000)
    # per-character shifts already baked into the VO files at render time
    chain = ''
    out_label = f'vo{i}'
    filters.append(
        f"[{i+1}:a]{chain}adelay={delay_ms}|{delay_ms},apad[l{i}];"
        f"[{prev}][l{i}]amix=inputs=2:duration=first:normalize=0[a{i}]")
    prev = f'a{i}'
filters.append(f"[7:a]volume=0.12,apad[m];[{prev}][m]amix=inputs=2:duration=first:normalize=0[final]")

fc = ';'.join(filters)
cmd += ['-filter_complex', fc, '-map','0:v','-map','[final]',
        '-c:v','copy','-c:a','aac','-b:a','160k','-t', str(total_s), FINAL_V]
subprocess.run(cmd, check=True)
print('vertical master done:', FINAL_V, os.path.getsize(FINAL_V))

# horizontal: blur-pad vertical into 1280x720
subprocess.run(['ffmpeg','-y','-v','error','-i', FINAL_V,
    '-filter_complex',
    "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=28:2[bg];"
    "[0:v]scale=-2:720[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2",
    '-c:v','libx264','-preset','medium','-crf','20','-c:a','copy', FINAL_H], check=True)
print('horizontal done:', FINAL_H, os.path.getsize(FINAL_H))
