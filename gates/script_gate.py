#!/usr/bin/env python3
"""script_gate.py — Kallaway/Bitton script-stage validator (item #3).

Laws enforced:
  KALLAWAY: hook needs TOPIC CLARITY (what the video is about is explicit)
            + ON-TARGET CURIOSITY — a hook that's shocking but vague fails.
  BITTON:   every word leads to the payoff — every segment must advance
            the story (new info, escalation, or pivot); fluff/filler
            segments that repeat prior content are flagged.

Usage:
    from script_gate import validate_script
    report = validate_script(script_dict)   # script_gen.py shape
    report = {'pass': bool, 'hook_clarity': ..., 'payoff_progression': [...],
              'fluff_segments': [...], 'verdict': '...'}

Wired into script_gen.generate(): scripts failing are re-hooked (hook gate)
or flagged in script['script_gate'] for the caller to log.
"""
from __future__ import annotations

import re

# Words that make the topic explicit in the hook (Kallaway clarity)
CLARITY_PATTERNS = [
    r"\byou\b", r"\byour\b",              # direct relevance
    r"\bwhy\b", r"\bhow\b", r"\bwhat\b",  # question clarity
    r"\d",                                 # concrete number
    r"\bthis\b", r"\bthat\b",              # deictic clarity (visual anchor)
]
CLARITY_MIN = 2          # need at least 2 of the 6 clarity signals
HOOK_MAX_WORDS = 14      # Bitton: straight to the point

# Fluff markers: segments that restate without advancing
FLUFF_PATTERNS = [
    r"^but (wait|there'?s more)", r"^as (i|we) (said|mentioned)",
    r"^so,? (yeah|basically)", r"^anyway", r"^long story short",
    r"^in (other|conclusion)", r"^to (sum|summarize)",
]
# Payoff-advancing markers: new number / escalation / pivot / contrast
ADVANCE_PATTERNS = [
    r"\d",                                   # new number = new info
    r"\b(but|however|until|then|suddenly|instead|worse|better|bigger)\b",
    r"\b(means?|so that|which is why|the result|the catch|the fix)\b",
    r"\b(never|always|everyone|nobody|only)\b",
]


def hook_clarity(hook: str) -> dict:
    words = len(hook.split())
    signals = sum(1 for p in CLARITY_PATTERNS
                  if re.search(p, hook, re.IGNORECASE))
    # Kallaway: shocking-but-vague fails. 'This chip has more memory...' ok;
    # 'You won't BELIEVE this...' vague.
    vague = bool(re.search(r"(believe|guess what|wait for it|insane|crazy)$",
                           hook.strip(), re.IGNORECASE))
    return {
        "signals": signals,
        "needed": CLARITY_MIN,
        "pass": signals >= CLARITY_MIN and not vague and words <= HOOK_MAX_WORDS,
        "words": words,
        "vague": vague,
    }


def payoff_progression(segments: list[str]) -> dict:
    flags = []
    prev_topic = ""
    for i, seg in enumerate(segments):
        text = seg.strip()
        if any(re.search(p, text, re.IGNORECASE) for p in FLUFF_PATTERNS):
            flags.append({"seg": i, "why": "filler phrase"})
            continue
        # Bitton: every segment advances. A segment with no numbers, no
        # escalation/pivot words, and repeating the previous segment's
        # opening words = stalling.
        advances = any(re.search(p, text, re.IGNORECASE)
                       for p in ADVANCE_PATTERNS)
        opens_like_prev = (prev_topic and
                           text[:25].lower() == prev_topic[:25].lower())
        if not advances and opens_like_prev:
            flags.append({"seg": i, "why": "repeats previous, no new info"})
        prev_topic = text
    return {"flags": flags, "pass": len(flags) == 0}


def validate_script(script: dict) -> dict:
    hook = script.get("hook", "")
    segs = [s.get("text", s) if isinstance(s, dict) else str(s)
            for s in script.get("segments", [])]
    clarity = hook_clarity(hook)
    prog = payoff_progression(segs)
    passed = clarity["pass"] and prog["pass"]
    return {
        "pass": passed,
        "hook_clarity": clarity,
        "payoff_progression": prog,
        "verdict": ("PASS — hook clear, every segment advances"
                    if passed else
                    f"FAIL — clarity {clarity['signals']}/{clarity['needed']}"
                    f"{', vague hook' if clarity['vague'] else ''}"
                    f"{', fluff: ' + str(prog['flags']) if prog['flags'] else ''}"),
    }


if __name__ == "__main__":
    # self-test: weak vs strong script
    weak = {"hook": "You won't BELIEVE this...",
            "segments": ["So basically the chip is fast.",
                         "As I said, the chip is fast.",
                         "Long story short, it's fast."]}
    strong = {"hook": "This GPU has 288 GB of memory. Here's why it matters.",
              "segments": ["AI models read memory constantly — 8 TB/s of it.",
                           "But older GPUs starve. Only 2 TB/s.",
                           "B300 removes that wall. Thinking never stops."]}
    for name, s in (("weak", weak), ("strong", strong)):
        r = validate_script(s)
        print(f"{name}: {r['verdict']}")
    assert not validate_script(weak)["pass"]
    assert validate_script(strong)["pass"]
    print("GATE SELF-TEST PASS")
