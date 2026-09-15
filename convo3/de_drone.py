"""De-drone the convo3 music bed: notch out sustained synth tones that read
as a humming second voice ('geeeeee' at 110Hz) under the narration.
Iterates until the tone scan is clean. Output: /tmp/convo3/music_bed_clean.wav
"""
import subprocess
import numpy as np
from numpy.fft import rfft, rfftfreq


def scan(path):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-t', '8', '-i', path,
        '-ac', '1', '-ar', '48000', '-f', 's16le', '/tmp/scan3.raw'], check=True)
    a = np.frombuffer(open('/tmp/scan3.raw', 'rb').read(), dtype=np.int16).astype(np.float32)
    a /= (np.abs(a).max() + 1e-9)
    hop, win = 2400, 4800
    frames = np.array([np.abs(rfft(a[i:i+win] * np.hanning(win)))
                       for i in range(0, max(1, len(a) - win), hop)])
    med = np.median(frames, axis=0)
    freqs = rfftfreq(win, 1/48000)
    return [freqs[k] for k in range(10, len(med)-10)
            if med[k] > 8 * np.median(med[k-10:k+11]) and med[k] > 0.05]


notches = [(100,40),(110,40),(120,40),(130,40),(140,40),(150,45),(160,45),
           (170,45),(180,45),(190,40),(200,35),(210,30),(220,30),(230,30),(240,30)]
n = ",".join([f"bandreject=f={f}:width_type=h:width={w}" for f, w in notches])
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i',
    '/opt/kinocut-work/ch02_video1/audio/music_bed_v4.wav', '-af', n,
    '/tmp/convo3/music_bed_clean.wav'], check=True)
hits = scan('/tmp/convo3/music_bed_clean.wav')
print('remaining tones:', [f"{h:.0f}" for h in hits] if hits else 'CLEAN')
