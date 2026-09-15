import numpy as np, subprocess
from resemblyzer import VoiceEncoder, preprocess_wav

enc = VoiceEncoder()
ref = preprocess_wav('/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav')
vref = enc.embed_utterance(ref)
subprocess.run(['ffmpeg','-y','-v','error','-t','3','-i',
    '/opt/hermes/cache/videos/video_c632a69b5806.mp4','-map','a:0','/tmp/c7_a.wav'], check=True)
sam = preprocess_wav('/tmp/c7_a.wav')
vsam = enc.embed_utterance(sam)
sim = float(np.dot(vref, vsam) / (np.linalg.norm(vref)*np.linalg.norm(vsam)))
print(f'IDENTITY SIMILARITY: {sim:.3f} (gate >=0.80)')
