#!/usr/bin/env python3
"""Build no-JavaScript artwork from the same geometry and spectrum as the canvas."""
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ART = json.loads((ROOT / 'lib/optical-art.json').read_text())
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)

def tag(name):
    return f'{{{NS}}}{name}'

for chapter in ('origin', 'belief', 'ways', 'studio'):
    composition = ART['compositions'][chapter]
    tree = ET.parse(ROOT / 'public' / composition['source'].lstrip('/'))
    root = tree.getroot()
    definitions = root.find(tag('defs'))
    paint = root.find(tag('g'))
    radians = math.radians(composition['angle'])
    dx, dy = math.cos(radians) * 900, math.sin(radians) * 562.5
    gradient = ET.SubElement(definitions, tag('linearGradient'), {
        'id': 'spectrum', 'gradientUnits': 'userSpaceOnUse',
        'x1': str(900 - dx), 'y1': str(562.5 - dy),
        'x2': str(900 + dx), 'y2': str(562.5 + dy),
    })
    for stop in ART['palettes'][composition['palette']]:
        ET.SubElement(gradient, tag('stop'), {'offset': str(stop['offset']), 'stop-color': stop['color']})
    # The same alpha transmission: the second plate remains an untinted mask.
    definitions.find(f"{tag('mask')}/{tag('use')}").set('transform', f"translate({composition['phase'] * 1800 / 260},0)")
    angle = composition['rotation']
    scale = max((1800 * abs(math.cos(angle)) + 1125 * abs(math.sin(angle))) / 1800,
                (1125 * abs(math.cos(angle)) + 1800 * abs(math.sin(angle))) / 1125) * composition['zoom']
    # Keep colour in viewport coordinates while transforming the line geometry.
    transform = f'translate(900 562.5) rotate({math.degrees(angle)}) scale({scale}) translate(-900 -562.5)'
    art_mask = ET.SubElement(definitions, tag('mask'), {'id': 'composed', 'maskUnits': 'userSpaceOnUse', 'x': '0', 'y': '0', 'width': '1800', 'height': '1125'})
    paint.set('stroke', 'white')
    paint.set('transform', transform)
    root.remove(paint)
    art_mask.append(paint)
    ET.SubElement(root, tag('rect'), {'width': '1800', 'height': '1125', 'fill': 'url(#spectrum)', 'mask': 'url(#composed)'})
    tree.write(ROOT / 'public/optical' / f'spectrum-{chapter}.svg', encoding='unicode')
    print(f'spectrum-{chapter}.svg')
