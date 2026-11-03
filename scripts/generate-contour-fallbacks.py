"""Static resting composition for the approved Contour signature in the Studio section."""
import json, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
seed=json.loads((root/'lib/contour-seed.json').read_text())['path']
for w,h,filename in [(720,300,'contour.svg'),(390,160,'contour-mobile.svg')]:
    count=64 if w<600 else 94
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="#100b1b"/><defs><path id="s" d="{seed}"/></defs>']
    anchor_layer=math.floor(count*.90)
    for i in [*range(anchor_layer),count-1,*range(anchor_layer,count-1)]:
        t=i/(count-1)
        anchor=i==count-1
        base=min(w*1.58,h*1.45)
        size=base*(.80+.18*math.sin(t*math.pi))
        x=min(w*.76,w-base*.8*.32-24)-(1-t)*w*.82
        y=h*.5+math.sin(t*math.pi*1.5-.7)*h*.075
        angle=(-.38+t*.42)*180/math.pi
        tr=f'translate({x:.3f} {y:.3f}) rotate({angle:.3f}) scale({size/600:.5f}) translate(-300 -300)'
        ink='hsl(288 38% 64%)' if anchor else f'hsl({252+42*t:.2f} {37+19*t:.2f}% {34+40*math.sin(math.pi*t)**.75:.2f}%)'
        opacity='.38' if anchor else '.035'
        line=.72 if w<600 else .94
        out.append(f'<use href="#s" transform="{tr}" fill="#100b1b" fill-opacity="{opacity}"/>')
        out.append(f'<use href="#s" transform="{tr}" fill="none" stroke="{ink}" stroke-width="{line*600/size:.4f}" stroke-linejoin="round"/>')
    out.append('</svg>')
    (root/'public/brand'/filename).write_text(''.join(out))
