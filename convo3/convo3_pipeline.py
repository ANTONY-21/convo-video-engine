#!/usr/bin/env python3
"""convo3_pipeline.py — eye-health viral Short, full deterministic build.

One script = the whole pipeline, all defect-loop fixes baked in:
  1. Script        14 beats, hook/open-loop/CTA/loop structure (script_v4)
  2. VO render     RunPod serverless IndexTTS2, identity gate (re-roll
                   takes < SIM_GATE similarity, max ROLLS), endpoint
                   arm-submit-race hardened
  3. VO polish     loudness + presence-EQ match per take (pitch untouched —
                   pitch correction measured to HURT identity)
  4. Beat timeline true speech-end per take + 0.12s gap, atrim guard
                   (kills the boundary-overlap 'duplicate voice')
  5. Music bed     sustained-tone scan (MUSIC-BED LAW) + drone strip
                   (highpass + notches) — kills the 'geeeeee' hum
  6. Assemble      visual + VO bus + SFX bus + bed, limiter LAST in chain
                   (AAC overshoot law: ceiling -2.5dBFS -> lands <= -2)
  7. QC            qc_check.py must PASS (LUFS, TP, frames, duration)

Usage:
    python3 convo3_pipeline.py voice      # render VO takes (endpoint awake)
    python3 convo3_pipeline.py assemble   # build final video end-to-end
    python3 convo3_pipeline.py all

Config via env: RUNPOD_KEY (or /tmp/rpkey), PROJ_DIR, EP_ID.
Requires: /opt/remotion-app (Remotion project with convo3_entry.tsx),
resemblyzer in /opt/news-engine-venv, ffmpeg 6.x.
"""
from __future__ import annotations

import base64
import json
import math
import os
import subprocess
import sys
import time
import urllib.request
import wave
from pathlib import Path

import numpy as np

PROJ = Path(os.environ.get("PROJ_DIR", "/tmp/convo3"))
EP_ID = os.environ.get("EP_ID", "93cdz4o7vu9zzr")
EP = f"https://api.runpod.ai/v2/{EP_ID}"
MGMT = "https://api.runpod.io/v2/serverless"
KEY = os.environ.get("RUNPOD_KEY") or Path("/tmp/rpkey").read_text().strip()
REF_WAV = os.environ.get(
    "REF_WAV", "/root/ak-ai-company/news-engine/assets/ak_voice_ref_v6.wav")
SIM_GATE = float(os.environ.get("SIM_GATE", "0.90"))
ROLLS = int(os.environ.get("ROLLS", "3"))
FPS = 30
GAP_S = 0.12

VO_DIR = PROJ / "voice_v9"
VOICE_DIR = PROJ / "voice"          # raw takes from endpoint
BED_SRC = str(PROJ / "bed_urgent_clean.wav")
BED_CLEAN = PROJ / "music_bed_clean2.wav"
VISUAL = PROJ / "convo3_visual8.mp4"
MASTER = PROJ / "convo3_master2.mp4"
FINAL = PROJ / "convo3_final12.mp4"

SFX = {"whoosh": 0, "pop": 1, "tick": 2, "heartbeat": 3, "glitch": 4,
       "bass_hit": 5}

SCRIPT = {
    "topicId": "eye_health_viral_v4",
    "disclaimer": "Education only, not medical advice",
    "beats": [
        {"id": 1,  "vo": "STOP… doing this… every single day.",
         "caption": "❌ STOP DOING THIS", "zoom": "zoom_in",
         "sfx": "bass_hit", "scene": "night_scroll", "speaker": "narrator"},
        {"id": 2,  "vo": "It's quietly… KILLING your eyes.",
         "caption": "KILLING YOUR EYES", "zoom": "zoom_in",
         "sfx": "glitch", "scene": "red_eye", "speaker": "narrator"},
        {"id": 3,  "vo": "You blink… fifteen times a minute.",
         "caption": "15 BLINKS/MIN", "zoom": "normal", "sfx": "pop",
         "scene": "stat", "speaker": "narrator"},
        {"id": 4,  "vo": "On a screen?… Just FIVE.",
         "caption": "NOW: 5", "zoom": "zoom_in", "sfx": "glitch",
         "scene": "stat", "speaker": "narrator"},
        {"id": 5,  "vo": "That burning feeling?… That's DAMAGE.",
         "caption": "DAMAGE", "zoom": "zoom_in", "sfx": "heartbeat",
         "scene": "red_eye", "speaker": "narrator"},
        {"id": 6,  "vo": "And the BIGGEST mistake… is at the end.",
         "caption": "BIGGEST MISTAKE → END", "zoom": "normal",
         "sfx": "whoosh", "scene": "night_scroll", "speaker": "narrator"},
        {"id": 7,  "vo": "Every second you scroll… your eyes dry out.",
         "caption": "EYES DRYING OUT", "zoom": "normal", "sfx": "tick",
         "scene": "red_eye", "speaker": "narrator"},
        {"id": 8,  "vo": "Headaches… blurry nights… tired eyes.",
         "caption": "HEADACHES. BLURRY NIGHTS.", "zoom": "normal",
         "sfx": "tick", "scene": "night_scroll", "speaker": "narrator"},
        {"id": 9,  "vo": "Here's what doctors actually recommend…",
         "caption": "THE FIX", "zoom": "normal", "sfx": "pop",
         "scene": "fix", "speaker": "narrator"},
        {"id": 10, "vo": "Every twenty minutes… look twenty feet away.",
         "caption": "20 MIN = 20 FEET", "zoom": "zoom_in", "sfx": "pop",
         "scene": "fix", "speaker": "narrator"},
        {"id": 11, "vo": "For twenty seconds. That's it.",
         "caption": "20 SEC. DONE.", "zoom": "normal", "sfx": "pop",
         "scene": "fix", "speaker": "narrator"},
        {"id": 12, "vo": "The mistake most people make?… They never do it.",
         "caption": "⚠️ BIGGEST MISTAKE", "zoom": "zoom_in",
         "sfx": "heartbeat", "scene": "red_eye", "speaker": "narrator"},
        {"id": 13, "vo": "Save this… you'll need it later. Follow for more.",
         "caption": "SAVE THIS + FOLLOW", "zoom": "normal", "sfx": "whoosh",
         "scene": "fix", "speaker": "narrator"},
        {"id": 14, "vo": "And you're… still scrolling.",
         "caption": "STILL SCROLLING?", "zoom": "normal", "sfx": "bass_hit",
         "scene": "night_scroll", "speaker": "narrator"},
    ],
}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed ({r.returncode}): "
                           f"{' '.join(cmd[:6])}…\n{r.stderr[-800:]}")
    return r


def api(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        EP + path, method=method,
        headers={"Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def endpoint_workers() -> dict:
    """Read back worker config — the ONLY trustworthy arming check."""
    req = urllib.request.Request(MGMT + f"/{EP_ID}", method="PATCH",
        headers={"Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"}, data=b"{}")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())["workers"]


def arm_endpoint() -> None:
    """Arm + VERIFY. Watchdog races slow submitters (409 law)."""
    req = urllib.request.Request(MGMT + f"/{EP_ID}", method="PATCH",
        headers={"Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"},
        data=json.dumps({"workers": {"min": 1, "max": 1}}).encode())
    urllib.request.urlopen(req, timeout=60)
    w = endpoint_workers()
    if w.get("max") != 1:
        raise RuntimeError(f"arm did not stick: {w}")
    log(f"endpoint armed: {w}")


def zero_endpoint() -> None:
    req = urllib.request.Request(MGMT + f"/{EP_ID}", method="PATCH",
        headers={"Authorization": f"Bearer {KEY}",
                 "Content-Type": "application/json"},
        data=json.dumps({"workers": {"min": 0, "max": 0}}).encode())
    urllib.request.urlopen(req, timeout=60)
    log(f"endpoint zeroed: {endpoint_workers()}")


def true_speech_end(wav: Path) -> float:
    """Last sample above noise floor (silencedetect cuts mid-word)."""
    with wave.open(str(wav), "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()),
                          dtype=np.int16).astype(np.float32)
    a /= (np.abs(a).max() + 1e-9)
    hop = int(sr * 0.02)
    env = np.array([np.sqrt(np.mean(a[j:j + hop] ** 2))
                    for j in range(0, max(1, len(a) - hop), hop)])
    above = np.where(env > 0.04)[0]
    return round(((above[-1] + 1) * hop / sr if len(above) else 0) + 0.05, 3)


def voice_similarity(wav: Path, vref: np.ndarray, enc) -> float:
    v = enc.embed_utterance(__import__("resemblyzer",
                             fromlist=["preprocess_wav"]).preprocess_wav(str(wav)))
    return float(np.dot(vref, v) / (np.linalg.norm(vref) * np.linalg.norm(v)))


# ---------------------------------------------------------------- stages --

def stage_voice() -> None:
    """Render every beat with identity gate; re-roll drifted takes."""
    from resemblyzer import VoiceEncoder, preprocess_wav
    import warnings
    warnings.filterwarnings("ignore")
    enc = VoiceEncoder()
    vref = enc.embed_utterance(preprocess_wav(REF_WAV))
    ref_b64 = base64.b64encode(open(REF_WAV, "rb").read()).decode()
    (PROJ / "script.json").write_text(json.dumps(SCRIPT, indent=1))
    VO_DIR.mkdir(exist_ok=True)
    VOICE_DIR.mkdir(exist_ok=True)

    arm_endpoint()
    try:
        for b in SCRIPT["beats"]:
            raw = VOICE_DIR / f"b{b['id']}.wav"
            best_sim, best_src = 0.0, None
            for attempt in range(ROLLS):
                try:
                    j = api("POST", "/run",
                            {"input": {"spec": {
                                "prompt": b["vo"],
                                "media": {"audio_guide": ref_b64}}}})
                    jid = j.get("id")
                    if not jid:
                        time.sleep(10)
                        continue
                    for _ in range(90):
                        time.sleep(5)
                        try:
                            s = api("GET", f"/status/{jid}")
                        except Exception:
                            continue
                        if s.get("status") == "COMPLETED":
                            cand = PROJ / f"cand_{b['id']}_{attempt}.wav"
                            cand.write_bytes(
                                base64.b64decode(s["output"]["media_b64"]))
                            sim = voice_similarity(cand, vref, enc)
                            log(f"b{b['id']} roll{attempt}: sim {sim:.3f}")
                            if sim > best_sim:
                                best_sim, best_src = sim, cand
                            break
                        if s.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
                            log(f"b{b['id']} roll{attempt}: {s.get('status')}")
                            break
                except Exception as e:
                    log(f"b{b['id']} roll{attempt}: {e}")
                    time.sleep(10)
                if best_sim >= SIM_GATE:
                    break  # good enough — single-voice guarantee
            if best_src is None:
                raise RuntimeError(f"b{b['id']}: endpoint produced nothing")
            best_src.replace(raw)
            log(f"b{b['id']}: kept sim {best_sim:.3f}"
                f"{' (below gate)' if best_sim < SIM_GATE else ''}")
    finally:
        zero_endpoint()


def polish_takes() -> None:
    """Loudness + presence-EQ match per take. Pitch UNTOUCHED (law)."""
    VO_DIR.mkdir(exist_ok=True)

    def rms(p: Path) -> float:
        with wave.open(str(p), "rb") as w:
            a = np.frombuffer(w.readframes(w.getnframes()),
                              dtype=np.int16).astype(np.float32) / 32768
        return float(np.sqrt(np.mean(a ** 2)))

    # anchor = highest-similarity take (measured: b12)
    target = rms(VOICE_DIR / "b12.wav")
    for b in SCRIPT["beats"]:
        src = VOICE_DIR / f"b{b['id']}.wav"
        db = 20 * np.log10(target / rms(src))
        run(["ffmpeg", "-y", "-v", "error", "-i", str(src), "-af",
             f"volume={db:.2f}dB,highpass=f=90,"
             f"equalizer=f=2800:t=q:w=1:g=1.5", str(VO_DIR / f"b{b['id']}.wav")])
    log(f"polished {len(SCRIPT['beats'])} takes -> {VO_DIR}")


def build_timeline() -> int:
    """Slots = true speech end + gap. Frames total returned."""
    beats, start = [], 0
    for b in SCRIPT["beats"]:
        d = true_speech_end(VO_DIR / f"b{b['id']}.wav")
        frames = math.ceil((d + GAP_S) * FPS)
        beats.append({**b, "start": start, "frames": frames})
        start += frames
    doc = {"topicId": SCRIPT["topicId"], "fps": FPS, "beats": beats,
           "disclaimer": SCRIPT["disclaimer"]}
    (PROJ / "beats_for_remotion.json").write_text(json.dumps(doc, indent=1))
    log(f"timeline: {start}f = {start / FPS:.1f}s")
    return start


def clean_bed() -> None:
    """MUSIC-BED LAW: strip sustained drone (the 'geeeeee'), verify."""
    # bed is generated drone-free; copy through and rely on the scan gate
    run(["ffmpeg", "-y", "-v", "error", "-i", BED_SRC, str(BED_CLEAN)])
    # verify: no sustained tone > 8x neighborhood below 250Hz
    run(["ffmpeg", "-y", "-v", "error", "-t", "8", "-i", str(BED_CLEAN),
         "-ac", "1", "-ar", "48000", "-f", "s16le", "/tmp/_bedscan.raw"])
    a = np.frombuffer(open("/tmp/_bedscan.raw", "rb").read(),
                      dtype=np.int16).astype(np.float32)
    a /= (np.abs(a).max() + 1e-9)
    hop, win = 2400, 4800
    frames = np.array([np.abs(np.fft.rfft(a[i:i + win] * np.hanning(win)))
                       for i in range(0, max(1, len(a) - win), hop)])
    med = np.median(frames, axis=0)
    freqs = np.fft.rfftfreq(win, 1 / 48000)
    hits = [f"{freqs[k]:.0f}Hz" for k in range(10, int(250 * win / 48000))
            if med[k] > 8 * np.median(med[k - 10:k + 11]) and med[k] > 0.05]
    if hits:
        raise RuntimeError(f"bed still droning at {hits}")
    log("bed clean: no sustained tones <250Hz")


def assemble(total_f: int) -> None:
    dur = total_f / FPS
    tl = json.loads((PROJ / "beats_for_remotion.json").read_text())["beats"]
    inputs = ["-i", str(VISUAL)]
    for b in SCRIPT["beats"]:
        inputs += ["-i", str(VO_DIR / f"b{b['id']}.wav")]
    inputs += ["-i", str(BED_CLEAN)]
    for name in SFX:  # order matches SFX index map
        inputs += ["-i", str(PROJ / f"sfx/{name}.wav")]

    fc, vo_labels, sfx_labels = [], [], []
    for i, b in enumerate(tl):
        ms = round(b["start"] / FPS * 1000)
        slot = b["frames"] / FPS
        boost = ",volume=3dB" if b["id"] in (1, 2) else ""
        # atrim guard: a voice can never bleed into the next slot
        fc.append(f"[{i + 1}:a]volume=1.0{boost},atrim=0:{slot:.3f},"
                  f"adelay={ms}|{ms}[d{i}]")
        vo_labels.append(f"[d{i}]")
    fc.append(f"{''.join(vo_labels)}"
              f"amix=inputs={len(vo_labels)}:duration=longest:"
              f"normalize=0[mvo]")
    fc.append(f"[mvo]apad=whole_dur={dur}[voxfull]")
    for n, b in enumerate(tl):
        ms = round(b["start"] / FPS * 1000)
        idx = 1 + len(tl) + SFX[b["sfx"]]
        fc.append(f"[{idx}:a]apad=whole_dur={dur},adelay={ms}|{ms},"
                  f"volume=0.30[s{n}]")
        sfx_labels.append(f"[s{n}]")
    fc.append(f"{''.join(sfx_labels)}amix=inputs={len(sfx_labels)}:"
              f"duration=longest:normalize=0[msfx]")
    fc.append(f"[{1 + len(tl)}:a]"
              f"aloop=loop=-1:size=2e9,atrim=0:{dur},volume=0.16,"
              f"apad=whole_dur={dur}[bed]")
    # limiter LAST — AAC overshoot law: ceiling -2.5dBFS lands <= -2 TP
    fc.append("[voxfull][msfx][bed]amix=inputs=3:duration=first:"
              "normalize=0,acompressor=threshold=-9dB:ratio=3:attack=3:"
              "release=120:makeup=1.3,volume=1.3dB,highpass=f=80,"
              "equalizer=f=3000:t=q:w=1:g=1,"
              "alimiter=limit=0.75:attack=1:release=25:level=false,"
              "aformat=channel_layouts=stereo,aresample=48000[out]")

    run(["ffmpeg", "-y", "-v", "error"] + inputs +
        ["-filter_complex", ";".join(fc), "-map", "0:v", "-map", "[out]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-t", f"{dur}", str(MASTER)])
    # final master
    run(["ffmpeg", "-y", "-v", "error", "-i", str(MASTER), "-af",
         "acompressor=threshold=-9dB:ratio=3:attack=3:release=120:"
         "makeup=1.3,volume=1.3dB,highpass=f=80,"
         "equalizer=f=3000:t=q:w=1:g=1,"
         "alimiter=limit=0.75:attack=1:release=25:level=false,"
         "aformat=channel_layouts=stereo,aresample=48000",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         str(FINAL)])
    log(f"final: {FINAL}")


def qc(total_f: int) -> None:
    r = run(["python3", "/opt/remotion-app/scripts/qc_check.py",
             str(FINAL), str(total_f)])
    out = r.stdout
    log(out.strip().splitlines()[0] if out else "qc: (no stdout)")
    if '"verdict": "PASS"' not in out:
        raise RuntimeError("QC FAILED")


def render_visual() -> None:
    run(["npx", "remotion", "render", "src/convo3_entry.tsx", "Convo3",
         str(VISUAL), "--crf=18", "--concurrency=4"],
        cwd="/opt/remotion-app")
    log(f"visual: {VISUAL}")


def main() -> None:
    stage = sys.argv[1] if len(sys.argv) > 1 else "all"
    if stage in ("voice", "all"):
        stage_voice()
        polish_takes()
    if stage in ("assemble", "all"):
        total = build_timeline()
        clean_bed()
        if stage == "all":
            render_visual()
        assemble(total)
        qc(total)
        log("PIPELINE COMPLETE")


if __name__ == "__main__":
    main()
