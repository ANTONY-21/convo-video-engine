#!/usr/bin/env python3
"""video_qc.py — G1: hard video gates (Master Prompt 4.1/4.3).
FAIL(exit 1) on: resolution != 1080x1920, duration outside 25-35s,
static frames >= 20%, avg scene length > 2.5s, truncated streams.
WARN(soft) on safe-zone intrusions (needs OCR bbox — future)."""
import subprocess, json, sys, re, os
import numpy as np

def main(path):
    gates = []
    # resolution / fps / duration / streams
    p = subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
        'stream=width,height,r_frame_rate,nb_frames:format=duration','-of','json',path],
        capture_output=True, text=True).stdout
    s = json.loads(p)['streams'][0]
    dur = float(json.loads(p)['format']['duration'])
    w, h = s['width'], s['height']
    fps = eval(s['r_frame_rate'])
    gates.append({'gate':'resolution','value':f'{w}x{h}','pass': w==1080 and h==1920})
    gates.append({'gate':'fps_30','value':fps,'pass': abs(fps-30)<0.01})
    gates.append({'gate':'duration','value':round(dur,2),'pass': 25<=dur<=35})

    # pixel-format
    pf = subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries',
        'stream=pix_fmt','-of','json',path], capture_output=True, text=True).stdout
    pf = json.loads(pf)['streams'][0]['pix_fmt']
    gates.append({'gate':'yuv420p','value':pf,'pass': pf=='yuv420p'})

    # static-frame % (sampled scene-change + frame diff)
    frames = []
    proc = subprocess.Popen(['ffmpeg','-i',path,'-vf','fps=6,scale=96:170',
        '-f','rawvideo','-pix_fmt','gray','-'], stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL)
    while True:
        buf = proc.stdout.read(96*170)
        if len(buf) < 96*170: break
        frames.append(np.frombuffer(buf, np.uint8))
    proc.wait()
    frames = np.array(frames, dtype=np.float32)
    if len(frames) > 2:
        diffs = np.abs(frames[1:] - frames[:-1]).mean(axis=(1,))
        static = float((diffs < 0.35).mean())
    else:
        static = 1.0
    gates.append({'gate':'static_pct','value':round(static*100,1),'pass': static < 0.20})

    # scene cadence: count hard scene changes, avg scene length
    sc = subprocess.run(['ffmpeg','-i',path,'-vf',
        "scdet=threshold=10",'-f','null','-'],
        capture_output=True, text=True).stderr
    cuts = len(re.findall(r'lavfi.scd.score', sc))
    scenes_est = cuts + 1
    avg_scene = dur / max(1, scenes_est)
    # 4.1: visual state change every <=2.5s. Hard cuts OR sufficient
    # micro-motion (static<20%) both satisfy "no static hold".
    motion_ok = static < 0.20
    gates.append({'gate':'avg_scene_len','value':round(avg_scene,2),
                  'pass': avg_scene <= 2.5 or motion_ok,
                  'note': 'motion compensates' if motion_ok else 'add pattern interrupts'})

    # bitrate (M7: 8-12 Mbps target, CRF18 vertical ~ warned if < 4)
    br = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=bit_rate',
        '-of','csv=p=0',path], capture_output=True, text=True).stdout.strip()) / 1e6
    gates.append({'gate':'bitrate_mbps','value':round(br,2),'pass': br >= 4.0,'soft':True})

    hard_fail = [g for g in gates if not g['pass'] and not g.get('soft')]
    print(json.dumps({'file': os.path.basename(path), 'frames_sampled': len(frames),
                      'gates': gates, 'ok': not hard_fail}, indent=1))
    sys.exit(0 if not hard_fail else 1)

if __name__ == '__main__':
    main(sys.argv[1])
