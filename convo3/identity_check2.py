import numpy as np, subprocess
from resemblyzer import VoiceEncoder, preprocess_wav

enc = VoiceEncoder()
ref = preprocess_wav('/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav')
vref = enc.embed_utterance(ref)
sam1 = preprocess_wav('/tmp/convo3/voice_t/b1.wav')
v1 = enc.embed_utterance(sam1)
s1 = float(np.dot(vref, v1) / (np.linalg.norm(vref) * np.linalg.norm(v1)))
subprocess.run(['ffmpeg','-y','-v','error','-ss','12','-t','3','-i',
    '/opt/hermes/cache/videos/video_c632a69b5806.mp4','-map','a:0','/tmp/c7_b.wav'], check=True)
sam2 = preprocess_wav('/tmp/c7_b.wav')
v2 = enc.embed_utterance(sam2)
s2 = float(np.dot(vref, v2) / (np.linalg.norm(vref) * np.linalg.norm(v2)))
print(f'raw VO b1: {s1:.3f} | video w/ music (12-15s): {s2:.3f}')
