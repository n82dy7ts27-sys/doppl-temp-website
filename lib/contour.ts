// Approved single-pose Contour geometry; site placement only changes its framing.
export type ContourInput = { x: number; y: number; scroll: number };
type Input = ContourInput;
const mix = (a: number, b: number, t: number) => a + (b-a)*t;

function stamp(ctx:CanvasRenderingContext2D,path:Path2D,x:number,y:number,size:number,angle:number,ink:string,fill=false,line=1) {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(size/600,size/600);ctx.translate(-300,-300);
  ctx.lineJoin='round';ctx.lineWidth=line*600/size;
  if(fill){ctx.fillStyle=ink;ctx.fill(path,'evenodd');}else{ctx.strokeStyle=ink;ctx.stroke(path);}
  ctx.restore();
}

export function drawContour(ctx:CanvasRenderingContext2D,path:Path2D,w:number,h:number,input:Input) {
  const count=w<600?64:94;
  const spread=w*(.82+input.x*.08);
  const size=Math.min(w*1.58,h*1.45);
  // Keep the pose complete, but draw it behind the trail so it is discovered within it.
  const leadingX=Math.min(w*.76,w-size*.8*.32-24);
  const anchorLayer=Math.floor(count*.90);
  for(let layer=0;layer<count;layer++){
    const i=layer===anchorLayer?count-1:layer>anchorLayer?layer-1:layer;
    const t=i/(count-1),anchor=i===count-1;
    const bend=Math.sin(t*Math.PI*1.5-.7+input.y*.32);
    const x=leadingX-(1-t)*spread;
    const y=h*.50+bend*h*.075+input.scroll*h*.045;
    const s=size*(.80+.18*Math.sin(t*Math.PI));
    const angle=-.38+t*.42+input.y*mix(.15,.035,t)+Math.sin(t*Math.PI)*input.x*.12;
    const ink=`hsl(${mix(252,294,t)} ${mix(37,56,t)}% ${34+40*Math.pow(Math.sin(Math.PI*t),.75)}%)`;
    stamp(ctx,path,x,y,s,angle,anchor?'rgba(16,11,27,.38)':'rgba(16,11,27,.035)',true);
    stamp(ctx,path,x,y,s,angle,anchor?'hsl(288 38% 64%)':ink,false,w<600?.72:.94);
  }
}

