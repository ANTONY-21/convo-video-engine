#!/usr/bin/env python3
"""t313 consultation VOs: IndexTTS-2.5 tts-v5b, AK voice ref v6."""
import base64, json, time, urllib.request

KEY = open('/tmp/rpkey').read().strip().splitlines()[0]
REF = '/opt/hermes/voice/ak_voice_ref_v6.wav'
OUT = '/opt/kinocut-work/topic_313/voice_consult'
import os; os.makedirs(OUT, exist_ok=True)
ref_b64 = base64.b64encode(open(REF, 'rb').read()).decode()
LINES = [["b1", "This patient walks into the eye clinic with a habit that could BLIND him. Doctor, take it from here.", [0, 0, 0, 0.2, 0, 0, 0.7, 0.1]], ["b2", "Doctor, my eyes are so itchy. Rubbing them is the only thing that helps!", [0, 0, 0.5, 0.1, 0, 0.3, 0, 0.1]], ["b3", "One hard rub can TEAR your cornea. That is the clear window of your eye.", [0, 0.2, 0, 0.6, 0, 0, 0, 0.2]], ["b4", "Tear it?! What happens then?", [0, 0, 0, 0.8, 0, 0, 0.6, 0]], ["b5", "Itchiness means allergies. Use a cold compress instead. If it continues, see a doctor.", [0.3, 0, 0, 0, 0, 0, 0, 0.7]], ["b6", "Education only, not medical advice. Follow for more eye truths.", [0.6, 0, 0, 0, 0, 0, 0.3, 0.1]]]

def spec(text, emo):
    return {"input": {"spec": {
        "model_type": "index_tts2",
        "prompt": text,
        "temperature": 0.9, "top_p": 0.95, "top_k": 30,
        "repetition_penalty": 10.0,
        "emo_alpha": 1.3, "emo_vector": emo,
        "duration_factor": 1.0,
        "use_emo_text": False, "lang": "en"},
        "media": {"audio_guide": ref_b64}}}

for name, text, emo in LINES:
    req = urllib.request.Request(
        'https://api.runpod.ai/v2/zlnibmjq9d6mrl/run',
        data=json.dumps(spec(text, emo)).encode(),
        headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
    j = json.load(urllib.request.urlopen(req, timeout=30))
    jid = j['id']
    print(f'{name}: submitted {jid}', flush=True)
    for _ in range(90):
        time.sleep(5)
        r = urllib.request.Request(
            f'https://api.runpod.ai/v2/zlnibmjq9d6mrl/status/{jid}',
            headers={'Authorization': f'Bearer {KEY}'})
        st = json.load(urllib.request.urlopen(r, timeout=30))
        if st['status'] == 'COMPLETED':
            open(f'{OUT}/{name}.wav', 'wb').write(base64.b64decode(st['output']['media_b64']))
            print(f'{name}: OK', flush=True)
            break
        if st['status'] in ('FAILED', 'CANCELLED'):
            print(f'{name}: FAIL {st}', flush=True); break
print('ALL_DONE', flush=True)
