#!/usr/bin/env python3
"""convo_upload_json.py — upload.json for conversation/story videos
(convo2 egg-style, convo3). AK: 'All should be dynamic' + upload.json is
the PRIMARY deliverable.

Reuses make_upload_json's proven LLM machinery (RunPod qwen3-8b, JSON
recovery) but sources script text from the convo beats.json/script.json
and beat timings from the actual VO files. Falls back to a deterministic
template payload if the LLM endpoint is down — never ships empty.

Usage: python3 convo_upload_json.py <proj_dir> <final_mp4> [--privacy public]
Output: <proj_dir>/upload.json
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys

sys.path.insert(0, "/root/ak-ai-company/news-engine")
from make_upload_json import llm_json  # proven LLM + JSON recovery

ENG = "/root/ak-ai-company/news-engine"


def load_beats(proj: str) -> list[dict]:
    for cand in ("script.json", "beats.json"):
        p = os.path.join(proj, cand)
        if os.path.exists(p):
            d = json.load(open(p))
            beats = d.get("beats", d if isinstance(d, list) else [])
            if beats:
                return beats
    raise FileNotFoundError(f"no script.json/beats.json in {proj}")


def vo_durations(proj: str, beats: list[dict]) -> list[float]:
    """Real VO durations (seconds) per beat, from voice dirs."""
    out = []
    for b in beats:
        for vdir in ("voice_v9", "voice", os.path.join(proj, "voice")):
            vp = os.path.join(proj, vdir, f"b{b['id']}.wav") \
                if not vdir.startswith("/") else f"{vdir}/b{b['id']}.wav"
            if os.path.exists(vp):
                r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                    "format=duration", "-of", "csv=p=0", vp],
                                   capture_output=True, text=True)
                try:
                    out.append(float(r.stdout.strip()))
                    break
                except ValueError:
                    continue
        else:
            out.append(0.0)
    return out


def chapters_from(beats: list[dict], durs: list[float]) -> list[dict]:
    t, ch = 0.0, []
    for b, d in zip(beats, durs):
        cap = b.get("caption") or b.get("vo", "")[:40]
        ch.append({"time": round(t, 1), "label": cap})
        t += d + 0.12
    return ch


def script_text(beats: list[dict]) -> str:
    return "\n".join(b.get("vo", b.get("bubble", [""])[0] if isinstance(
        b.get("bubble"), list) else str(b.get("vo", ""))) for b in beats)


def main(proj: str, final_mp4: str, privacy: str = "public") -> str:
    beats = load_beats(proj)
    durs = vo_durations(proj, beats)
    chapters = chapters_from(beats, durs)
    text = script_text(beats)
    disclaimers = ("Education only — not medical advice. "
                   "AI-generated voices and visuals.")

    prompt = f"""You generate YouTube upload metadata for a vertical eye-health
story short (AI-animated characters). Script (spoken lines):
{text}

Return ONLY JSON. ALL keys REQUIRED:
"titles": [3 options <=60 chars, front-load the hook, no clickbait lies]
"description": multi-line YouTube description with REAL newlines: best hook line;
blank line; 2-sentence summary; blank line; "In this video:" + 3 "- " bullets;
blank line; "{disclaimers}"; blank line; 5 hashtags on the last line.
"tags": 18-22 lowercase tags (eye health, screen time, 20-20-20 rule, computer
vision syndrome, dry eyes, eye care tips + related everyday queries)
"chapter_labels": [{len(chapters)} short human labels, one per beat]
"bullets": [3 viewer-benefit bullets]
"hashtags": [3 short hashtags]
"ig_caption": 2 lines + CTA + 5 hashtags, under 300 chars
"playlist": short playlist name (e.g. "Eye Health Explained")
"pinned_comment": one engaging question under 100 chars
"""
    try:
        ai = llm_json(prompt, max_tokens=3000)
        required = ["titles", "description", "tags", "chapter_labels",
                    "bullets", "hashtags", "ig_caption", "playlist",
                    "pinned_comment"]
        missing = [k for k in required if k not in ai]
        if missing:
            raise ValueError(f"LLM missing keys: {missing}")
        source = "llm"
    except Exception as e:
        print(f"[convo_upload] LLM path failed ({e}) — deterministic fallback")
        best_vo = beats[0].get("vo", "Eye health short")
        ai = {
            "titles": [best_vo[:60], "The Eye Damage You Don't Notice",
                       "Your Eyes On Screens — The Truth"],
            "description": (f"{best_vo}\n\nAn AI-animated eye-health short.\n\n"
                            f"In this video:\n- Why screens strain your eyes\n"
                            f"- The 20-20-20 rule that fixes it\n"
                            f"- The mistake most people make\n\n"
                            f"{disclaimers}\n\n"
                            f"#eyehealth #screentime #202020rule"),
            "tags": ["eye health", "screen time", "20-20-20 rule",
                     "computer vision syndrome", "dry eyes", "eye care",
                     "eye strain", "digital eye strain", "eye tips",
                     "health shorts", "eyesight", "blue light",
                     "eye protection", "vision care", "health education",
                     "eye exercise", "tired eyes", "blurry vision",
                     "shorts", "eye health tips"],
            "chapter_labels": [b.get("caption", "") for b in beats],
            "bullets": ["Why screens dry your eyes",
                        "The 20-20-20 rule that resets strain",
                        "The biggest mistake people make"],
            "hashtags": ["#eyehealth", "#screentime", "#202020rule"],
            "ig_caption": "Your eyes are paying for your screen time 👀\n"
                          "The 20-20-20 fix in 30 seconds.\n"
                          "Save this. Follow for more.\n"
                          "#eyehealth #screentime #dryeyes #visioncare #shorts",
            "playlist": "Eye Health Explained",
            "pinned_comment": "How many hours are you on screens daily? 👇",
        }
        source = "deterministic-fallback"

    payload = {
        "video_file": os.path.abspath(final_mp4),
        "thumbnail_file": None,
        "snippet": {
            "title": ai["titles"][0],
            "title_variants": ai["titles"],
            "description": ai["description"],
            "tags": ai["tags"],
            "categoryId": "27",   # Education
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
            "aiDisclosures": {
                "alteredContent": True,
                "syntheticVoice": True,
                "disclosureText": "This video uses AI-generated voice and visuals.",
            },
        },
        "chapters": [
            {"time": c["time"], "label": (ai["chapter_labels"][i]
                                          if i < len(ai.get("chapter_labels", []))
                                          else c["label"])}
            for i, c in enumerate(chapters)
        ],
        "platforms": {
            "youtube": {"title": ai["titles"][0]},
            "instagram": {"caption": ai["ig_caption"],
                          "cover_text": beats[0].get("caption", "")},
        },
        "engagement": {"playlist": ai["playlist"],
                       "pinned_comment": ai["pinned_comment"]},
        "ai": {
            "generated_by": "convo_upload_json.py",
            "metadata_source": source,
            "source_script": os.path.join(proj, "script.json"),
            "generated_at": datetime.datetime.now().isoformat(),
        },
    }
    out = os.path.join(proj, "upload.json")
    json.dump(payload, open(out, "w"), indent=1)
    print(f"upload.json written: {out} (source: {source}, "
          f"{len(payload['chapters'])} chapters)")
    return out


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2],
         sys.argv[3] if len(sys.argv) > 3 and
         sys.argv[3] in ("public", "unlisted") else "public")
