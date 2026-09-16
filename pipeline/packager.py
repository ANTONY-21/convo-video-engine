#!/usr/bin/env python3
"""
packager.py — V1 (Master Prompt §6, §7, §8)
Cover frame generator + metadata packager for all 9 platforms.

Outputs per video:
- cover_frame.jpg (1280x720 landscape, 720x1280 portrait)
- metadata.json (unified schema)
- youtube.json, instagram.json, tiktok.json, twitter.json, linkedin.json,
  facebook.json, reddit.json, threads.json, shorts.json (platform-specific)

Usage:
  python3 packager.py --topic "GPT-6 launch" --title "GPT-6 Just Broke AI" \
    --desc "..." --tags "AI,GPT,tech" --channel "ai_news" \
    --video t311_FINAL_v7.mp4 --cover-img cover.jpg --out-dir /out
"""

import argparse
import json
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field

# Try to import PIL for cover generation
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    PIL_AVAILABLE = True
    ImageType = Image.Image
    ImageDrawType = ImageDraw.ImageDraw
    ImageFontType = ImageFont.FreeTypeFont
except ImportError:
    PIL_AVAILABLE = False
    ImageType = None
    ImageDrawType = None
    ImageFontType = None
    print("[WARN] PIL not available, cover generation will be skipped", file=sys.stderr)

# ============================================================================
# SCHEMA DEFINITIONS
# ============================================================================

@dataclass
class PlatformMeta:
    """Per-platform metadata"""
    platform: str
    title: str
    description: str
    hashtags: List[str]
    ai_generated: bool
    thumbnail_path: Optional[str] = None
    aspect_ratio: str = "16:9"
    category_id: Optional[str] = None
    privacy_status: str = "public"
    schedule_time: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UnifiedMeta:
    """Unified metadata schema (source of truth)"""
    video_id: str
    topic: str
    title: str
    description: str
    tags: List[str]
    channel: str
    niche: str
    story_shape: str
    hook: str
    duration_sec: float
    resolution: str
    fps: int
    aspect_ratio: str
    cover_frame_path: str
    ai_generated: bool
    model_versions: Dict[str, str]
    render_manifest_path: str
    created_at: str
    platforms: Dict[str, PlatformMeta]
    qc_passed: bool
    qc_scores: Dict[str, float]

# ============================================================================
# PLATFORM SPECIFICS
# ============================================================================

PLATFORM_SPECS = {
    "youtube": {
        "max_title": 100,
        "max_desc": 5000,
        "max_tags": 500,
        "hashtag_limit": 15,
        "aspect": "16:9",
        "category_id": "28",  # Science & Technology
        "privacy": "public",
    },
    "youtube_shorts": {
        "max_title": 100,
        "max_desc": 5000,
        "max_tags": 500,
        "hashtag_limit": 15,
        "aspect": "9:16",
        "category_id": "28",
        "privacy": "public",
    },
    "instagram": {
        "max_title": 2200,
        "max_desc": 2200,
        "hashtag_limit": 30,
        "aspect": "9:16",
        "reel": True,
    },
    "tiktok": {
        "max_title": 150,
        "max_desc": 2200,
        "hashtag_limit": 10,
        "aspect": "9:16",
    },
    "twitter": {
        "max_title": 280,
        "max_desc": 280,
        "hashtag_limit": 5,
        "aspect": "16:9",
    },
    "linkedin": {
        "max_title": 700,
        "max_desc": 3000,
        "hashtag_limit": 10,
        "aspect": "16:9",
    },
    "facebook": {
        "max_title": 255,
        "max_desc": 63206,
        "hashtag_limit": 10,
        "aspect": "16:9",
    },
    "reddit": {
        "max_title": 300,
        "max_desc": 40000,
        "hashtag_limit": 0,
        "aspect": "16:9",
    },
    "threads": {
        "max_title": 500,
        "max_desc": 500,
        "hashtag_limit": 10,
        "aspect": "9:16",
    },
}

NICHE_HASHTAGS = {
    "ai_news": ["AI", "ArtificialIntelligence", "TechNews", "MachineLearning", "DeepLearning", "LLM", "GenerativeAI", "OpenAI", "GPT", "Tech"],
    "ai_code": ["Coding", "Programming", "AICode", "DevTools", "SoftwareEngineering", "ClaudeCode", "GitHubCopilot", "VibeCoding", "Tech"],
    "finance": ["Finance", "Investing", "Crypto", "Bitcoin", "Stocks", "Trading", "WealthBuilding", "FinTok", "Money", "Economy"],
    "health": ["Health", "Wellness", "Fitness", "MentalHealth", "Nutrition", "Biohacking", "Longevity", "HealthTips", "SelfCare", "Wellbeing"],
    "policy": ["Policy", "Regulation", "Government", "Law", "TechPolicy", "AIRegulation", "Privacy", "DigitalRights", "GovTech", "Compliance"],
    "startup": ["Startup", "Entrepreneurship", "Founder", "VentureCapital", "ScaleUp", "ProductMarketFit", "SaaS", "TechStartup", "Business", "Innovation"],
    "default": ["Tech", "Innovation", "Future", "Technology", "Digital", "Trending", "Viral", "MustWatch", "Learn", "Growth"],
}

# ============================================================================
# COVER FRAME GENERATION
# ============================================================================

def generate_cover_frame(
    title: str,
    channel: str,
    niche: str,
    output_path: str,
    width: int = 1280,
    height: int = 720,
    template: str = "default"
) -> bool:
    """Generate a cover frame using PIL."""
    if not PIL_AVAILABLE:
        return False

    try:
        # Create base image with dark gradient background
        img = Image.new('RGB', (width, height), (10, 10, 15))
        draw = ImageDraw.Draw(img)

        # Gradient background
        for y in range(height):
            r = int(10 + (y / height) * 20)
            g = int(10 + (y / height) * 15)
            b = int(15 + (y / height) * 25)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Load fonts (fallback to default)
        if PIL_AVAILABLE and ImageFont:
            try:
                title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", min(60, width // 18))
                sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", min(28, width // 35))
                brand_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", min(24, width // 40))
            except Exception:
                title_font = ImageFont.load_default()
                sub_font = ImageFont.load_default()
                brand_font = ImageFont.load_default()
        else:
            # Fallback when PIL not available
            class DummyFont:
                def getbbox(self, text):
                    return (0, 0, len(text) * 10, 20)
            title_font = DummyFont()
            sub_font = DummyFont()
            brand_font = DummyFont()

        # Channel/brand bar at top
        bar_height = int(height * 0.12)
        draw.rectangle([0, 0, width, bar_height], fill=(255, 50, 50, 200))  # Red accent
        draw.text((width * 0.05, bar_height * 0.15), channel.upper().replace('_', ' '), fill=(255, 255, 255), font=brand_font)

        # Title - centered, with word wrap
        max_width = width * 0.9
        words = title.split()
        lines = []
        current = ""
        for w in words:
            test = current + " " + w if current else w
            bbox = draw.textbbox((0, 0), test, font=title_font)
            if bbox[2] - bbox[0] <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = w
        if current:
            lines.append(current)

        # Draw title lines centered vertically
        line_height = title_font.getbbox("Ay")[3] - title_font.getbbox("Ay")[1] + 8
        total_text_height = len(lines) * line_height
        start_y = (height - total_text_height) // 2 - bar_height

        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=title_font)
            x = (width - (bbox[2] - bbox[0])) // 2
            y = start_y + i * line_height + bar_height
            # Shadow
            draw.text((x + 2, y + 2), line, fill=(0, 0, 0, 180), font=title_font)
            # Main
            draw.text((x, y), line, fill=(255, 255, 255), font=title_font)

        # Bottom brand line
        brand_text = f"@{channel.replace('_', '')}  •  {niche.replace('_', ' ').title()}"
        bbox = draw.textbbox((0, 0), brand_text, font=sub_font)
        bx = (width - (bbox[2] - bbox[0])) // 2
        by = height - int(height * 0.1)
        draw.text((bx + 1, by + 1), brand_text, fill=(0, 0, 0, 180), font=sub_font)
        draw.text((bx, by), brand_text, fill=(200, 200, 200), font=sub_font)

        # AI badge
        ai_text = "AI GENERATED"
        bbox = draw.textbbox((0, 0), ai_text, font=brand_font)
        ax = width - bbox[2] - 20
        ay = 20
        draw.rectangle([ax - 10, ay - 5, ax + bbox[2] + 10, ay + bbox[3] + 5], fill=(255, 50, 50, 220))
        draw.text((ax, ay), ai_text, fill=(255, 255, 255), font=brand_font)

        img.save(output_path, "JPEG", quality=95)
        return True

    except Exception as e:
        print(f"[ERROR] Cover generation failed: {e}", file=sys.stderr)
        return False


def generate_portrait_cover(
    title: str,
    channel: str,
    niche: str,
    output_path: str,
    width: int = 720,
    height: int = 1280
) -> bool:
    """Generate 9:16 portrait cover for Shorts/Reels/TikTok."""
    return generate_cover_frame(title, channel, niche, output_path, width, height)


# ============================================================================
# METADATA BUILDING
# ============================================================================

def build_unified_meta(args) -> UnifiedMeta:
    """Build the unified metadata object."""
    video_id = Path(args.video).stem
    now = datetime.utcnow().isoformat() + "Z"

    # Determine niche from channel
    niche = args.niche or detect_niche(args.channel)

    # Build platform-specific metadata
    platforms = {}
    base_tags = args.tags.split(',') if args.tags else []
    niche_tags = NICHE_HASHTAGS.get(niche, NICHE_HASHTAGS["default"])
    all_tags = list(dict.fromkeys(base_tags + niche_tags))[:30]  # dedupe, limit

    for platform, spec in PLATFORM_SPECS.items():
        # Title truncation
        title = args.title[:spec["max_title"]]

        # Description
        desc = args.desc[:spec["max_desc"]]

        # Hashtags
        hashtags = [f"#{t.replace(' ', '').replace('#', '')}" for t in all_tags[:spec["hashtag_limit"]]]

        # Aspect
        aspect = spec["aspect"]
        if platform == "youtube_shorts" and args.aspect == "9:16":
            aspect = "9:16"

        platforms[platform] = PlatformMeta(
            platform=platform,
            title=title,
            description=desc,
            hashtags=hashtags,
            ai_generated=args.ai_generated,
            aspect_ratio=aspect,
            category_id=spec.get("category_id"),
            privacy_status=spec.get("privacy", "public"),
            extra={"schedule_time": args.schedule} if args.schedule else {}
        )

    # Get video duration if possible
    duration = get_video_duration(args.video)

    return UnifiedMeta(
        video_id=video_id,
        topic=args.topic,
        title=args.title,
        description=args.desc,
        tags=all_tags,
        channel=args.channel,
        niche=niche,
        story_shape=args.story_shape,
        hook=args.hook,
        duration_sec=duration,
        resolution=args.resolution,
        fps=args.fps,
        aspect_ratio=args.aspect,
        cover_frame_path=args.cover_img,
        ai_generated=args.ai_generated,
        model_versions=parse_model_versions(args.model_versions),
        render_manifest_path=args.render_manifest or "",
        created_at=now,
        platforms=platforms,
        qc_passed=args.qc_passed,
        qc_scores=parse_qc_scores(args.qc_scores),
    )


def detect_niche(channel: str) -> str:
    """Detect niche from channel name."""
    c = channel.lower()
    for key in NICHE_HASHTAGS:
        if key in c:
            return key
    return "default"


def get_video_duration(video_path: str) -> float:
    """Get video duration using ffprobe."""
    try:
        result = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", video_path
        ], capture_output=True, text=True, timeout=10)
        return float(result.stdout.strip())
    except:
        return 0.0


def parse_model_versions(versions_str: str) -> Dict[str, str]:
    """Parse model versions from comma-separated string: key=val,key=val"""
    if not versions_str:
        return {}
    result = {}
    for pair in versions_str.split(','):
        if '=' in pair:
            k, v = pair.split('=', 1)
            result[k.strip()] = v.strip()
    return result


def parse_qc_scores(scores_str: str) -> Dict[str, float]:
    """Parse QC scores from comma-separated string: key=val,key=val"""
    if not scores_str:
        return {}
    result = {}
    for pair in scores_str.split(','):
        if '=' in pair:
            k, v = pair.split('=', 1)
            try:
                result[k.strip()] = float(v.strip())
            except:
                pass
    return result


# ============================================================================
# EXPORT FUNCTIONS
# ============================================================================

def export_unified(meta: UnifiedMeta, out_dir: Path) -> Path:
    """Export unified metadata.json"""
    out_path = out_dir / "metadata.json"
    # Convert to dict, handling dataclasses
    data = asdict(meta)
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    return out_path


def export_platform(meta: UnifiedMeta, platform: str, out_dir: Path) -> Optional[Path]:
    """Export platform-specific metadata."""
    pm = meta.platforms.get(platform)
    if not pm:
        return None

    out_path = out_dir / f"{platform}.json"
    data = {
        "video_id": meta.video_id,
        "platform": platform,
        "title": pm.title,
        "description": pm.description,
        "hashtags": pm.hashtags,
        "ai_generated": pm.ai_generated,
        "aspect_ratio": pm.aspect_ratio,
        "thumbnail_path": pm.thumbnail_path,
        "category_id": pm.category_id,
        "privacy_status": pm.privacy_status,
        "schedule_time": pm.schedule_time,
        "extra": pm.extra,
        "source_metadata": {
            "topic": meta.topic,
            "channel": meta.channel,
            "niche": meta.niche,
            "duration_sec": meta.duration_sec,
            "resolution": meta.resolution,
            "fps": meta.fps,
        }
    }
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    return out_path


def export_all_platforms(meta: UnifiedMeta, out_dir: Path) -> List[Path]:
    """Export all platform metadata files."""
    results = []
    for platform in PLATFORM_SPECS:
        p = export_platform(meta, platform, out_dir)
        if p:
            results.append(p)
    return results


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Video packager - cover + metadata for 9 platforms")
    parser.add_argument("--topic", required=True, help="Video topic")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--desc", required=True, help="Video description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--channel", required=True, help="Channel slug")
    parser.add_argument("--niche", help="Niche override")
    parser.add_argument("--story-shape", default="man_in_hole", help="Story shape")
    parser.add_argument("--hook", default="", help="Hook text used")
    parser.add_argument("--video", required=True, help="Path to video file")
    parser.add_argument("--cover-img", help="Path to existing cover image (optional)")
    parser.add_argument("--resolution", default="1280x720", help="Video resolution")
    parser.add_argument("--fps", type=int, default=30, help="Video FPS")
    parser.add_argument("--aspect", default="16:9", help="Aspect ratio (16:9 or 9:16)")
    parser.add_argument("--ai-generated", action="store_true", default=True, help="AI generated flag")
    parser.add_argument("--model-versions", default="", help="Comma-separated key=val model versions")
    parser.add_argument("--render-manifest", help="Path to render_manifest.json")
    parser.add_argument("--qc-passed", action="store_true", default=False, help="QC gate passed")
    parser.add_argument("--qc-scores", default="", help="Comma-separated key=val QC scores")
    parser.add_argument("--schedule", help="ISO datetime for scheduled publish")
    parser.add_argument("--out-dir", default=".", help="Output directory")
    parser.add_argument("--gen-cover", action="store_true", default=True, help="Generate cover frames")
    parser.add_argument("--no-cover", action="store_false", dest="gen_cover", help="Skip cover generation")

    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Generate cover frames if requested and not provided
    if args.gen_cover:
        if not args.cover_img:
            landscape_path = out_dir / f"{Path(args.video).stem}_cover_16x9.jpg"
            if generate_cover_frame(args.title, args.channel, args.niche or detect_niche(args.channel), str(landscape_path)):
                args.cover_img = str(landscape_path)
                print(f"[OK] Generated landscape cover: {landscape_path}")
            else:
                print("[WARN] Landscape cover generation failed", file=sys.stderr)

        # Portrait cover for Shorts/Reels
        portrait_path = out_dir / f"{Path(args.video).stem}_cover_9x16.jpg"
        if generate_portrait_cover(args.title, args.channel, args.niche or detect_niche(args.channel), str(portrait_path)):
            print(f"[OK] Generated portrait cover: {portrait_path}")
        else:
            print("[WARN] Portrait cover generation failed", file=sys.stderr)

    # Build unified metadata
    meta = build_unified_meta(args)

    # Export all
    export_unified(meta, out_dir)
    print(f"[OK] Exported unified metadata: {out_dir}/metadata.json")

    exported = export_all_platforms(meta, out_dir)
    for p in exported:
        print(f"[OK] Exported {p.name}")

    print(f"\n[DONE] Packaging complete for {meta.video_id}")
    print(f"Output directory: {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())