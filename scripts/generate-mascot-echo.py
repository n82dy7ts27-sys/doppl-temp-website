#!/usr/bin/env python3
"""Derive Echo assets from exact frames of DOPPL's original alpha video.

Requires ffmpeg with the libvpx-vp9 decoder, and Pillow. From the project root:

    python3 scripts/generate-mascot-echo.py
    python3 scripts/generate-mascot-echo.py --contact-sheet /tmp/echo-review.png

The source framing is retained: no cropping, redrawing, stretching, or mirroring.
Each pose is white RGBA so consumers can use its alpha as a tinted mask.
The outline is a centred morphological boundary of the decoded alpha, rendered
at 4x resolution and reduced to 600px. Its default width is 1.25 CSS px when
the complete image is displayed at 300px.
"""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSE_SECONDS = (0, 4, 8, 14)
SIZE = 600
DISPLAY_SIZE = 300
STROKE_DISPLAY = 1.25
SUPERSAMPLE = 4


def decode_pose(ffmpeg: str, source: Path, seconds: int) -> Image.Image:
    # Selecting libvpx-vp9 explicitly is essential: the native VP9 decoder can
    # return the video's white RGB plane without its separate alpha payload.
    result = subprocess.run(
        [
            ffmpeg, "-hide_banner", "-loglevel", "error",
            "-c:v", "libvpx-vp9", "-i", str(source),
            "-ss", str(seconds), "-frames:v", "1", "-an",
            "-vf", "format=rgba", "-f", "image2pipe", "-c:v", "png", "pipe:1",
        ],
        check=True, capture_output=True,
    )
    with Image.open(BytesIO(result.stdout)) as image:
        rgba = image.convert("RGBA")
    if rgba.width != rgba.height:
        raise ValueError(f"Expected square source framing; got {rgba.size}")
    alpha = rgba.getchannel("A")
    coverage = sum(alpha.histogram()[17:]) / (alpha.width * alpha.height)
    if alpha.getextrema() != (0, 255) or not 0.02 < coverage < 0.75:
        raise ValueError(f"Missing or invalid decoded alpha at {seconds}s")
    return alpha


def white_rgba(alpha: Image.Image) -> Image.Image:
    image = Image.new("RGBA", alpha.size, (255, 255, 255, 0))
    image.putalpha(alpha)
    return image


def make_assets(alpha: Image.Image) -> tuple[Image.Image, Image.Image]:
    filled_alpha = alpha.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    high_alpha = alpha.resize(
        (SIZE * SUPERSAMPLE, SIZE * SUPERSAMPLE), Image.Resampling.LANCZOS
    )
    # 5 pixels either side at 2400px = 2.5px at 600px = 1.25px at 300px.
    radius = round(STROKE_DISPLAY * SIZE / DISPLAY_SIZE * SUPERSAMPLE / 2)
    kernel = radius * 2 + 1
    outer = high_alpha.filter(ImageFilter.MaxFilter(kernel))
    inner = high_alpha.filter(ImageFilter.MinFilter(kernel))
    outline_alpha = ImageChops.subtract(outer, inner).resize(
        (SIZE, SIZE), Image.Resampling.LANCZOS
    )
    return white_rgba(filled_alpha), white_rgba(outline_alpha)


def contact_sheet(assets: dict[int, tuple[Image.Image, Image.Image]], path: Path) -> None:
    """Inspect full-size outlines and the small diagram use case on plum."""
    sheet = Image.new("RGBA", (1100, 1430), "#100b1b")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    small_font = ImageFont.load_default(size=14)
    draw.text((24, 20), "Exact mascot frames / 300px and 90px display", font=font, fill="#fbf8ff")
    for row, (seconds, (filled, outline)) in enumerate(assets.items()):
        y = 65 + row * 340
        draw.text((24, y), f"{seconds:02}s", font=font, fill="#c8bcd8")
        for image, x, size, label in (
            (filled, 85, 300, "Filled / 300px"),
            (outline, 430, 300, "Outline / 300px"),
            (filled, 795, 90, "Filled / 90px"),
            (outline, 935, 90, "Outline / 90px"),
        ):
            draw.text((x, y), label, font=small_font, fill="#c8bcd8")
            dy = y + 25 + (300 - size) // 2
            sheet.alpha_composite(image.resize((size, size), Image.Resampling.LANCZOS), (x, dy))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=PROJECT_ROOT / "public/mascot/white-form-18s.webm")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "public/mascot/echo")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--contact-sheet", type=Path)
    args = parser.parse_args()
    ffmpeg = shutil.which(args.ffmpeg)
    if not ffmpeg:
        parser.error(f"ffmpeg executable not found: {args.ffmpeg}")
    if not args.source.is_file():
        parser.error(f"Source video not found: {args.source}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    assets: dict[int, tuple[Image.Image, Image.Image]] = {}
    for seconds in POSE_SECONDS:
        filled, outline = make_assets(decode_pose(ffmpeg, args.source, seconds))
        assets[seconds] = (filled, outline)
        for prefix, image in (("pose", filled), ("outline", outline)):
            path = args.output_dir / f"{prefix}-{seconds:02}.png"
            image.save(path, optimize=True)
            print(f"{path.relative_to(args.output_dir)}: {image.width}x{image.height} RGBA ({path.stat().st_size:,} bytes)")
    if args.contact_sheet:
        contact_sheet(assets, args.contact_sheet)
        print(f"Review: {args.contact_sheet}")


if __name__ == "__main__":
    main()
