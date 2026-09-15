#!/usr/bin/env python3
"""hook_system.py — the hook library wired into ONE module, used by every
channel's script generation.

AK directive (2026-09-15): 'Go use this skills for all channels'.

Sources (all previously harvested, now consolidated):
  - HOOK_1000_LIBRARY.md   20 categories, proven templates (PBL PDF)
  - Sreevignesh 5-framework playbook (research-cited triggers)
  - BrandbySid 10-pillar hook system (quality gate, >=14/20)

How it works:
  1. Pick the template CATEGORY from the story shape + channel niche
  2. Fill the slot from the topic's fact-pack (asset/number/pain)
  3. Score the hook on the 10-pillar gate (0-2 each, 20 max) —
     hooks under 14 are REJECTED and the next template is tried
  4. Every hook carries its category + score for A/B tracking

Usage:
    from hook_system import make_hook
    hook, meta = make_hook(niche="ai_news", asset="GPT-6",
                           pain="context window limits",
                           number="10M tokens", story_shape="man_in_hole")
"""
from __future__ import annotations

import json
import re
from pathlib import Path

LIBRARY = Path("/root/ak-ai-company/news-engine/styles/HOOK_1000_LIBRARY.md")

# --- category -> template pool (slot = {X}) ---------------------------------
# Story-shape routing (Man-in-Hole -> loss/warning, Creation -> educational,
# Cinderella -> before/after) per the library's own wiring rule.
TEMPLATES: dict[str, list[str]] = {
    "warning": [
        "STOP doing this with {X}… every single day.",
        "This is quietly damaging your {X}. And you don't even realize it.",
        "Things that are destroying your {X} without you realizing.",
        "If you see this in {X} — stop. Now.",
    ],
    "loss_aversion": [
        "You'll never fix {X} if you keep doing this.",
        "If you're a {N} user, do NOT do this in 2026.",
        "Losing {X}? This mistake is costing you {N} right now.",
    ],
    "direct_callout": [
        "If you {P}, this video is for you.",
        "You — yes YOU — are doing {X} wrong.",
        "If you want {P} fixed in the next 30 seconds, keep watching.",
    ],
    "curiosity_gap": [
        "There's one thing about {X} nobody tells you…",
        "{X} has a hidden problem. It's not what you think.",
        "Everyone gets {X} wrong. The reason is stranger than you think.",
    ],
    "open_loop": [
        "Wait till you see what {X} does at the end…",
        "The biggest {X} mistake is at the end. Don't skip.",
        "Number {N} will change how you use {X} forever.",
    ],
    "myth_bust": [
        "Almost everyone thinks they know {X}. They don't.",
        "Everyone tells you {X} is the problem. Nobody shows you why.",
    ],
    "visual_proof": [
        "This is what {N} actually looks like.",
        "This is your {X} on {P}. Look closely.",
    ],
    "time_pressure": [
        "Give me 10 seconds and you'll never {P} again.",
        "In the next 30 seconds, you'll see {X} differently forever.",
    ],
    "confession": [
        "I've been doing {X} wrong for years. Here's the fix.",
        "Nobody talks about this {X} mistake. I made it for a decade.",
    ],
    "equivalence": [
        "{N}. That's how much {X} is at stake.",
        "{N} of {X} — gone. Every single day.",
    ],
}

# Story shape -> preferred categories (ordered)
SHAPE_ROUTING = {
    "man_in_hole": ["warning", "loss_aversion", "direct_callout", "curiosity_gap"],
    "creation": ["curiosity_gap", "myth_bust", "visual_proof", "equivalence"],
    "cinderella": ["before_after" and "visual_proof", "equivalence", "time_pressure"],
    "default": ["warning", "curiosity_gap", "direct_callout", "open_loop"],
}

# Channel niche -> category bias (extra weight on top of story shape)
NICHE_BIAS = {
    "ai_news": ["myth_bust", "equivalence", "time_pressure"],
    "ai_code": ["direct_callout", "confession", "cheat" ],
    "finance": ["loss_aversion", "warning", "equivalence"],
    "health": ["warning", "direct_callout", "confession"],
    "policy": ["warning", "curiosity_gap", "myth_bust"],
    "startup": ["equivalence", "time_pressure", "confession"],
}

# --- BrandbySid 10-pillar gate (0-2 each, 20 max, pass >= 14) ---------------
PILLARS = {
    "grab_attention": r"(stop|wait|wrong|warning|never|don't|biggest|burning|killing)",
    "curiosity":      r"(\…|\.\.\.|hidden|nobody|secret|why|what)",
    "relevance":      r"(you|your|you're)",
    "value_early":    r"(fix|here's|this is how|in \d+ seconds?)",
    "expectation":    r"(end|forever|differently|keep watching|don't skip)",
    "audience":       r"(you|your)",
    "angle":          r"(nobody|everyone|almost|hidden|quietly)",
    "craft":          r"^[^,;]{10,70}$",       # short, sharp, readable
    "testable":       r".",                    # always 1 — A/B store does the rest
    "placement":      r".",                    # always 1 — burned as first line
}


def score_hook(hook: str) -> tuple[int, dict]:
    total = 0
    detail = {}
    h = hook.lower()
    for pillar, pat in PILLARS.items():
        hit = 2 if re.search(pat, h) else 0
        detail[pillar] = hit
        total += hit
    return total, detail


def _niche_of(channel: str) -> str:
    c = channel.lower()
    for key in NICHE_BIAS:
        if key in c:
            return key
    return "default"


def make_hook(asset: str, pain: str = "", number: str = "",
              channel: str = "", story_shape: str = "default",
              slot_map: dict | None = None, prefer: str = "") -> tuple[str, dict]:
    """Return (hook, meta). Tries templates in shape+niche priority order,
    scores each, returns the first that passes the 14/20 gate (or the
    highest-scoring fallback if none pass — flagged in meta)."""
    niche = _niche_of(channel)
    cats: list[str] = []
    if prefer and prefer in TEMPLATES:
        cats.append(prefer)
    for c in SHAPE_ROUTING.get(story_shape, SHAPE_ROUTING["default"]):
        if c not in cats:
            cats.append(c)
    for c in NICHE_BIAS.get(niche, []):
        if c not in cats:
            cats.append(c)

    fills = {"X": asset, "P": pain or f"use {asset}", "N": number or "10x",
             **(slot_map or {})}

    best, best_score, best_cat = "", -1, ""
    for cat in cats:
        for tpl in TEMPLATES.get(cat, []):
            try:
                hook = tpl.format(**fills)
            except (KeyError, IndexError):
                continue
            s, _ = score_hook(hook)
            if s > best_score:
                best, best_score, best_cat = hook, s, cat
            if s >= 14:
                return hook, {"category": cat, "score": s, "gate": "PASS",
                              "niche": niche, "shape": story_shape}
    return best, {"category": best_cat, "score": best_score, "gate": "FALLBACK",
                  "niche": niche, "shape": story_shape}


def hook_for_topic_row(row: dict) -> tuple[str, dict]:
    """Adapter for finance_topics.py / db topic rows:
    row = {asset/topic, angle, event, ...}"""
    asset = row.get("asset") or row.get("topic") or row.get("title", "this")
    event = (row.get("event") or row.get("angle") or "").lower()
    shape = ("man_in_hole" if any(w in event for w in
             ("crash", "warning", "danger", "trap", "bubble"))
             else "default")
    return make_hook(asset=asset, channel=row.get("channel", ""),
                     number=row.get("number", ""),
                     story_shape=shape)


if __name__ == "__main__":
    # self-test: 4 channels, both shapes, gate must hold
    tests = [
        ("ai_news", "GPT-6", "man_in_hole"),
        ("finance", "Bitcoin", "man_in_hole"),
        ("health", "eye strain", "default"),
        ("ai_code", "Claude Code", "creation"),
    ]
    for ch, asset, shape in tests:
        hook, meta = make_hook(asset=asset, channel=ch, story_shape=shape,
                               number="2.4M", pain="ship faster")
        print(f"[{ch}/{shape}] ({meta['category']}, {meta['score']}/20 {meta['gate']})")
        print(f"  {hook}")
        assert meta["score"] >= 14, "gate failed"
    print("ALL GATE PASS")
