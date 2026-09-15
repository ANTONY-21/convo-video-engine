#!/usr/bin/env python3
"""convo2 v4 — egg conversation upgraded with convo3-style VFX + SFX.

AK request: 'virtual and sfx... add in our previous style, that eggs
conversation'. Adds to the existing egg-character build:
  AUDIO
  - drone-free urgent bed (bed_urgent_clean.wav) at 0.16 — replaces the
    droning music_bed_v4 (the 'second voice' defect)
  - SFX at beat boundaries: whoosh on scene change, pop on bubble pop-in,
    bass_hit on stat reveals, heartbeat on problem beats — all at 0.30
  VIDEO (ffmpeg-level, no Remotion re-render needed)
  - zoom-punch (2-frame 1.06x snap) on stat beats
  - white flash (2-frame) on scene changes
  QC: qc_check.py must PASS; tone-scan must be CLEAN.
Outputs: out/convo_v4_final.mp4 (+ horizontal)
"""
import json
import os
import shutil
import subprocess

PROJ = "/opt/kinocut-work/convo2_eyes"
VIDEO = f"{PROJ}/out/convo_v5_scenes.mp4"
BED = "/tmp/convo3/bed_pulse_only.wav"
SFX_DIR = "/tmp/convo3/sfx"
FINAL_V = f"{PROJ}/out/convo_v5_final.mp4"
FINAL_H = f"{PROJ}/out/convo_v5_final_horizontal.mp4"

plan = json.load(open(f"{PROJ}/scene_plan.json"))
for i, p in enumerate(plan):
    p.setdefault("start", 0)
    if i > 0:
        p["start"] = plan[i - 1]["start"] + plan[i - 1]["frames"]
acc = plan[-1]["start"] + plan[-1]["frames"]
total_s = acc / 30
print(f"total: {acc}f = {total_s:.1f}s")

# SFX choice per beat id: (sfx file)
SFX_MAP = {1: "pop", 2: "whoosh", 3: "whoosh", 4: "bass_hit",
           5: "whoosh", 6: "heartbeat"}
# VFX: beats that get zoom-punch (stat/impact beats)
ZOOM_BEATS = {2, 4}
FLASH_SCENES = {i for i in range(1, len(plan))
                if plan[i]["scene"] != plan[i - 1]["scene"]}

# ---- filtergraph -----------------------------------------------------
# inputs: 0=video, 1..N=VO, N+1=bed, N+2..=sfx (one per beat)
n_vo = len(plan)
bed_idx = 1 + n_vo

vf = []
# video VFX: per-beat zoom-punch via zoompan on trimmed segments is heavy;
# efficient approach: split video at beat boundaries, apply zoom to
# marked beats, flash on scene changes, concat.
cuts = [p["start"] for p in plan] + [acc]
seg_labels = []
for i, p in enumerate(plan):
    s_f, e_f = cuts[i], cuts[i + 1]
    vf.append(f"[0:v]trim=start={s_f / 30:.3f}:end={e_f / 30:.3f},"
              f"setpts=PTS-STARTPTS[vraw{i}]")
    if p["id"] in ZOOM_BEATS:
        # zoom-punch: 1.06x on first 6 frames of the beat, then normal
        vf.append(f"[vraw{i}]scale=2160:3840:eval=frame,"
                  f"zoompan=z='if(lte(on,6),1.06,1.0)':x='iw/2-(iw/zoom/2)':"
                  f"y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30,"
                  f"format=yuv420p[vz{i}]")
        seg_labels.append(f"[vz{i}]")
    else:
        seg_labels.append(f"[vraw{i}]")
fc_parts = [";".join(vf)]
fc_parts.append(f"{''.join(seg_labels)}concat=n={len(seg_labels)}:v=1:a=0"
                f"[vcat]")
# white flash at each scene change: 2 frames of brightness boost
if FLASH_SCENES:
    enables = "+".join(f"between(t,{cuts[i] / 30:.3f},{cuts[i] / 30 + 0.066})"
                       for i in sorted(FLASH_SCENES))
    fc_parts.append(f"[vcat]eq=brightness=0.25:enable='({enables})'[vout]")
else:
    fc_parts.append("[vcat]null[vout]")

# audio: VO chain with delays (no pitch shifts — baked at render)
filters, prev = [], "0:a"
# NOTE: input 0 has no audio in scene render; VO-only bus from scratch.
# We build the VO bus with amix of delayed VOs, then add bed + sfx.
vo_labels = []
for i, p in enumerate(plan):
    delay_ms = int(p["start"] / 30 * 1000)
    filters.append(f"[{i + 1}:a]adelay={delay_ms}|{delay_ms},"
                   f"apad=whole_dur={total_s}[l{i}]")
    vo_labels.append(f"[l{i}]")
filters.append(f"{''.join(vo_labels)}amix=inputs={n_vo}:duration=longest:"
               f"normalize=0[mvo]")
filters.append(f"[mvo]apad=whole_dur={total_s}[voxfull]")
filters.append(f"[{bed_idx}:a]aloop=loop=-1:size=2e9,atrim=0:{total_s:.3f},"
               f"volume=0.16,apad=whole_dur={total_s:.3f}[bed]")
sfx_labels = []
for i, p in enumerate(plan):
    sfx_idx = bed_idx + 1 + i
    delay_ms = int(p["start"] / 30 * 1000)
    filters.append(f"[{sfx_idx}:a]apad=whole_dur={total_s:.3f},"
                   f"adelay={delay_ms}|{delay_ms},volume=0.30[s{i}]")
    sfx_labels.append(f"[s{i}]")
filters.append(f"{''.join(sfx_labels)}amix=inputs={len(sfx_labels)}:"
               f"duration=longest:normalize=0[msfx]")
filters.append("[voxfull][msfx][bed]amix=inputs=3:duration=first:"
               "normalize=0,acompressor=threshold=-9dB:ratio=3:attack=3:"
               "release=120:makeup=2.5,volume=2.0dB,highpass=f=80,"
               "equalizer=f=3000:t=q:w=1:g=1,"
               "alimiter=limit=0.75:attack=1:release=25:level=false,"
               "aformat=channel_layouts=stereo,aresample=48000[aout]")

fc = ";".join(fc_parts + filters)
cmd = ["ffmpeg", "-y", "-v", "error", "-i", VIDEO]
for p in plan:
    cmd += ["-i", f"{PROJ}/voice/b{p['id']}.wav"]
cmd += ["-i", BED]
for p in plan:
    cmd += ["-i", f"{SFX_DIR}/{SFX_MAP[p['id']]}.wav"]
cmd += ["-filter_complex", fc, "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-t", f"{total_s:.3f}", FINAL_V]
subprocess.run(cmd, check=True)
print("vertical done:", FINAL_V, os.path.getsize(FINAL_V))

# horizontal blur-pad
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", FINAL_V,
    "-filter_complex",
    "[0:v]scale=1280:720:force_original_aspect_ratio=increase,"
    "crop=1280:720,boxblur=28:2[bg];"
    "[0:v]scale=-2:720[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy",
    FINAL_H], check=True)
print("horizontal done:", FINAL_H)
