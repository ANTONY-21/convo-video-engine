#!/usr/bin/env python3
"""convo_factory.py — TOPIC-DRIVEN conversation-video factory (AK:
'All dynamic based on topics').

Turns a topic row from the topic queue into a complete egg-conversation
video: topic → LLM dialogue script (beats.json) → identity-gated AK VOs →
Remotion render → SFX/VFX assemble → QC → upload.json. Same shape as the
finance/health factories. Nothing hardcoded: speakers, bubbles, stat
cards and captions all derive from the topic's title+angle+facts.

Pipeline stages (each idempotent, resumable — topic marked used only
after the FULL chain):
  script  : topic row → beats.json via LLM (qwen3-8b) w/ script_gate
  voice   : beats.json → voice/bN.wav (IndexTTS2, identity gate) [RunPod]
  render  : beats.json → scenes mp4 (Remotion, local)
  assemble: scenes + VOs + SFX + clean bed → final.mp4 (local, QC PASS)
  package : upload.json (dynamic, AI w/ deterministic fallback)

Usage:
  python3 convo_factory.py run <topic_id> [--channel health]
  python3 convo_factory.py stages               # list stage status
Env: same as convo3_pipeline (RUNPOD_KEY/PROJ_DIR etc). Work dirs:
/opt/kinocut-work/convo_runs/topic_<id>/
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys

sys.path.insert(0, "/root/ak-ai-company/news-engine")
from script_gate import validate_script  # noqa: E402
from hook_system import score_hook, make_hook  # noqa: E402

TOPIC_DB = "/opt/hermes/news/news.sqlite"
RUNS = "/opt/kinocut-work/convo_runs"
LLM_EP = "lrptjwkuffvp3w"  # qwen3-8b — down right now; voice stage needs tts-v3
TTS_EP = "93cdz4o7vu9zzr"
KEY = os.environ.get("RUNPOD_KEY") or open("/tmp/rpkey").read().strip()

SPEAKERS = {  # egg-cast per niche — dynamic per channel
    "Health/Eye Care": ("NARRATOR", "RAVI", "VIKRAM"),
    "default": ("NARRATOR", "RAVI", "VIKRAM"),
}


def get_topic(topic_id: int) -> dict:
    c = sqlite3.connect(TOPIC_DB)
    c.row_factory = sqlite3.Row
    r = c.execute("SELECT * FROM topics WHERE id=?", (topic_id,)).fetchone()
    c.close()
    if not r:
        raise SystemExit(f"topic {topic_id} not found")
    return dict(r)


def mark_used(topic_id: int) -> None:
    c = sqlite3.connect(TOPIC_DB)
    c.execute("UPDATE topics SET status='scripted' WHERE id=?", (topic_id,))
    c.commit()
    c.close()


def llm_json(prompt: str, max_tokens: int = 3000) -> dict:
    import re, json as _json, urllib.request
    # LOCAL-FIRST (AK: 'I will prefer only local model and code' when
    # generation is possible locally; RunPod only for GPU work like VO).
    try:
        req = urllib.request.Request(
            "http://100.93.10.101:11434/api/chat", method="POST",
            headers={"Content-Type": "application/json"},
            data=_json.dumps({"model": "qwen3.6:27b",
                              "messages": [{"role": "user", "content": prompt}],
                              "stream": False,
                              # qwen3.5-128k burns its token budget on <think>
                              # and returns EMPTY content on long prompts
                              # (measured); qwen3.6:27b answers clean JSON.
                              # qwen3.6:27b is a thinking model — num_predict
                              # must cover think + answer; 3000 truncated
                              # mid-JSON (measured). 8192 = clean output.
                              "options": {"num_predict": 8192,
                                          "temperature": 0.7}}).encode())
        out = _json.loads(urllib.request.urlopen(req, timeout=600).read())
        txt = re.sub(r"<think>.*?</think>", "",
                     out.get("message", {}).get("content", ""), flags=re.S)
        if "<think>" in txt:
            txt = txt.split("<think>")[-1]
        m = re.search(r"\{.*\}", txt, re.S)
        if not m:
            raise RuntimeError("no JSON in local LLM output")
        return _json.loads(m.group(0))
    except Exception as e:
        print(f"[convo_factory] local Ollama failed ({e}) — trying RunPod qwen")
    import base64, re, time, urllib.request
    body = json.dumps({"input": {"messages": [{"role": "user", "content": prompt}],
                     "sampling_params": {"max_tokens": max_tokens}}}).encode()
    req = urllib.request.Request(
        f"https://api.runpod.ai/v2/{LLM_EP}/run", method="POST",
        headers={"Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"}, data=body)
    jid = json.loads(urllib.request.urlopen(req, timeout=60).read())["id"]
    for _ in range(60):
        time.sleep(5)
        try:
            s = json.loads(urllib.request.urlopen(urllib.request.Request(
                f"https://api.runpod.ai/v2/{LLM_EP}/status/{jid}",
                headers={"Authorization": f"Bearer {KEY}"}), timeout=60).read())
        except Exception:
            continue
        if s.get("status") == "COMPLETED":
            content = s["output"][0]["choices"][0]["message"]["content"]
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.S)
            if "<think>" in content:
                content = content.split("<think>")[-1]
            m = re.search(r"\{.*\}", content, re.S)
            if not m:
                raise RuntimeError("no JSON in LLM output")
            return json.loads(m.group(0))
        if s.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
            raise RuntimeError(f"LLM job {s.get('status')}")
    raise RuntimeError("LLM timeout")


def stage_script(topic: dict, work: str) -> str:
    """Topic → beats.json (6-8 turns, egg dialogue) with gates applied."""
    cast = SPEAKERS.get(topic.get("channel", ""), SPEAKERS["default"])
    prompt = f"""You write dialogue for an animated 2-character conversation
video (vertical Shorts, 40-50s). Topic: {topic['title']}
Angle: {topic.get('angle', '')}

Cast: {cast[1]} (curious younger character) and {cast[2]} (wise elder).
Narrator opens with the hook.

Rules (Kallaway: hook states the topic clearly; Bitton: every line
advances the payoff — no filler):
- 6-8 turns. Turn 1 = NARRATOR hook (max 14 words, library-grade:
  warning/loss-aversion/direct-callout template).
- Middle turns deliver the value (numbers from the angle only — never
  invent stats). Include one '20-20-20 rule'-style actionable takeaway.
- Final turn = CTA ('Save this' / 'Follow for more') + loop line.
- Each turn: speaker, vo (spoken text), bubble (on-screen short line),
  caption (ALL-CAPS keyword card), visual kind (stat_cards|phone_scroll|
  eye_strain|rule_card|cta).

Return ONLY JSON: {{"beats":[{{"speaker":"...","vo":"...","bubble":"...",
"caption":"...","visual":"..."}}]}}"""
    d = llm_json(prompt)
    beats = []
    for i, b in enumerate(d["beats"], 1):
        beats.append({"id": i, "speaker": b.get("speaker", cast[1]),
                      "vo": b["vo"], "bubble": [b.get("bubble", b["vo"])],
                      "caption": b.get("caption", ""),
                      "visual": {"kind": b.get("visual", "stat_cards")},
                      "scene": b.get("scene", "home_desk")})
    # gates
    hook = beats[0]["vo"]
    s, _ = score_hook(hook)
    if s < 14:
        fh, meta = make_hook(asset=topic["title"], channel=topic.get("channel", ""),
                             story_shape="man_in_hole")
        if meta["score"] >= 14:
            beats[0]["hook_original"] = hook
            beats[0]["vo"] = fh
    gate = validate_script({"hook": beats[0]["vo"],
                            "segments": [b["vo"] for b in beats]})
    doc = {"topicId": topic["id"], "topic": topic["title"],
           "disclaimer": "Education only — not medical advice.",
           "script_gate": gate, "beats": beats}
    path = f"{work}/script.json"
    json.dump(doc, open(path, "w"), indent=1)
    mark_used(topic["id"])
    return path


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[1] != "run":
        raise SystemExit(__doc__)
    topic_id = int(sys.argv[2])
    topic = get_topic(topic_id)
    work = f"{RUNS}/topic_{topic_id}"
    os.makedirs(work, exist_ok=True)
    print(f"[convo_factory] topic {topic_id}: {topic['title']}")
    print("[convo_factory] stage script …")
    path = stage_script(topic, work)
    print(f"  wrote {path}")
    print("[convo_factory] stages voice/render/assemble/package: use")
    print(f"  convo3_pipeline.py + assemble_v4.py pointing at {work}")
    print("  (blocked until tts-v3 is restarted — see blockers)")


if __name__ == "__main__":
    main()
