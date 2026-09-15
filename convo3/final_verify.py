import warnings; warnings.filterwarnings('ignore')
import numpy as np
from faster_whisper import WhisperModel
from resemblyzer import VoiceEncoder, preprocess_wav

m = WhisperModel('small', device='cpu', compute_type='int8')
segs, _ = m.transcribe('/tmp/convo3/convo3_final10.mp4', language='en', vad_filter=True)
text = ' '.join(s.text.strip() for s in segs)
print('TRANSCRIPT:', text)
enc = VoiceEncoder()
ref = preprocess_wav('/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav')
vref = enc.embed_utterance(ref)
sam = preprocess_wav('/tmp/convo3/voice/b1.wav')
vsam = enc.embed_utterance(sam)
sim = float(np.dot(vref, vsam) / (np.linalg.norm(vref) * np.linalg.norm(vsam)))
print(f'identity: {sim:.3f}')
