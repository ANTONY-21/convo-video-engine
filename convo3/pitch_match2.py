"""convo3 v10 VO pitch-match v2: ffmpeg rubberband pitch shift, no speed
change, verify f0 with the SAME detector on source and output.
Output: /tmp/convo3/voice_v8/bN.wav
"""
import subprocess, wave, os
import numpy as np
import warnings; warnings.filterwarnings('ignore')

ANCHOR = 121.5
os.makedirs('/tmp/convo3/voice_v8', exist_ok=True)


def f0_median(path):
    w = wave.open(path, 'rb')
    sr = w.getframerate()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    w.close()
    a /= (np.abs(a).max() + 1e-9)
    f0s = []
    win = int(sr * 0.04)
    for i in range(0, len(a) - win, win):
        seg = a[i:i+win]
        if np.sqrt(np.mean(seg**2)) < 0.03:
            continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, 'full')[win-1:]
        ac /= (ac[0] + 1e-9)
        lo, hi = int(sr/300), int(sr/60)
        if hi >= len(ac):
            continue
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] > 0.5:
            f0s.append(sr/lag)
    return float(np.median(f0s)) if f0s else ANCHOR


for i in range(1, 15):
    src = f'/tmp/convo3/voice_v6/b{i}.wav'
    f0 = f0_median(src)
    cents = 1200 * np.log2(ANCHOR / f0)   # negative = shift down
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src,
        '-af', f'rubberband=pitch={2**(cents/1200):.6f}:transients=crisp',
        f'/tmp/convo3/voice_v8/b{i}.wav'], check=True)
    after = f0_median(f'/tmp/convo3/voice_v8/b{i}.wav')
    print(f'b{i}: {f0:.1f} -> {after:.1f} Hz (cents {cents:+.1f})')
