#!/usr/bin/env python3
"""
trend_pull.py — V1 (Master Prompt §3, §8)
Weekly niche trend pull -> topic queue.

Pulls trending signals from multiple sources using AK's news-engine modules directly:
- Google Trends (via trending.py)
- AK's news corpus (via trending.py + news_search equivalent)
- YouTube/Reddit/GitHub signals (via trending.py trending_signals)
- GitHub starred repos (via github-stars-intelligence)
- OSINT content (via osint MCP or direct)

Feeds into topic_queue via topic_save for the content pipeline.

Usage:
  python3 trend_pull.py --niche ai_news --limit 20
  python3 trend_pull.py --all-niches --limit 10
  python3 trend_pull.py --channel ai-tech-news --auto-approve
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import random

# ============================================================================
# IMPORTS - Use AK's own modules per Rule 7
# ============================================================================

# Add AK's news-engine to path
sys.path.insert(0, '/root/ak-ai-company/news-engine')

try:
    import trending
    from trending import trending_signals
    TRENDING_AVAILABLE = True
except ImportError as e:
    TRENDING_AVAILABLE = False
    print(f"[WARN] trending module not available: {e}", file=sys.stderr)

try:
    import finance_topics
    FINANCE_TOPICS_AVAILABLE = True
except ImportError:
    FINANCE_TOPICS_AVAILABLE = False

# ============================================================================
# CONFIG
# ============================================================================

NICHES = {
    "ai_news": {
        "keywords": ["artificial intelligence", "AI", "LLM", "GPT", "machine learning", "generative AI", "OpenAI", "Anthropic", "Google AI", "AI news"],
        "categories": ["ai", "startups", "tech"],
        "reddit_subs": ["MachineLearning", "artificial", "LocalLLaMA", "singularity", "OpenAI"],
        "github_topics": ["llm", "generative-ai", "machine-learning", "transformers", "ai-agents"],
    },
    "ai_code": {
        "keywords": ["AI coding", "code generation", "GitHub Copilot", "Claude Code", "cursor", "vibe coding", "AI assistant", "code completion"],
        "categories": ["ai", "tech", "startups"],
        "reddit_subs": ["ProgrammingWithAI", "cursor", "GitHubCopilot", "vibecoding", "aidev"],
        "github_topics": ["coding-assistant", "code-generation", "ai-coding", "developer-tools", "ide"],
    },
    "finance": {
        "keywords": ["bitcoin", "crypto", "ethereum", "stock market", "trading", "investing", "defi", "web3", "ETF", "macro"],
        "categories": ["markets", "crypto", "finance"],
        "reddit_subs": ["CryptoCurrency", "Bitcoin", "investing", "wallstreetbets", "SecurityAnalysis"],
        "github_topics": ["trading-bot", "defi", "web3", "crypto-trading", "quantitative-finance"],
    },
    "health": {
        "keywords": ["health", "wellness", "longevity", "biohacking", "supplements", "fitness", "nutrition", "mental health", "sleep"],
        "categories": ["health", "science"],
        "reddit_subs": ["biohackers", "longevity", "supplements", "nutrition", "fitness"],
        "github_topics": ["health-tracking", "quantified-self", "bioinformatics", "medical-ai"],
    },
    "policy": {
        "keywords": ["AI regulation", "tech policy", "privacy law", "digital rights", "government AI", "EU AI Act", "AI safety", "alignment"],
        "categories": ["policy", "security", "gov"],
        "reddit_subs": ["privacy", "technology", "law", "AIAlignment", "AIpolicy"],
        "github_topics": ["ai-safety", "ai-governance", "privacy-tools", "compliance"],
    },
    "startup": {
        "keywords": ["startup", "Y Combinator", "venture capital", "fundraising", "SaaS", "product market fit", "founder", "unicorn"],
        "categories": ["startups", "tech", "business"],
        "reddit_subs": ["startups", "entrepreneur", "SaaS", "ycombinator", "indiehackers"],
        "github_topics": ["saas", "startup-tools", "developer-tools", "business-automation"],
    },
}

CHANNEL_TO_NICHE = {
    "ai-tech-news": "ai_news",
    "finance-shorts": "finance",
    "ai-code-daily": "ai_code",
    "health-daily": "health",
}

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class TrendSignal:
    source: str
    query: str
    title: str
    url: str
    score: float  # 0-1 relevance/engagement
    metadata: Dict[str, Any]
    fetched_at: str


@dataclass
class TopicCandidate:
    title: str
    angle: str
    why: str
    sources: List[str]
    niche: str
    channel: str
    score: float
    signals: List[TrendSignal]

# ============================================================================
# SOURCE FETCHERS (using AK's modules)
# ============================================================================

def fetch_google_trends(niche: str, k: int = 10) -> List[TrendSignal]:
    """Fetch trending searches via trending.trending_signals with kind='trend' (Google Trends)."""
    signals = []
    try:
        if TRENDING_AVAILABLE:
            result = trending_signals(k=k, kinds=("trend",))
            for item in result[:k]:
                signals.append(TrendSignal(
                    source="google_trends",
                    query=item.get("term", ""),
                    title=item.get("term", ""),
                    url=f"https://trends.google.com/trends/explore?q={item.get('term', '').replace(' ', '%20')}",
                    score=min(1.0, item.get("value", 0) / 100000),
                    metadata={"approx_traffic": item.get("value", 0), "geo": "IN", "source": item.get("source", ""), "collected_at": item.get("at", "")},
                    fetched_at=datetime.utcnow().isoformat() + "Z"
                ))
    except Exception as e:
        print(f"[WARN] Google Trends fetch failed: {e}", file=sys.stderr)
    return signals


def fetch_news_signals(niche: str, k: int = 10) -> List[TrendSignal]:
    """Fetch fresh signals from AK's trending_signals (news, YouTube, Reddit, GitHub, etc.)."""
    signals = []
    config = NICHES.get(niche, NICHES["ai_news"])

    try:
        if TRENDING_AVAILABLE:
            # trending_signals pulls from multiple sources at once
            result = trending_signals(k=k*2, kinds=("trend", "video", "post", "repo"))
            # Filter by niche relevance
            for item in result:
                # Check relevance to niche keywords
                title = item.get("term", "").lower()
                query = item.get("source", "").lower()
                text = f"{title} {query}"
                relevance = sum(1 for kw in config["keywords"] if kw.lower() in text)
                if relevance > 0 or niche == "ai_news":  # ai_news gets broader
                    signals.append(TrendSignal(
                        source=f"trending_{item.get('kind', 'unknown')}",
                        query=item.get("term", ""),
                        title=item.get("term", ""),
                        url="",
                        score=min(1.0, item.get("value", 0) / 10000) if item.get("value") else 0.5,
                        metadata=item,
                        fetched_at=datetime.utcnow().isoformat() + "Z"
                    ))
    except Exception as e:
        print(f"[WARN] Trending signals fetch failed: {e}", file=sys.stderr)
    return signals[:k]


def fetch_github_trending(niche: str, k: int = 10) -> List[TrendSignal]:
    """Fetch trending GitHub repos via trending_signals (kind='repo')."""
    signals = []
    config = NICHES.get(niche, NICHES["ai_news"])

    try:
        if TRENDING_AVAILABLE:
            result = trending_signals(k=k, kinds=("repo",))
            for item in result:
                signals.append(TrendSignal(
                    source="github_trending",
                    query=niche,
                    title=item.get("term", ""),
                    url="",
                    score=min(1.0, item.get("value", 0) / 5000),
                    metadata={"stars": item.get("value", 0), "source": item.get("source", ""), "collected_at": item.get("at", "")},
                    fetched_at=datetime.utcnow().isoformat() + "Z"
                ))
    except Exception as e:
        print(f"[WARN] GitHub trending fetch failed: {e}", file=sys.stderr)

    # Also check AK's starred repos
    try:
        # Use github_starred via subprocess to gh CLI
        import subprocess
        result = subprocess.run(
            ["gh", "api", "/user/starred", "--paginate", "-q", ".[] | select(.pushed_at > \"$(date -d '14 days ago' -Iseconds)\") | {name: .full_name, url: .html_url, stars: .stargazers_count, language: .language, description: .description, license: .license?.spdx_id}"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            for line in result.stdout.strip().split('\n'):
                if line:
                    repo = json.loads(line)
                    # Check niche relevance
                    desc = (repo.get("description") or "").lower()
                    name = repo.get("name", "").lower()
                    relevance = sum(1 for kw in config["github_topics"] if kw.lower() in desc or kw.lower() in name)
                    if relevance > 0:
                        signals.append(TrendSignal(
                            source="github_starred",
                            query=niche,
                            title=repo.get("name", ""),
                            url=repo.get("url", ""),
                            score=min(1.0, repo.get("stars", 0) / 10000),
                            metadata={"stars": repo.get("stars", 0), "language": repo.get("language", ""), "description": repo.get("description", ""), "license": repo.get("license", "")},
                            fetched_at=datetime.utcnow().isoformat() + "Z"
                        ))
    except Exception as e:
        print(f"[WARN] GitHub starred fetch failed: {e}", file=sys.stderr)

    return signals[:k]


def fetch_finance_topics(niche: str, k: int = 10) -> List[TrendSignal]:
    """Fetch finance-specific topics from finance_topics.db."""
    signals = []
    if niche != "finance" or not FINANCE_TOPICS_AVAILABLE:
        return signals

    try:
        # Query finance_topics.db for trending finance topics
        import sqlite3
        conn = sqlite3.connect("/root/ak-ai-company/news-engine/finance_topics.db")
        conn.row_factory = sqlite3.Row
        rows = conn.execute("""
            SELECT topic, angle, source, score, metadata
            FROM finance_topics
            WHERE score > 0.3
            ORDER BY score DESC, updated_at DESC
            LIMIT ?
        """, (k,)).fetchall()
        conn.close()

        for row in rows:
            signals.append(TrendSignal(
                source="finance_topics_db",
                query=niche,
                title=row["topic"],
                url=row["source"] or "",
                score=row["score"],
                metadata=json.loads(row["metadata"]) if row["metadata"] else {},
                fetched_at=datetime.utcnow().isoformat() + "Z"
            ))
    except Exception as e:
        print(f"[WARN] Finance topics fetch failed: {e}", file=sys.stderr)

    return signals


def fetch_osint_youtube(niche: str, k: int = 10) -> List[TrendSignal]:
    """Fetch from tracked YouTube channels via osint MCP."""
    signals = []
    config = NICHES.get(niche, NICHES["ai_news"])

    try:
        # Use osint_content via subprocess to hermes CLI
        import subprocess
        for keyword in config["keywords"][:2]:
            payload = json.dumps({"query": keyword, "platform": "youtube", "k": k//2})
            result = subprocess.run(
                ["hermes", "mcp", "call", "osint", "osint_content", payload],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                for item in data.get("data", []):
                    signals.append(TrendSignal(
                        source="osint_youtube",
                        query=keyword,
                        title=item.get("title", ""),
                        url=item.get("url", ""),
                        score=0.6,
                        metadata={"channel": item.get("channel", ""), "published": item.get("published", ""), "views": item.get("views", 0)},
                        fetched_at=datetime.utcnow().isoformat() + "Z"
                    ))
    except Exception as e:
        print(f"[WARN] OSINT YouTube fetch failed: {e}", file=sys.stderr)

    return signals


# ============================================================================
# TOPIC GENERATION
# ============================================================================

def generate_topics_from_signals(signals: List[TrendSignal], niche: str, channel: str, limit: int = 10) -> List[TopicCandidate]:
    """Convert trend signals into topic candidates with angles."""
    # Group signals by theme
    themes = {}
    for sig in signals:
        # Simple theme extraction from title
        words = sig.title.lower().split()
        key_terms = [w for w in words if len(w) > 4 and w not in [
            'this', 'that', 'with', 'from', 'have', 'been', 'will', 'would', 'could',
            'about', 'which', 'their', 'there', 'what', 'when', 'where', 'how', 'why',
            'just', 'new', 'newest', 'latest', 'breaking', 'update', 'launch', 'release'
        ]]
        theme_key = " ".join(key_terms[:3]) if key_terms else sig.query or "general"

        if theme_key not in themes:
            themes[theme_key] = []
        themes[theme_key].append(sig)

    # Build topic candidates from top themes
    candidates = []
    for theme, theme_signals in sorted(themes.items(), key=lambda x: -len(x[1]))[:limit]:
        if len(theme_signals) < 1:
            continue

        # Create angle from signals
        top_sig = max(theme_signals, key=lambda s: s.score)

        # Generate hook-style angle
        angle = generate_angle(theme, top_sig, niche)

        # Evidence string
        source_names = list(set(s.source for s in theme_signals))
        evidence = f"Trending across {len(source_names)} sources ({', '.join(source_names[:3])}), {len(theme_signals)} signals"

        candidate = TopicCandidate(
            title=theme.title(),
            angle=angle,
            why=evidence,
            sources=[s.url for s in theme_signals if s.url][:5],
            niche=niche,
            channel=channel,
            score=min(1.0, sum(s.score for s in theme_signals) / len(theme_signals)),
            signals=theme_signals
        )
        candidates.append(candidate)

    return candidates


def generate_angle(theme: str, top_signal: TrendSignal, niche: str) -> str:
    """Generate a click-worthy angle from theme and top signal."""
    # Use niche-specific angle templates (string templates, not f-strings)
    angles = {
        "ai_news": [
            "Why {theme} Just Changed Everything for AI",
            "The {theme} Breakthrough Nobody Saw Coming",
            "What {theme} Means for Your AI Workflow",
            "Stop Using {theme} - Do This Instead",
        ],
        "ai_code": [
            "How {theme} Is Replacing Developers Right Now",
            "Stop Coding {theme} Manually - Do This Instead",
            "The {theme} Pattern Top 1% Devs Use",
            "{theme} vs Traditional Coding: The Verdict",
        ],
        "finance": [
            "Why {theme} Could 10x Your Portfolio",
            "The {theme} Signal Wall Street Missed",
            "{theme}: Buy, Sell, or Hold?",
            "How {theme} Made Millionaires Overnight",
        ],
        "health": [
            "The {theme} Habit That Adds Years to Your Life",
            "Why Doctors Are Wrong About {theme}",
            "{theme}: The Protocol That Actually Works",
            "Stop Ignoring {theme} - Your Body Will Thank You",
        ],
        "policy": [
            "How {theme} Will Reshape Tech Regulation",
            "The {theme} Loophole Companies Exploit",
            "What {theme} Means for Your Privacy",
            "The {theme} Bill That Changes Everything",
        ],
        "startup": [
            "How {theme} Built a $1B Company in 18 Months",
            "The {theme} Strategy YC Founders Swear By",
            "Why {theme} Is the Next Unicorn Catalyst",
            "{theme}: The Startup Playbook You Need",
        ],
    }

    niche_angles = angles.get(niche, angles["ai_news"])
    return random.choice(niche_angles).replace("{theme}", theme)


# ============================================================================
# TOPIC QUEUE INTEGRATION (via news MCP topic_save)
# ============================================================================

def save_to_topic_queue(candidates: List[TopicCandidate], auto_approve: bool = False) -> int:
    """Save topic candidates to the topic queue via news MCP topic_save.
    
    This function prints the candidates as JSON for piping to hermes mcp call.
    In a Hermes session, the MCP tool mcp__news__topic_save is available directly.
    """
    saved = 0
    for c in candidates:
        # Print as JSON for external consumption
        print(json.dumps({
            "tool": "mcp__news__topic_save",
            "arguments": {
                "title": c.title,
                "angle": c.angle,
                "why": c.why,
                "sources": json.dumps(c.sources),
                "channel": c.channel,
                "score": c.score
            }
        }), flush=True)
        saved += 1
        print(f"[OK] Prepared topic: {c.title} ({c.niche}) - score: {c.score:.2f}", file=sys.stderr)

    return saved


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def pull_niche_trends(niche: str, channel: str, limit: int = 20, auto_approve: bool = False) -> int:
    """Pull trends for a single niche and save to topic queue."""
    print(f"\n=== Pulling trends for {niche} -> {channel} ===")

    all_signals = []

    # Fetch from all sources
    fetchers = [
        ("Google Trends", lambda: fetch_google_trends(niche, limit)),
        ("News/Trending Signals", lambda: fetch_news_signals(niche, limit)),
        ("GitHub Trending", lambda: fetch_github_trending(niche, limit)),
    ]

    if niche == "finance":
        fetchers.append(("Finance Topics DB", lambda: fetch_finance_topics(niche, limit)))

    fetchers.append(("OSINT YouTube", lambda: fetch_osint_youtube(niche, limit)))

    for name, fetcher in fetchers:
        try:
            signals = fetcher()
            all_signals.extend(signals)
            print(f"  {name}: {len(signals)} signals")
        except Exception as e:
            print(f"  {name}: FAILED - {e}", file=sys.stderr)

    # Deduplicate by URL
    seen_urls = set()
    unique_signals = []
    for s in all_signals:
        if s.url and s.url not in seen_urls:
            seen_urls.add(s.url)
            unique_signals.append(s)
        elif not s.url:
            unique_signals.append(s)

    print(f"  Total unique signals: {len(unique_signals)}")

    # Generate topic candidates
    candidates = generate_topics_from_signals(unique_signals, niche, channel, limit)
    print(f"  Generated {len(candidates)} topic candidates")

    # Save to topic queue
    saved = save_to_topic_queue(candidates, auto_approve)
    print(f"  Saved to topic queue: {saved}")

    return saved


def pull_all_niches(limit: int = 10, auto_approve: bool = False) -> Dict[str, int]:
    """Pull trends for all niches."""
    results = {}
    for channel, niche in CHANNEL_TO_NICHE.items():
        try:
            saved = pull_niche_trends(niche, channel, limit, auto_approve)
            results[channel] = saved
            time.sleep(1)  # Rate limiting
        except Exception as e:
            print(f"[ERROR] Failed for {channel}: {e}", file=sys.stderr)
            results[channel] = 0
    return results


# ============================================================================
# MAIN CLI
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Weekly niche trend pull -> topic queue")
    parser.add_argument("--niche", choices=list(NICHES.keys()), help="Specific niche to pull")
    parser.add_argument("--channel", help="Specific channel (overrides niche)")
    parser.add_argument("--all-niches", action="store_true", help="Pull for all configured niches")
    parser.add_argument("--limit", type=int, default=20, help="Max topics per niche")
    parser.add_argument("--auto-approve", action="store_true", help="Auto-approve topics (status=approved)")
    parser.add_argument("--list-niches", action="store_true", help="List available niches")

    args = parser.parse_args()

    if args.list_niches:
        print("Available niches:")
        for n, c in NICHES.items():
            print(f"  {n}: {c['keywords'][:3]}...")
        return 0

    if args.channel:
        niche = CHANNEL_TO_NICHE.get(args.channel, args.niche or "ai_news")
        pull_niche_trends(niche, args.channel, args.limit, args.auto_approve)
    elif args.niche:
        channel = [k for k, v in CHANNEL_TO_NICHE.items() if v == args.niche][0]
        pull_niche_trends(args.niche, channel, args.limit, args.auto_approve)
    elif args.all_niches:
        results = pull_all_niches(args.limit, args.auto_approve)
        print(f"\n=== Summary ===")
        for channel, saved in results.items():
            print(f"  {channel}: {saved} topics")
    else:
        parser.error("Must specify --niche, --channel, or --all-niches")

    return 0


if __name__ == "__main__":
    sys.exit(main())