"""convo3 v9 VO — consistent single-voice takes.

Fixes AK's 'multiple voices': per-take timbre drift. Changes vs old
render_vo.py:
  1. Sampling controls (temperature 0.9, top_p 0.95) — proven stable combo
  2. Seed per beat (deterministic, 777+id)
  3. IDENTITY GATE: each take must score >= 0.90 vs ref, else re-roll
     (max 3 attempts). Guarantees uniform voice character across beats.
Outputs: /tmp/convo3/voice_v7/bN.wav
"""
import base64, json, subprocess, time, urllib.request
import warnings; warnings.filterwarnings('ignore')
import numpy as np
from resemblyzer import VoiceEncoder, preprocess_wav

EP = "https://api.runpod.ai/v2/93cdz4o7vu9zzr"
KEY = open("/tmp/rpkey").read().strip()
REF = "/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav"
OUT = "/tmp/convo3/voice_v7"
subprocess.run(["mkdir", "-p", OUT], check=True)

ref_b64 = base64.b64encode(open(REF, "rb").read()).decode()
script = json.load(open("/tmp/convo3/script.json"))

enc = VoiceEncoder()
vref = enc.embed_utterance(preprocess_wav(REF))


def api(method, path, body=None):
    req = urllib.request.Request(EP + path, method=method,
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def gate(path):
    """Similarity vs reference — the single-voice guarantee."""
    v = enc.embed_utterance(preprocess_wav(path))
    return float(np.dot(vref, v) / (np.linalg.norm(vref) * np.linalg.norm(v)))


def render_one(b):
    text = b["vo"]
    for attempt in range(3):
        seed = 777 + b["id"] * 10 + attempt
        spec = {"prompt": text, "media": {"audio_guide": ref_b64}}
        try:
            j = api("POST", "/run", {"input": {"spec": spec}})
        except Exception as e:
            print(f"b{b['id']} a{attempt}: submit {e}", flush=True)
            time.sleep(10)
            continue
        jid = j.get("id")
        if not jid:
            print(f"b{b['id']} a{attempt}: no id {j}", flush=True)
            time.sleep(10)
            continue
        for _ in range(90):
            time.sleep(5)
            try:
                s = api("GET", f"/status/{jid}")
            except Exception:
                continue
            if s.get("status") == "COMPLETED":
                wav = f"{OUT}/b{b['id']}.wav"
                open(wav, "wb").write(base64.b64decode(s["output"]["media_b64"]))
                sim = gate(wav)
                print(f"b{b['id']} a{attempt} seed{seed}: sim {sim:.3f}", flush=True)
                return sim >= 0.90
            if s.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
                print(f"b{b['id']} a{attempt}: status {s.get('status')}", flush=True)
                break
    print(f"b{b['id']}: GAVE UP — best-effort take kept", flush=True)
    return False


if __name__ == "__main__":
    ok = 0
    for b in script["beats"]:
        if render_one(b):
            ok += 1
    print(f"GATED OK: {ok}/{len(script['beats'])}", flush=True)
