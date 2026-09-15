"""convo3 v9 VO: loudness + presence-EQ match per beat (pitch untouched).
Anchors all takes to b12 (highest identity take) RMS; keeps natural pitch.
Output: /tmp/convo3/voice_v9/bN.wav
"""
import subprocess, wave, os
import numpy as np
import warnings; warnings.filterwarnings('ignore')


def rms(path):
    w = wave.open(path, 'rb')
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    w.close()
    a /= 32768
    return float(np.sqrt(np.mean(a**2)))


target = rms('/tmp/convo3/voice_v6/b12.wav')
os.makedirs('/tmp/convo3/voice_v9', exist_ok=True)
for i in range(1, 15):
    r = rms(f'/tmp/convo3/voice_v6/b{i}.wav')
    db = 20 * np.log10(target / r)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'/tmp/convo3/voice_v6/b{i}.wav',
        '-af', f"volume={db:.2f}dB,highpass=f=90,equalizer=f=2800:t=q:w=1:g=1.5",
        f'/tmp/convo3/voice_v9/b{i}.wav'], check=True)
    print(f'b{i}: {db:+.1f}dB')
print('voice_v9 = loudness+EQ matched, pitch untouched')
