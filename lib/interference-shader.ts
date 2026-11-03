// Original live interpretation of layered raster gratings. The marks are stepped
// lines and short dashes; their coincidence creates the large changing contours.
export const interferenceVertex = `attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
export const interferenceFragment = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_size;
uniform vec2 u_center;
uniform vec2 u_pointer;
uniform float u_scale;
uniform float u_angle;
uniform float u_ink;
uniform float u_phase;
uniform float u_alignment;
uniform float u_time;
uniform float u_reading;
uniform float u_variant;
uniform float u_scroll;
uniform float u_immersive;
uniform float u_merge;
float grain(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float ruled(float p,float w,float aa){float d=abs(fract(p)-.5);return 1.-smoothstep(w-aa,w+aa,d);}
float sheet(vec2 p,vec2 c,vec2 extent){
  vec2 edge=abs(p-c)-extent;
  return 1.-smoothstep(-.0015,.0015,max(edge.x,edge.y));
}
vec3 raster(vec2 p,vec2 uv,float family,float count,float t,float aa){
  float f=clamp(family,0.,1.);
  float turn=(1.-f)*1.5707963;
  vec2 q=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*p;
  float rows=mix(30.,84.,f)+smoothstep(1.,2.,family)*18.;
  float row=floor(q.y*rows);
  float within=fract(q.y*rows);
  float stepped=row/rows;
  float flow=.043*sin(stepped*5.7+t*.33)+.012*sin(stepped*12.3+t*.19);
  float carrier=(q.x+flow)*count+row*.11;
  vec2 d=vec2(q.x,stepped);
  // Broad asymmetric structures are phase differences, not filled silhouettes.
  float radius=length((d-vec2(.14+u_pointer.x*.07,-.12))*vec2(.74,1.12));
  float wave=d.y*2.05+.45*sin(d.x*3.7+d.y*1.7+t*.21)
    +.22*sin(d.x*7.1-d.y*2.5+t*.13);
  float lens=radius*2.35+.28*sin(d.y*4.6+d.x*2.1+t*.17);
  float topology=mix(wave,lens,smoothstep(.4,1.65,family));
  float relative=topology+u_phase+(u_alignment-.5)*.87
    +u_pointer.x*.18+u_pointer.y*.09+t*.10;
  // Layer A and layer B travel at different rates through the page.
  // Closely related carriers preserve broad moire; different mark lengths
  // give the sources their own character before they meet.
  float a=ruled(carrier+u_scroll*.22,.19,aa);
  float b=ruled(carrier*1.012+relative+u_scroll*.41,.21,aa);
  float rowA=1.-smoothstep(.78,.86,within);
  float rowB=1.-smoothstep(.39,.48,fract(q.y*rows+.035));
  a*=rowA;
  b*=rowB;
  // Stable source identities: a left-hand bow and a right-hand angled field.
  // Geometry is in page coordinates, independent of the pattern's chapter rotation.
  // The forms already overlap at rest. Scroll deepens the shared field; it never
  // opens a dark channel between them. Colour keeps both inputs distinguishable.
  float merge=clamp(u_merge+u_pointer.x*.20,0.,1.);
  float radiusX=mix(.31,.53,u_immersive);
  float radiusY=mix(.36,.80,u_immersive);
  float centreA=mix(.27,.15,u_immersive)+merge*mix(.06,.08,u_immersive);
  float centreY=.50+u_pointer.y*.012;
  vec2 bow=(uv-vec2(centreA,centreY))/vec2(radiusX,radiusY);
  float feather=1.5/min(u_resolution.x,u_resolution.y);
  float mA=1.-smoothstep(1.-feather*2.,1.+feather*2.,length(bow));
  // The elbow is deliberately sharp and belongs to B alone. A remains curved.
  float elbow=.48;
  float leftB=mix(.43,.34,u_immersive)+.32*abs(uv.y-elbow)-merge*.08;
  float mB=smoothstep(leftB-feather,leftB+feather,uv.x);
  float boundB=1.-smoothstep(mix(.36,.84,u_immersive)-feather,mix(.36,.84,u_immersive)+feather,abs(uv.y-.50));
  mB*=boundB;
  float joint=a*b;
  float mark=a*.070+b*.080+joint*1.18;
  float edge=(1.-abs(within-.46)*.45);
  mark*=mix(1.,edge,f);
  vec3 ground=vec3(.038,.018,.080);
  vec3 violet=vec3(.50,.28,.70);
  vec3 lilac=vec3(.95,.76,1.);
  vec3 sourceA=mix(vec3(.095,.035,.23),vec3(.43,.26,.84),a*.84);
  vec3 sourceB=mix(vec3(.23,.095,.32),vec3(.82,.56,.89),b*.77);
  vec3 overlap=mix(vec3(.294,.173,.463),violet,clamp(a*.19+b*.23,0.,1.));
  overlap=mix(overlap,lilac,pow(clamp(mark,0.,1.),.96));
  vec3 color=mix(ground,sourceA,mA);
  color=mix(color,sourceB,mB);
  color=mix(color,overlap,mA*mB);
  return color;
}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;uv.y=1.-uv.y;
  vec2 p=(uv-u_center)*vec2(u_size.x/u_size.y,1.);
  float cs=cos(u_angle),sn=sin(u_angle);
  p=mat2(cs,-sn,sn,cs)*p/u_scale;
  p+=u_pointer*vec2(.015,.009);
  float count=clamp(u_size.y/4.7,108.,210.);
  float aa=clamp(count*u_scale/u_resolution.y*.38,.025,.12);
  vec3 color=raster(p,uv,u_variant,count,u_time*.32,aa);
  vec3 ink=vec3(.038,.018,.080);
  float top=1.-smoothstep(.1,.34,uv.y),bottom=smoothstep(.65,.93,uv.y);
  float reading=1.-top*.58-bottom*.72;
  color=mix(ink,color,u_ink*mix(1.,reading,u_reading));
  color+=(grain(gl_FragCoord.xy)-.5)*.011;
  gl_FragColor=vec4(color,1.);
}
`;
