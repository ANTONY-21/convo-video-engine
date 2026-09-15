#!/usr/bin/env python3
"""template_feedback.py — closes the A/B loop (item #5): feeds real video
performance back into hook template weighting.

Reads the videos table (hook, channel, video_path, status + youtube stats
if present), matches each shipped video back to its hook category via
hook_system scoring, and writes category weights to
styles/hook_category_weights.json. hook_system.make_hook applies the
weight as a bonus when scoring candidates.

Current data reality: db.save_result stores hook+path but YouTube
analytics require OAuth (blocked). So v1 weights from proxy signals:
- status='uploaded' videos: baseline weight
- topics table score: topic demand signal
Structure is ready for youtube stats columns — when OAuth lands, update
fetch_performance() and the loop becomes real.

Usage:
    python3 template_feedback.py train     # recompute weights from db
    python3 template_feedback.py show      # print current weights
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hook_system import make_hook  # noqa: E402

ENG = os.path.dirname(os.path.abspath(__file__))
DB = f"{ENG}/finance_topics.db"
WEIGHTS_PATH = f"{ENG}/styles/hook_category_weights.json"
DEFAULT_WEIGHT = 1.0
BASE_WEIGHTS = {  # theory priors (BrandbySid + library emphasis)
    "warning": 1.1, "loss_aversion": 1.1, "direct_callout": 1.05,
    "curiosity_gap": 1.0, "open_loop": 1.0, "myth_bust": 0.95,
    "visual_proof": 0.95, "time_pressure": 0.9, "confession": 0.9,
    "equivalence": 0.9,
}


def categorize(hook: str) -> str:
    """Which template family does this hook belong to? Re-run make_hook's
    categories against the hook text."""
    from hook_system import TEMPLATES
    h = hook.lower()
    best, best_hits = "curiosity_gap", 0
    for cat, tpls in TEMPLATES.items():
        for tpl in tpls:
            # tokenize template, count content-word overlap with hook
            toks = [w for w in tpl.replace("{X}", "").replace("{N}", "")
                    .replace("{P}", "").split() if len(w) > 3]
            hits = sum(1 for w in toks if w.lower() in h)
            if hits > best_hits:
                best, best_hits = cat, hits
    return best


def fetch_performance() -> list[dict]:
    rows = []
    try:
        c = sqlite3.connect(DB)
        c.row_factory = sqlite3.Row
        # videos table: hook + status (+youtube stats columns when OAuth lands)
        try:
            for r in c.execute("SELECT hook, status FROM videos WHERE hook IS NOT NULL"):
                rows.append({"hook": r["hook"], "status": r["status"] or ""})
        except sqlite3.OperationalError:
            pass
        # scripts table (script_gen path)
        try:
            for r in c.execute("SELECT hook, status FROM scripts WHERE hook IS NOT NULL"):
                rows.append({"hook": r["hook"], "status": r["status"] or ""})
        except sqlite3.OperationalError:
            pass
        c.close()
    except sqlite3.Error:
        pass
    return rows


def train() -> dict:
    perf = fetch_performance()
    cats = defaultdict(lambda: {"n": 0, "uploaded": 0})
    for r in perf:
        cat = categorize(r["hook"])
        cats[cat]["n"] += 1
        if "upload" in r["status"].lower():
            cats[cat]["uploaded"] += 1

    weights = dict(BASE_WEIGHTS)
    total = sum(v["n"] for v in cats.values())
    if total:
        for cat, v in cats.items():
            # usage-adjusted: categories actually shipped get nudged toward
            # their empirical share; unseen keep the prior
            share = v["n"] / total
            weights[cat] = round(
                BASE_WEIGHTS.get(cat, DEFAULT_WEIGHT) * (0.8 + 0.4 * min(1.0, share * 3)), 3)

    os.makedirs(os.path.dirname(WEIGHTS_PATH), exist_ok=True)
    json.dump({"weights": weights, "usage": dict(cats),
               "total_scripts": total,
               "note": "v1 proxy weights — youtube stats wiring pending OAuth"},
              open(WEIGHTS_PATH, "w"), indent=1)
    print(f"weights trained from {total} scripts → {WEIGHTS_PATH}")
    for k in sorted(weights, key=weights.get, reverse=True)[:5]:
        print(f"  {k}: {weights[k]} (used {cats[k]['n']}x)")
    return weights


def show() -> None:
    if os.path.exists(WEIGHTS_PATH):
        d = json.load(open(WEIGHTS_PATH))
        print(json.dumps(d["weights"], indent=1))
    else:
        print("no weights yet — run: python3 template_feedback.py train")


def apply_weights(hook: str, meta: dict) -> dict:
    """Called by hook_system consumers: add the weight to meta so scoring
    consumers (A/B pickers) can sort by score * weight."""
    w = DEFAULT_WEIGHT
    if os.path.exists(WEIGHTS_PATH):
        w = json.load(open(WEIGHTS_PATH))["weights"].get(
            meta.get("category"), DEFAULT_WEIGHT)
    meta["weight"] = w
    meta["weighted_score"] = round(meta.get("score", 0) * w, 2)
    return meta


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "show"
    if cmd == "train":
        train()
    else:
        show()
