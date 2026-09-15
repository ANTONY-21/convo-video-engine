# convo-video-engine

Conversation-style viral Shorts engine — the egg-character (Xiaohei) and
kinetic narration formats, everything the defect-loop taught us baked into
code. Companion to `s2c-video-engine`.

## Layout

```
remotion/        XiaoheiConvo.tsx (egg style + PhoneScroll + EyeIcon),
                 Convo3.tsx (kinetic 14-beat), entry files
convo2/          egg build: assemble (SFX/VFX chain), build_entry,
                 number_lock, beats/scene/bubble specs
convo3/          full deterministic pipeline (voice → polish → timeline →
                 bed-scan → assemble → QC) + diagnostics
gates/           hook_system (1000-library + BrandbySid gate),
                 script_gate (Kallaway/Bitton), template_feedback (A/B
                 loop), convo_upload_json (upload.json w/ fallback)
```

## Hard-won laws encoded here (do not relearn these)

- **STALE-SOURCE LAW** — VO takes live in ONE dir; assembler must point at
  the fresh dir. Every re-script = re-render AND re-point. Guard:
  Whisper-transcribe the final mix, diff against script before delivery.
- **IDENTITY-FIRST VOICE LAW** — atempo ≤1.12 (hook), pitch NEVER corrected
  (rubberband hurt identity 0.909→0.871). Energy from ellipsis/CAPS markup
  + loudness/tone matching per take + presence EQ. Identity gate ≥0.80
  (measured 0.847–0.91); per-take timbre drift = re-roll at render with
  the identity gate, not post-fix.
- **MUSIC-BED LAW** — no tonal drone/sine/tick layers under narration.
  Sustained-tone scan (peak >8× neighborhood median) must be CLEAN; drone
  reads as a second voice ("geeeeee"), ticks read as clock clicks.
- **LIMITER-LAST LAW** — AAC overshoots TP ~+1.2dB; limiter is the LAST
  filter, ceiling −2.5dBFS, so the encode lands ≤ −2dB.
- **WATCHDOG-RACE LAW** — arm → verify-read-back → submit in one shot;
  the gpu_watchdog re-zeroes empty-queue endpoints within a minute.
- **WORKERS PATCH SHAPE** — `{"workers":{"min":N,"max":N}}` only;
  top-level `max` → 422.
- **ATRIM SLOT GUARD** — every VO hard-trimmed to its slot + 0.12s gap;
  boundary bleed = the "duplicate voices" defect.
- **CAPTION-BAND LAYOUT LAW** — overlays dodge the center caption band
  (y 780–1100) and the character row (y 980+); vision-verify on frames.
- **QC-GATE LAW** — no render ships without qc_check PASS (LUFS, TP, real
  frame count, duration) + vision pass on 2+ frames.

## Usage

```bash
# egg video (convo2): render Remotion scenes, then assemble with SFX/VFX
cd /opt/remotion-app && npx remotion render src/convo_entry.tsx XiaoheiConvo out/convo_scenes.mp4 --props=.../bubble_spec.json
python3 convo2/assemble_v4.py

# kinetic video (convo3) — full chain:
python3 convo3/convo3_pipeline.py all          # voice|assemble|all

# upload.json (dynamic, AI w/ deterministic fallback):
python3 gates/convo_upload_json.py <proj_dir> <final.mp4>

# hook gate (every channel's script path):
from gates.hook_system import make_hook          # 10-pillar gate ≥14/20
from gates.script_gate import validate_script    # Kallaway/Bitton laws
```

## Status / next

- Egg v5 + convo3 final12: QC PASS, delivered.
- Blocked: tts-v3 wedge (VO re-rolls), YouTube OAuth (publishing).
- The egg rewritten hook (WARNING template, library-grade) is scripted and
  queued for the voice pass.
