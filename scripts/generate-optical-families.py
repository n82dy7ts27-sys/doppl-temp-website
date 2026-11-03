#!/usr/bin/env python3
"""Generate four two-plate optical families for Doppl.

Every visible large form is an alpha product of two finely ruled source plates.
The plates have the same carrier density and stroke duty as the approved hero.
There are no painted broad shapes, third plates, or separate intersection fills.

Usage:
    python3 scripts/generate-optical-families.py
    python3 scripts/generate-optical-families.py --preview-dir /tmp/doppl-families

Preview rendering is optional and requires rsvg-convert and ImageMagick.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path
import shutil
import subprocess

WIDTH, HEIGHT = 1800, 1125
CARRIER_COUNT = 260
PITCH = WIDTH / CARRIER_COUNT
STROKE_WIDTH = PITCH * .46
GROUND, INK = '#100b1b', '#c0a8dd'
FAMILIES = ('ribbons', 'contours', 'chevrons', 'petals')


def carrier(family: str, x: float, y: float) -> float:
    """Shared fine-line geometry, in source pixels; never the broad visible form."""
    if family == 'ribbons':
        return 74 * math.sin(y * 5.1 + x * .8) + 38 * (y - .5) + 22 * math.sin(y * 10.0 - x * 2.0)
    if family == 'contours':
        return 72 * math.sin(y * 3.3 + .4) + 24 * math.cos(y * 7.4 + x * 1.6) - 36 * (y - .5)
    if family == 'chevrons':
        # Straight-sided folds, including in the microscopic source lines.
        return 146 * abs(y - .5) - 52 + 38 * abs(x - .5) + 16 * (y - .5)
    if family == 'petals':
        return 60 * math.sin(y * 5.7 - .6) + 34 * math.sin(y * 10.4 + x * 2.2)
    raise ValueError(f'Unknown family: {family}')


def registration(family: str, x: float, y: float) -> float:
    """Relative A/B registration measured in carrier pitches.

    These displacement functions only move B's individual fine lines. Their
    broad contours become visible solely where those lines transmit plate A.
    """
    if family == 'ribbons':
        # Long bands sweep across the frame and return in wide, open bends.
        return 3.5 * (y - .5) + 1.25 * math.sin(x * 4.25 - .65) + .27 * math.sin(x * 8.0 + y * 1.1)
    if family == 'contours':
        # Elliptical registration differences make nested, continuous orbits.
        radius = math.hypot((x - .52) * .93, (y - .50) * 1.34)
        return 5.0 * radius + .11 * (x - .5)
    if family == 'chevrons':
        # Nested angular folds cross the frame, rather than curving into rings.
        return 4.4 * (y - .50) + 4.0 * abs(x - .5) + .20 * abs(y - .5)
    if family == 'petals':
        # Five broad lobes open into a scalloped flower, distinct from the rings.
        dx, dy = (x - .49) * 1.02, (y - .51) * 1.18
        radius = math.hypot(dx, dy)
        angle = math.atan2(dy, dx)
        return 4.6 * radius * (1 + .28 * math.cos(5 * angle - .35)) + .10 * (y - .5)
    raise ValueError(f'Unknown family: {family}')


def lines(family: str, plate: str) -> str:
    paths = []
    # The original hero uses the same 321 lines per plate and 7px sampling.
    for index in range(-30, CARRIER_COUNT + 31):
        points = []
        for y_pixel in range(-50, HEIGHT + 65, 7):
            y = y_pixel / HEIGHT
            x_pixel = index * PITCH
            # Solve an implicit grating: near-vertical paths cannot cross here
            # because each carrier map remains monotone over this source extent.
            for _ in range(8):
                x = x_pixel / WIDTH
                displacement = carrier(family, x, y)
                if plate == 'b':
                    displacement += PITCH * registration(family, x, y)
                x_pixel = index * PITCH - displacement
            points.append(f'{x_pixel:.2f},{y_pixel}')
        paths.append('<path d="M' + ' L'.join(points) + '"/>')
    return ''.join(paths)


def svg(family: str) -> str:
    definitions = f'<g id="a">{lines(family, "a")}</g><g id="b">{lines(family, "b")}</g>'
    mask = (
        f'<mask id="transmission" maskUnits="userSpaceOnUse" '
        f'x="0" y="0" width="{WIDTH}" height="{HEIGHT}">'
        f'<use href="#b" transform="translate(0,0)" stroke="white" '
        f'fill="none" stroke-width="{STROKE_WIDTH:.3f}"/></mask>'
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}"><title>Doppl / {family} / two-plate optical field</title>'
        f'<defs>{definitions}{mask}</defs><rect width="{WIDTH}" height="{HEIGHT}" fill="{GROUND}"/>'
        f'<g stroke="{INK}" stroke-width="{STROKE_WIDTH:.3f}" fill="none">'
        '<use href="#a" mask="url(#transmission)"/></g></svg>'
    )


def previews(files: list[Path], destination: Path) -> None:
    for tool in ('rsvg-convert', 'magick'):
        if not shutil.which(tool):
            raise SystemExit(f'Preview rendering requires {tool}.')
    destination.mkdir(parents=True, exist_ok=True)
    previews = []
    for path in files:
        full = destination / f'{path.stem}-2x.png'
        preview = destination / f'{path.stem}.png'
        subprocess.run(['rsvg-convert', '-w', str(WIDTH * 2), '-h', str(HEIGHT * 2), '-o', str(full), str(path)], check=True)
        subprocess.run(['magick', str(full), '-resize', '900x563', str(preview)], check=True)
        previews.append(preview)
    subprocess.run(['magick', '(', *map(str, previews[:2]), '+append', ')', '(', *map(str, previews[2:]), '+append', ')', '-append', str(destination / 'contact-sheet.png')], check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'public' / 'optical')
    parser.add_argument('--preview-dir', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    files = []
    for family in FAMILIES:
        path = args.output / f'{family}-combined.svg'
        path.write_text(svg(family))
        files.append(path)
        print(f'{path.name}: 642 source paths; {CARRIER_COUNT} carriers; {STROKE_WIDTH:.3f}px strokes')
    if args.preview_dir:
        previews(files, args.preview_dir)
        print(f'Preview contact sheet: {args.preview_dir / "contact-sheet.png"}')


if __name__ == '__main__':
    main()
