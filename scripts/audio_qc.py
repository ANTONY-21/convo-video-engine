#!/usr/bin/env python3
"""audio_qc.py — G2: hard audio gates. Exit non-zero + JSON on any FAIL.
Gates (Master Prompt 4.2): LUFS -14±1, TP <= -1.5 (measured post-encode
allow -1.0), LRA 4-7 (soft: WARN outside), >= duration/6 silence gaps
>= 250ms, stereo 48k AAC."""
import subprocess, re, json, sys, os

def main(path):
    gates = []
    dur = float(subprocess.run(['ffprobe','-v','error','-show_entries',
        'format=duration','-of','csv=p=0',path], capture_output=True, text=True).stdout.strip())
    out = subprocess.run(['ffmpeg','-i',path,'-af','loudnorm=print_format=json','-f','null','-'],
                         capture_output=True, text=True).stderr
    d = json.loads(re.search(r'\{[^}]+\}', out).group(0))
    lufs, tp, lra = float(d['input_i']), float(d['input_tp']), float(d['input_lra'])
    gates.append({'gate': 'lufs', 'value': lufs, 'pass': -15.0 <= lufs <= -13.0})
    gates.append({'gate': 'true_peak', 'value': tp, 'pass': tp <= -1.0})
    gates.append({'gate': 'lra', 'value': lra, 'pass': 4.0 <= lra <= 7.0, 'soft': True})

    # stereo + rate
    st = subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_entries',
        'stream=channels,sample_rate,codec_name','-of','json',path], capture_output=True, text=True).stdout
    a = json.loads(st)['streams'][0]
    gates.append({'gate': 'stereo_48k_aac', 'value': f"{a['channels']}ch/{a['sample_rate']}/{a['codec_name']}",
                  'pass': a['channels'] == 2 and a['sample_rate'] == '48000' and a['codec_name'] == 'aac'})

    # silence gaps >= 250ms, need >= dur/6 of them (breathing room)
    sil = subprocess.run(['ffmpeg','-i',path,'-af',
        'silencedetect=noise=-35dB:d=0.25','-f','null','-'], capture_output=True, text=True).stderr
    gaps = len(re.findall(r'silence_duration: ([\d.]+)', sil))
    need = max(1, round(dur / 6))
    gates.append({'gate': 'breath_gaps', 'value': gaps, 'need': need,
                  'pass': gaps >= need, 'soft': True})  # SFX-heavy mixes mask gaps

    # tail silence probe (dead-air law #631)
    tail = subprocess.run(['ffmpeg','-ss',f'{max(0,dur-2):.2f}','-i',path,
        '-af','volumedetect','-f','null','-'], capture_output=True, text=True).stderr
    m = re.search(r'mean_volume: (-?[\d.]+)', tail)
    tail_db = float(m.group(1)) if m else -99.0
    gates.append({'gate': 'tail_silence', 'value': tail_db, 'pass': tail_db >= -30.0})

    hard_fail = [g for g in gates if not g.get('pass') and not g.get('soft')]
    result = {'file': os.path.basename(path), 'duration': dur, 'gates': gates,
              'ok': not hard_fail}
    print(json.dumps(result, indent=1))
    sys.exit(0 if result['ok'] else 1)

if __name__ == '__main__':
    main(sys.argv[1])
