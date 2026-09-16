#!/usr/bin/env python3
"""
analytics_ingest.py — V1 (Master Prompt §7, §8)
Analytics ingestion pipeline: YouTube API -> win-rate table -> hook sampler feedback loop.

This is the CLOSED LOOP that makes the system self-improving:
1. Pull performance metrics from YouTube Analytics API
2. Aggregate into win-rate table (per hook formula × niche × topic)
3. Update hooks.ts weighted sampler via recordHookPerformance()
4. Retire weak hooks automatically

Usage:
  python3 analytics_ingest.py --channel ai-tech-news --days 7
  python3 analytics_ingest.py --all-channels --days 30
  python3 analytics_ingest.py --retire-weak --channel ai-tech-news
"""

import argparse
import json
import os
import sys
import sqlite3
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import requests

# ============================================================================
# CONFIG & CONSTANTS
# ============================================================================

WIN_RATE_DB = Path("/root/ak-ai-company/data/win_rate.sqlite")
YT_API_KEY = os.environ.get("YOUTUBE_API_KEY") or os.environ.get("MUAPI_API_KEY")
CHANNEL_CONFIG_DIR = Path("/opt/convo-video-engine/config/channels")

@dataclass
class VideoPerformance:
    video_id: str
    channel_id: str
    title: str
    topic: str
    hook: str
    hook_category: str
    niche: str
    views: int
    retention_3s: float
    avd_pct: float
    completion_pct: float
    rewatch_pct: float
    shares: int
    saves: int
    follows_per_1k: float
    published_at: str
    fetched_at: str

@dataclass
class WinRateEntry:
    hook_formula: str
    niche: str
    topic: str
    views: int
    retention_3s: float
    avd_pct: float
    completion_pct: float
    rewatch_pct: float
    shares: int
    saves: int
    follows_per_1k: float
    renders: int
    last_updated: str

# ============================================================================
# DATABASE INIT
# ============================================================================

def init_db():
    """Initialize SQLite database with win_rates table."""
    WIN_RATE_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(WIN_RATE_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS win_rates (
            hook_formula TEXT NOT NULL,
            niche TEXT NOT NULL,
            topic TEXT NOT NULL,
            views INTEGER DEFAULT 0,
            retention_3s REAL DEFAULT 0,
            avd_pct REAL DEFAULT 0,
            completion_pct REAL DEFAULT 0,
            rewatch_pct REAL DEFAULT 0,
            shares INTEGER DEFAULT 0,
            saves INTEGER DEFAULT 0,
            follows_per_1k REAL DEFAULT 0,
            renders INTEGER DEFAULT 0,
            last_updated TEXT,
            PRIMARY KEY (hook_formula, niche, topic)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS video_performance (
            video_id TEXT PRIMARY KEY,
            channel_id TEXT,
            title TEXT,
            topic TEXT,
            hook TEXT,
            hook_category TEXT,
            niche TEXT,
            views INTEGER,
            retention_3s REAL,
            avd_pct REAL,
            completion_pct REAL,
            rewatch_pct REAL,
            shares INTEGER,
            saves INTEGER,
            follows_per_1k REAL,
            published_at TEXT,
            fetched_at TEXT
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_win_rates_niche ON win_rates(niche)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_video_perf_channel ON video_performance(channel_id)
    """)
    conn.commit()
    conn.close()


def get_db():
    conn = sqlite3.connect(WIN_RATE_DB)
    conn.row_factory = sqlite3.Row
    return conn

# ============================================================================
# YOUTUBE ANALYTICS FETCHING
# ============================================================================

def fetch_video_list(channel_id: str, days: int = 30) -> List[Dict]:
    """Fetch recent videos for a channel via YouTube Data API."""
    if not YT_API_KEY:
        print("[WARN] No YOUTUBE_API_KEY set, skipping API fetch", file=sys.stderr)
        return []

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "channelId": channel_id,
        "maxResults": 50,
        "order": "date",
        "type": "video",
        "key": YT_API_KEY,
    }

    # Filter by date
    published_after = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
    params["publishedAfter"] = published_after

    all_videos = []
    while True:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        all_videos.extend(data.get("items", []))
        if "nextPageToken" not in data:
            break
        params["pageToken"] = data["nextPageToken"]

    return all_videos


def fetch_video_analytics(video_ids: List[str]) -> Dict[str, Dict]:
    """Fetch analytics for video IDs via YouTube Analytics API.
    Note: Requires OAuth with yt-analytics.readonly scope.
    For now, returns mock structure - integrate with real API when OAuth available.
    """
    # This requires OAuth2, not API key. Placeholder for real implementation.
    # When OAuth is set up, use:
    # https://youtubeanalytics.googleapis.com/v2/reports
    # with dimensions=video, metrics=views,estimatedMinutesWatched,averageViewDuration,...
    print(f"[INFO] Would fetch analytics for {len(video_ids)} videos (OAuth required)")
    return {vid: {} for vid in video_ids}


def fetch_video_stats(video_ids: List[str]) -> Dict[str, Dict]:
    """Fetch basic video statistics via YouTube Data API (no OAuth needed)."""
    if not YT_API_KEY or not video_ids:
        return {}

    url = "https://www.googleapis.com/youtube/v3/videos"
    stats = {}
    # Batch in chunks of 50
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i+50]
        params = {
            "part": "statistics,contentDetails,snippet",
            "id": ",".join(batch),
            "key": YT_API_KEY,
        }
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        for item in data.get("items", []):
            vid = item["id"]
            stats[vid] = {
                "views": int(item["statistics"].get("viewCount", 0)),
                "likes": int(item["statistics"].get("likeCount", 0)),
                "comments": int(item["statistics"].get("commentCount", 0)),
                "duration": item["contentDetails"].get("duration", "PT0S"),
                "title": item["snippet"].get("title", ""),
                "published_at": item["snippet"].get("publishedAt", ""),
                "tags": item["snippet"].get("tags", []),
            }
    return stats


def parse_iso_duration(duration: str) -> float:
    """Parse ISO 8601 duration (PT1M30S) to seconds."""
    import re
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration)
    if not match:
        return 0.0
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    return h * 3600 + m * 60 + s

# ============================================================================
# HOOK EXTRACTION & MATCHING
# ============================================================================

def extract_hook_from_title(title: str) -> str:
    """Extract the hook (first sentence/phrase) from video title."""
    # Hook is typically first clause before |, -, or :
    for sep in ['|', ' - ', ': ', ' — ']:
        if sep in title:
            return title.split(sep)[0].strip()
    # First sentence
    import re
    sentences = re.split(r'[.!?]', title)
    return sentences[0].strip() if sentences else title[:80]


def match_hook_category(hook: str, niche: str) -> str:
    """Match hook to a category by template similarity.
    Uses the same logic as hooks.ts sampleHookCategory.
    """
    # Python port of template matching (TEMPLATES defined below)
    hook_lower = hook.lower()
    best_cat = "warning"
    best_hits = 0

    for cat, tpls in TEMPLATES.items():
        for tpl in tpls:
            toks = tpl.replace('{X}', '').replace('{N}', '').replace('{P}', '') \
                .split()
            toks = [w for w in toks if len(w) > 3]
            hits = sum(1 for w in toks if w.lower() in hook_lower)
            if hits > best_hits:
                best_hits = hits
                best_cat = cat

    return best_cat


# Since we can't import TypeScript directly, embed the template dict here
TEMPLATES = {
    "warning": [
        'STOP doing this with {X} every single day.',
        'This is quietly damaging your {X}. And you don\'t even realize it.',
        'Things that are destroying your {X} without you realizing.',
        'If you see this in {X} stop. Now.',
    ],
    "loss_aversion": [
        'You\'ll never fix {X} if you keep doing this.',
        'If you\'re a {N} user, do NOT do this in 2026.',
        'Losing {X}? This mistake is costing you {N} right now.',
    ],
    "direct_callout": [
        'If you {P}, this video is for you.',
        'You yes YOU are doing {X} wrong.',
        'If you want {P} fixed in the next 30 seconds, keep watching.',
    ],
    "curiosity_gap": [
        'There\'s one thing about {X} nobody tells you...',
        '{X} has a hidden problem. It\'s not what you think.',
        'Everyone gets {X} wrong. The reason is stranger than you think.',
    ],
    "open_loop": [
        'Wait till you see what {X} does at the end...',
        'The biggest {X} mistake is at the end. Don\'t skip.',
        'Number {N} will change how you use {X} forever.',
    ],
    "myth_bust": [
        'Almost everyone thinks they know {X}. They don\'t.',
        'Everyone tells you {X} is the problem. Nobody shows you why.',
    ],
    "visual_proof": [
        'This is what {N} actually looks like.',
        'This is your {X} on {P}. Look closely.',
    ],
    "time_pressure": [
        'Give me 10 seconds and you\'ll never {P} again.',
        'In the next 30 seconds, you\'ll see {X} differently forever.',
    ],
    "confession": [
        'I\'ve been doing {X} wrong for years. Here\'s the fix.',
        'Nobody talks about this {X} mistake. I made it for a decade.',
    ],
    "equivalence": [
        '{N}. That\'s how much {X} is at stake.',
        '{N} of {X} gone. Every single day.',
        'More {P} than a supercomputer? {N}.',
        'This {X} has more {P} than an entire data center.',
    ],
    "before_after": [
        'Before {X}: {P}. After {X}: {N}.',
        'This is what {X} looked like 30 days ago. This is now.',
    ],
    "cheat": [
        'The {X} cheat code {N}% of people don\'t know.',
        'Stop doing {X} the hard way. This takes {N} seconds.',
    ],
    "checklist": [
        '{N} signs your {X} is failing. Check #3.',
        '{N}-point {X} audit. You\'re missing #{N}.',
    ],
    "prediction": [
        'In 2026, {X} will {P}. Here\'s why.',
        'The next {X} shift is {N} months away. Are you ready?',
    ],
    "authority": [
        '{N} experts agree: {X} is the wrong approach.',
        'Top {P} researcher reveals: {X} works backwards.',
    ],
    "contrarian": [
        'Everyone says {X}. The data says {P}.',
        'Why {X} is actually good for you (and {N} studies prove it).',
    ],
    "story_open": [
        'I lost {N} because of {X}. Don\'t make my mistake.',
        'My {X} broke on day {N}. Here\'s what I learned.',
    ],
    "question_stack": [
        'What if {X}? What if {P}? What if {N}?',
        'Why does {X} happen? The answer changes {P}.',
    ],
    "visual_metaphor": [
        '{X} is like {P} but {N}x worse.',
        'Think {X} is {P}? It\'s actually {N}.',
    ],
    "resource_lock": [
        'Save this {X} guide. You\'ll need it by {N}.',
        'The only {X} checklist you\'ll ever need. {N} steps.',
    ],
}


def load_channel_config(channel_id: str) -> Dict:
    """Load channel config to get niche."""
    config_path = CHANNEL_CONFIG_DIR / f"{channel_id}.json"
    if config_path.exists():
        with open(config_path) as f:
            return json.load(f)
    return {"niche": "default"}

# ============================================================================
# WIN-RATE TABLE OPERATIONS
# ============================================================================

def upsert_win_rate(entry: WinRateEntry):
    """Insert or update win-rate entry."""
    conn = get_db()
    conn.execute("""
        INSERT OR REPLACE INTO win_rates
        (hook_formula, niche, topic, views, retention_3s, avd_pct,
         completion_pct, rewatch_pct, shares, saves, follows_per_1k,
         renders, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        entry.hook_formula, entry.niche, entry.topic,
        entry.views, entry.retention_3s, entry.avd_pct,
        entry.completion_pct, entry.rewatch_pct, entry.shares, entry.saves,
        entry.follows_per_1k, entry.renders, entry.last_updated
    ))
    conn.commit()
    conn.close()


def get_win_rates(niche: Optional[str] = None) -> List[WinRateEntry]:
    """Get all win-rate entries, optionally filtered by niche."""
    conn = get_db()
    if niche:
        rows = conn.execute("SELECT * FROM win_rates WHERE niche = ?", (niche,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM win_rates").fetchall()
    conn.close()

    return [WinRateEntry(
        hook_formula=r["hook_formula"], niche=r["niche"], topic=r["topic"],
        views=r["views"], retention_3s=r["retention_3s"], avd_pct=r["avd_pct"],
        completion_pct=r["completion_pct"], rewatch_pct=r["rewatch_pct"],
        shares=r["shares"], saves=r["saves"], follows_per_1k=r["follows_per_1k"],
        renders=r["renders"], last_updated=r["last_updated"]
    ) for r in rows]


def record_video_performance(perf: VideoPerformance):
    """Record raw video performance for audit trail."""
    conn = get_db()
    conn.execute("""
        INSERT OR REPLACE INTO video_performance
        (video_id, channel_id, title, topic, hook, hook_category, niche,
         views, retention_3s, avd_pct, completion_pct, rewatch_pct,
         shares, saves, follows_per_1k, published_at, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        perf.video_id, perf.channel_id, perf.title, perf.topic, perf.hook,
        perf.hook_category, perf.niche, perf.views, perf.retention_3s,
        perf.avd_pct, perf.completion_pct, perf.rewatch_pct,
        perf.shares, perf.saves, perf.follows_per_1k,
        perf.published_at, perf.fetched_at
    ))
    conn.commit()
    conn.close()


def aggregate_to_win_rate(channel_id: str, days: int = 30) -> int:
    """Aggregate video performance into win-rate table."""
    config = load_channel_config(channel_id)
    niche = config.get("niche", "default")

    # Fetch videos
    videos = fetch_video_list(channel_id, days)
    if not videos:
        print(f"[WARN] No videos found for {channel_id} in last {days} days")
        return 0

    video_ids = [v["id"]["videoId"] for v in videos]
    stats = fetch_video_stats(video_ids)

    updated = 0
    now = datetime.utcnow().isoformat() + "Z"

    for video in videos:
        vid = video["id"]["videoId"]
        if vid not in stats:
            continue

        st = stats[vid]
        title = st["title"]
        hook = extract_hook_from_title(title)
        hook_cat = match_hook_category(hook, niche)
        topic = title  # Use full title as topic for now

        # Estimate retention metrics from available data
        # Real implementation would use YouTube Analytics API
        views = st["views"]
        duration_sec = parse_iso_duration(st["duration"])

        # Heuristic estimates (replace with real analytics when OAuth available)
        retention_3s = min(0.9, 0.3 + (views / 100000) * 0.3)  # proxy
        avd_pct = min(0.8, 0.2 + (views / 50000) * 0.3)
        completion_pct = min(0.7, 0.15 + (views / 50000) * 0.3)
        rewatch_pct = min(0.3, views / 200000 * 0.3)
        shares = int(views * 0.001)
        saves = int(views * 0.0005)
        follows_per_1k = min(10.0, views / 10000)

        # Record raw performance
        perf = VideoPerformance(
            video_id=vid, channel_id=channel_id, title=title, topic=topic,
            hook=hook, hook_category=hook_cat, niche=niche,
            views=views, retention_3s=retention_3s, avd_pct=avd_pct,
            completion_pct=completion_pct, rewatch_pct=rewatch_pct,
            shares=shares, saves=saves, follows_per_1k=follows_per_1k,
            published_at=st["published_at"], fetched_at=now
        )
        record_video_performance(perf)

        # Aggregate into win-rate (simple: latest overwrites, could do weighted avg)
        entry = WinRateEntry(
            hook_formula=hook, niche=niche, topic=topic,
            views=views, retention_3s=retention_3s, avd_pct=avd_pct,
            completion_pct=completion_pct, rewatch_pct=rewatch_pct,
            shares=shares, saves=saves, follows_per_1k=follows_per_1k,
            renders=1, last_updated=now
        )

        # Check existing and merge
        conn = get_db()
        existing = conn.execute(
            "SELECT * FROM win_rates WHERE hook_formula=? AND niche=? AND topic=?",
            (hook, niche, topic)
        ).fetchone()
        conn.close()

        if existing:
            # Weighted average by views
            total_views = existing["views"] + views
            entry.views = total_views
            entry.retention_3s = (
                existing["retention_3s"] * existing["views"] + retention_3s * views
            ) / total_views
            entry.avd_pct = (
                existing["avd_pct"] * existing["views"] + avd_pct * views
            ) / total_views
            entry.completion_pct = (
                existing["completion_pct"] * existing["views"] + completion_pct * views
            ) / total_views
            entry.rewatch_pct = (
                existing["rewatch_pct"] * existing["views"] + rewatch_pct * views
            ) / total_views
            entry.shares += shares
            entry.saves += saves
            entry.follows_per_1k = (
                existing["follows_per_1k"] * existing["views"] + follows_per_1k * views
            ) / total_views
            entry.renders = existing["renders"] + 1

        upsert_win_rate(entry)
        updated += 1

    print(f"[OK] Aggregated {updated} videos for {channel_id} ({niche})")
    return updated


def retire_weak_hooks(niche: str, threshold_pct: float = 0.5) -> List[str]:
    """Retire hooks below threshold of channel median follows_per_1k."""
    entries = get_win_rates(niche)
    if len(entries) < 5:
        print(f"[INFO] Not enough data for {niche} (need 5+, have {len(entries)})")
        return []

    # Calculate median follows_per_1k
    follows = sorted(e.follows_per_1k for e in entries if e.renders >= 3)
    if not follows:
        return []
    median = follows[len(follows) // 2]
    threshold = median * threshold_pct

    retired = []
    conn = get_db()
    for entry in entries:
        if entry.renders >= 3 and entry.follows_per_1k < threshold:
            conn.execute(
                "DELETE FROM win_rates WHERE hook_formula=? AND niche=? AND topic=?",
                (entry.hook_formula, entry.niche, entry.topic)
            )
            retired.append(entry.hook_formula)
    conn.commit()
    conn.close()

    if retired:
        print(f"[OK] Retired {len(retired)} weak hooks for {niche} (threshold: {threshold:.2f})")
    else:
        print(f"[INFO] No weak hooks to retire for {niche}")

    return retired


def export_win_rates_json(niche: Optional[str] = None, out_path: Optional[Path] = None):
    """Export win-rates to JSON for hooks.ts consumption."""
    entries = get_win_rates(niche)
    data = [asdict(e) for e in entries]

    if out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"[OK] Exported {len(data)} win-rate entries to {out_path}")

    return data


def print_win_rate_summary(niche: Optional[str] = None):
    """Print human-readable win-rate summary."""
    entries = get_win_rates(niche)
    if not entries:
        print(f"[INFO] No win-rate data for {niche or 'all niches'}")
        return

    print(f"\n=== Win-Rate Summary {'(' + niche + ')' if niche else '(all)'} ===")
    print(f"Total entries: {len(entries)}")

    # Group by category (approximate)
    by_cat = {}
    for e in entries:
        cat = match_hook_category(e.hook_formula, e.niche)
        if cat not in by_cat:
            by_cat[cat] = []
        by_cat[cat].append(e)

    for cat, cat_entries in sorted(by_cat.items(), key=lambda x: -len(x[1])):
        avg_follows = sum(e.follows_per_1k for e in cat_entries) / len(cat_entries)
        avg_retention = sum(e.retention_3s for e in cat_entries) / len(cat_entries)
        avg_avd = sum(e.avd_pct for e in cat_entries) / len(cat_entries)
        print(f"  {cat:20s} | n={len(cat_entries):3d} | follows/1k={avg_follows:.2f} | ret3s={avg_retention:.2f} | AVD={avg_avd:.2f}")

# ============================================================================
# HOOKS.TS INTEGRATION
# ============================================================================

def sync_to_hooks_ts():
    """Export win-rates to JSON file that hooks.ts can load.
    hooks.ts reads from WIN_RATE_DB directly, but we can also export JSON
    for environments without SQLite.
    """
    export_win_rates_json(out_path=WIN_RATE_DB.with_suffix(".json"))
    # Also export per-niche for faster loading
    for niche in ["ai_news", "ai_code", "finance", "health", "policy", "startup", "default"]:
        export_win_rates_json(niche=niche, out_path=WIN_RATE_DB.parent / f"win_rate_{niche}.json")


# ============================================================================
# MAIN CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Analytics ingestion for hook win-rate loop")
    parser.add_argument("--channel", help="Channel ID to process")
    parser.add_argument("--all-channels", action="store_true", help="Process all configured channels")
    parser.add_argument("--days", type=int, default=30, help="Days of history to fetch")
    parser.add_argument("--retire-weak", action="store_true", help="Retire weak hooks after aggregation")
    parser.add_argument("--threshold", type=float, default=0.5, help="Retirement threshold (fraction of median)")
    parser.add_argument("--summary", action="store_true", help="Print win-rate summary")
    parser.add_argument("--export", help="Export win-rates to JSON file")
    parser.add_argument("--sync", action="store_true", help="Sync win-rates to hooks.ts JSON files")

    args = parser.parse_args()

    init_db()

    if args.summary:
        if args.channel:
            config = load_channel_config(args.channel)
            print_win_rate_summary(config.get("niche", "default"))
        else:
            print_win_rate_summary()
        return 0

    if args.export:
        if args.channel:
            config = load_channel_config(args.channel)
            export_win_rates_json(niche=config.get("niche"), out_path=Path(args.export))
        else:
            export_win_rates_json(out_path=Path(args.export))
        return 0

    if args.sync:
        sync_to_hooks_ts()
        return 0

    channels = []
    if args.all_channels:
        for f in CHANNEL_CONFIG_DIR.glob("*.json"):
            channels.append(f.stem)
    elif args.channel:
        channels = [args.channel]
    else:
        parser.error("Must specify --channel or --all-channels")

    total_updated = 0
    for channel in channels:
        updated = aggregate_to_win_rate(channel, args.days)
        total_updated += updated

        if args.retire_weak:
            config = load_channel_config(channel)
            retire_weak_hooks(config.get("niche", "default"), args.threshold)

    if total_updated > 0:
        sync_to_hooks_ts()

    print(f"\n[DONE] Total videos processed: {total_updated}")
    return 0


if __name__ == "__main__":
    sys.exit(main())