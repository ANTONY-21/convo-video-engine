import warnings; warnings.filterwarnings('ignore')
import numpy as np
from resemblyzer import VoiceEncoder, preprocess_wav

enc = VoiceEncoder()
ref = preprocess_wav('/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav')
vref = enc.embed_utterance(ref)
sims = {}
for i in range(1, 15):
    v = enc.embed_utterance(preprocess_wav(f'/tmp/convo3/voice_v9/b{i}.wav'))
    sims[i] = float(np.dot(vref, v) / (np.linalg.norm(vref) * np.linalg.norm(v)))
for i, s in sorted(sims.items(), key=lambda x: x[1]):
    print(f'b{i}: {s:.3f}')
print(f'MEAN {np.mean(list(sims.values())):.3f}  SPREAD {max(sims.values()) - min(sims.values()):.3f}')
