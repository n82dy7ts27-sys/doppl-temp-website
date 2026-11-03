'use client';

import { t } from '@/lib/copy';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

// Import styles/interference-diagrams.css from the application stylesheet entry.
// These are illustrations of a creative process, not quantitative charts.
type Form = { x: number; y: number; width: number; height: number; radius?: number; angle?: number };
type FieldLayout = { warm: Form; cool: Form };
type Texture = 'ruled' | 'dashes';

const judgementLayout: FieldLayout = {
  warm: { x: 154, y: 48, width: 442, height: 314 },
  cool: { x: 374, y: 110, width: 432, height: 314 },
};

function formTransform(form: Form) {
  return `translate(${form.x} ${form.y}) rotate(${form.angle ?? 0} ${form.width / 2} ${form.height / 2})`;
}

// Original gratings: discrete rows and quantised offsets make the broad folds.
// No source image, source tracing, turbulence filter or per-frame DOM generation.
const number = (value: number) => Math.round(value * 10) / 10;

function ruledPath(phase: number, pitch: number) {
  const rows: string[] = [];
  for (let row = -7; row < 86; row++) {
    let path = '';
    for (let x = -10; x <= 500; x += 5) {
      const fold = 12 * Math.sin(x / 79 + row * .073 + phase)
        + 7 * Math.sin(x / 33 - row * .036 + phase * .5);
      const y = number(row * pitch + Math.round(fold / 1.6) * 1.6);
      path += x === -10 ? `M${x} ${y}` : `H${x}V${y}`;
    }
    rows.push(path);
  }
  return rows.join('');
}

function dashedPath(phase: number, pitch: number, length: number) {
  let path = '';
  for (let row = -3; row < 51; row++) {
    const y = row * 8.6;
    const offset = Math.round((9 * Math.sin(row * .14 + phase) + 5 * Math.sin(row * .062)) / 1.5) * 1.5;
    for (let column = -5; column < 94; column++) {
      const x = column * pitch + offset;
      path += `M${number(x)} ${number(y)}v${length}`;
    }
  }
  return path;
}

// The slow beat between the two source pitches becomes a broad third pattern.
// It is drawn only inside their geometric intersection, never inside either source alone.
function coincidencePaths() {
  const paths=['','',''];
  for(let row=-3;row<51;row++){
    const y=row*8.6;
    const offsetA=9*Math.sin(row*.14+.25)+5*Math.sin(row*.062);
    const offsetB=9*Math.sin(row*.14+.87)+5*Math.sin(row*.062);
    for(let column=-5;column<94;column++){
      const x=column*5.55+Math.round(offsetA/1.5)*1.5;
      const phase=x*(1/5.55-1/5.64)+(offsetA-offsetB)/5.55;
      const energy=Math.pow(.5+.5*Math.cos(phase*Math.PI*2),1.2);
      const level=energy<.2?0:energy<.58?1:2;
      paths[level]+=`M${number(x)} ${number(y)}v${number(1.1+energy*6.1)}`;
    }
  }
  return paths;
}

const gratings = {
  ruled: [ruledPath(.2, 5.15), ruledPath(.75, 5.24)],
  dashes: [dashedPath(.25, 5.55, 6.6), dashedPath(.87, 5.64, 3.6)],
  coincidence: coincidencePaths(),
};

function FieldDefinitions({ id, texture = 'dashes' }: { id: string; texture?: Texture }) {
  return <defs>
    {(['warm', 'cool'] as const).map((tone, index) => <g key={tone}>
      <path id={`${id}-${tone}-marks`} d={gratings[texture][index]} fill="none" />
      <pattern id={`${id}-${tone}`} width="480" height="400" patternUnits="userSpaceOnUse">
        <use href={`#${id}-${tone}-marks`} stroke={`var(--if-${tone})`} strokeWidth={index === 0 ? 1.4 : 1.2} />
      </pattern>
    </g>)}
    <pattern id={`${id}-overlap`} width="480" height="400" patternUnits="userSpaceOnUse">
      {gratings.coincidence.map((path,index)=><path key={index} d={path} fill="none" stroke="var(--if-light)" strokeWidth="1.7" opacity={[.16,.55,1][index]} />)}
    </pattern>
  </defs>;
}

function sourceOutline(tone: 'warm' | 'cool', form: Form) {
  const w=form.width,h=form.height;
  return tone==='warm'
    ? `M0 0H${w*.32}C${w*.78} 0 ${w} ${h*.19} ${w} ${h*.5}S${w*.78} ${h} ${w*.32} ${h}H0Z`
    : `M${w*.26} 0H${w}V${h}H${w*.26}L0 ${h*.48}Z`;
}

function useFieldMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '100px' });
    observer.observe(element);
    const move = (event: globalThis.PointerEvent) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || element.closest('[data-motion=paused].doppl-system')) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty('--field-x', `${((event.clientX-rect.left)/rect.width-.5)*22}px`);
      element.style.setProperty('--field-y', `${((event.clientY-rect.top)/rect.height-.5)*14}px`);
    };
    const leave = () => {element.style.setProperty('--field-x','0px');element.style.setProperty('--field-y','0px');};
    element.addEventListener('pointermove', move, {passive:true});
    element.addEventListener('pointerleave', leave);
    return () => {observer.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);};
  }, []);
  return { ref, motion: !visible ? 'paused' : 'playing' };
}

function FieldPair({ id, layout, registration = false }: { id: string; layout: FieldLayout; registration?: boolean }) {
  const bounds = {
    left: Math.min(layout.warm.x, layout.cool.x) - 16,
    right: Math.max(layout.warm.x + layout.warm.width, layout.cool.x + layout.cool.width) + 16,
    top: Math.min(layout.warm.y, layout.cool.y) - 16,
    bottom: Math.max(layout.warm.y + layout.warm.height, layout.cool.y + layout.cool.height) + 16,
  };
  const registrationPoints = [[bounds.left, bounds.top], [bounds.right, bounds.top], [bounds.left, bounds.bottom], [bounds.right, bounds.bottom]];
  function layer(tone: 'warm' | 'cool') {
    const form=layout[tone];
    return <g transform={formTransform(form)} className={`if-form if-form--${tone}`}>
      <g className={`if-pointer-layer if-pointer-layer--${tone}`}><g className={`if-grating-flow if-grating-flow--${tone}`}>
        <rect x="-24" y="-24" width={form.width+48} height={form.height+48} fill={`url(#${id}-${tone})`} />
      </g></g>
    </g>;
  }
  return <g className="if-field-pair">
    <defs>
      {(['warm','cool'] as const).map(tone=><clipPath key={tone} id={`${id}-${tone}-clip`}>
        <path d={sourceOutline(tone,layout[tone])} transform={formTransform(layout[tone])} />
      </clipPath>)}
    </defs>
    {(['warm','cool'] as const).map(tone=><g key={tone} clipPath={`url(#${id}-${tone}-clip)`}>{layer(tone)}</g>)}
    {/* The third pattern is the coincidence of both gratings, clipped to their intersection. */}
    <g clipPath={`url(#${id}-warm-clip)`}><g clipPath={`url(#${id}-cool-clip)`}>
      <rect x={bounds.left} y={bounds.top} width={bounds.right-bounds.left} height={bounds.bottom-bounds.top} fill="var(--if-shared)" />
      <g className="if-grating-flow if-grating-flow--warm"><rect x={bounds.left-12} y={bounds.top-12} width={bounds.right-bounds.left+24} height={bounds.bottom-bounds.top+24} fill={`url(#${id}-overlap)`} /></g>
    </g></g>
    {registration && <g className="if-registration" aria-hidden="true">
      {registrationPoints.map(([x, y]) => <path key={`${x}-${y}`} d={`M${x - 9} ${y}h18M${x} ${y - 9}v18`} />)}
    </g>}
  </g>;
}

/** Human judgement and technical possibility create a distinctive third field. */
export function JudgementDiagram({ className = '' }: { className?: string }) {
  const id = `judgement-${useId().replace(/:/g, '')}`;
  const [alignment, setAlignment] = useState(0);
  const motion = useFieldMotion();
  const layout = { warm: judgementLayout.warm, cool: { ...judgementLayout.cool, x: judgementLayout.cool.x + alignment * .3, y: judgementLayout.cool.y + alignment * .12 } };
  function discover(event: PointerEvent<SVGSVGElement>) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || event.currentTarget.closest('[data-motion=paused].doppl-system')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setAlignment(Math.round(((event.clientX-rect.left)/rect.width-.5)*160));
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key==='ArrowLeft'||event.key==='ArrowRight') {
      event.preventDefault();setAlignment(value=>Math.max(-100,Math.min(100,value+(event.key==='ArrowRight'?10:-10))));
    }
  }

  return <div ref={motion.ref} className={`if-diagram if-judgement ${className}`} data-motion={motion.motion}><figure>
    <div className="if-judgement-inputs">
      <div className="if-input-label if-input-label--warm">
        <span className="if-eyebrow"><i aria-hidden="true" />{t('diagrams.judgement.human')}</span>
        <span className="if-input-words">{t('diagrams.judgement.craft')}</span>
      </div>
      <span className="if-equation-sign" aria-hidden="true"></span>
      <div className="if-input-label if-input-label--cool">
        <span className="if-eyebrow"><i aria-hidden="true" />{t('diagrams.judgement.generative')}</span>
        <span className="if-input-words">{t('diagrams.judgement.possibility')}</span>
      </div>
    </div>
    <svg className="if-judgement-svg if-draggable-field" viewBox="0 0 960 490" role="img" aria-labelledby={`${id}-title ${id}-desc`} tabIndex={0} onPointerMove={discover} onPointerLeave={()=>setAlignment(0)} onKeyDown={key}>
      <title id={`${id}-title`}>{t('diagrams.judgement.title')}</title>
      <desc id={`${id}-desc`}>{t('diagrams.judgement.description')}</desc>
      <FieldDefinitions id={id} texture="ruled" />
      <FieldPair id={id} layout={layout} />
      <g className="if-leaders" aria-hidden="true">
        <path d={`M70 0v90h158M890 0v${layout.cool.y + 62}H${layout.cool.x + 304}`} />
        <circle cx="228" cy="90" r="3" />
        <circle cx={layout.cool.x + 304} cy={layout.cool.y + 62} r="3" />
        <path d="M476 271v219" />
        <circle cx="476" cy="271" r="4" />
      </g>
    </svg>
    <figcaption className="if-judgement-result">
      <span className="if-eyebrow">{t('diagrams.judgement.resultLabel')}</span>
      <strong>{t('diagrams.judgement.resultTitle')}</strong>
      <p>{t('diagrams.judgement.resultDescription')}</p>
    </figcaption>
  </figure></div>;
}

const productionRoutes = [
  {
    name: t('diagrams.production.generative.name'),
    note: t('diagrams.production.generative.note'),
    title: t('diagrams.production.generative.title'),
    description: t('diagrams.production.generative.description'),
    detail: t('diagrams.production.generative.detail'),
    warmLabel: t('diagrams.production.generative.warmLabel'),
    coolLabel: t('diagrams.production.generative.coolLabel'),
    layout: {
      warm: { x: 152, y: 88, width: 330, height: 276, radius: 36 },
      cool: { x: 386, y: 88, width: 330, height: 276, radius: 36 },
    },
  },
  {
    name: t('diagrams.production.capture.name'),
    note: t('diagrams.production.capture.note'),
    title: t('diagrams.production.capture.title'),
    description: t('diagrams.production.capture.description'),
    detail: t('diagrams.production.capture.detail'),
    warmLabel: t('diagrams.production.capture.warmLabel'),
    coolLabel: t('diagrams.production.capture.coolLabel'),
    layout: {
      warm: { x: 190, y: 60, width: 330, height: 276, radius: 36 },
      cool: { x: 344, y: 130, width: 330, height: 276, radius: 36 },
    },
  },
  {
    name: t('diagrams.production.specialist.name'),
    note: t('diagrams.production.specialist.note'),
    title: t('diagrams.production.specialist.title'),
    description: t('diagrams.production.specialist.description'),
    detail: t('diagrams.production.specialist.detail'),
    warmLabel: t('diagrams.production.specialist.warmLabel'),
    coolLabel: t('diagrams.production.specialist.coolLabel'),
    layout: {
      warm: { x: 180, y: 126, width: 330, height: 276, radius: 36 },
      cool: { x: 384, y: 56, width: 330, height: 276, radius: 36 },
    },
  },
] satisfies Array<{ name: string; note: string; title: string; description: string; detail: string; warmLabel: string; coolLabel: string; layout: FieldLayout }>;

/** Three equal production routes, controlled by accessible, keyboard-operable tabs. */
export function ProductionSpectrum({ className = '' }: { className?: string }) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const id = `production-${useId().replace(/:/g, '')}`;
  const route = productionRoutes[selected];
  const motion = useFieldMotion();

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    let next = selected;
    if (event.key === 'ArrowRight') next = (selected + 1) % productionRoutes.length;
    else if (event.key === 'ArrowLeft') next = (selected + productionRoutes.length - 1) % productionRoutes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = productionRoutes.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  }

  return <div ref={motion.ref} className={`if-diagram if-production ${className}`} data-motion={motion.motion}>
    <div className="if-route-tabs" role="tablist" aria-label={t('diagrams.production.tabsAria')} onKeyDown={handleKeys}>
      {productionRoutes.map((item, index) => <button
        key={item.name}
        ref={element => { buttons.current[index] = element; }}
        id={`${id}-tab-${index}`}
        type="button"
        role="tab"
        tabIndex={selected === index ? 0 : -1}
        aria-selected={selected === index}
        aria-controls={`${id}-panel`}
        onClick={() => setSelected(index)}
      >
        <span className="if-route-title">{item.name}<span aria-hidden="true">↗</span></span>
        <span className="if-route-note">{item.note}</span>
      </button>)}
    </div>
    <div className="if-route-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`} tabIndex={0}>
      <div className="if-route-art">
        <div className="if-route-art-labels" aria-hidden="true">
          <span><i className="if-warm-dot" />{route.warmLabel}</span>
          <span><i className="if-cool-dot" />{route.coolLabel}</span>
        </div>
        <svg viewBox="80 0 720 466" role="img" aria-labelledby={`${id}-art-title ${id}-art-desc`}>
          <title id={`${id}-art-title`}>{t('diagrams.production.artTitle', { route: route.name, human: route.warmLabel, generative: route.coolLabel })}</title>
          <desc id={`${id}-art-desc`}>{t('diagrams.production.artDescription')}</desc>
          <FieldDefinitions id={id} />
          <g key={selected} className="if-field-reveal"><FieldPair id={id} layout={route.layout} /></g>
          <g className="if-leaders" aria-hidden="true">
            <path d={`M110 16v38h${route.layout.warm.x + 44 - 110}v${route.layout.warm.y + 18 - 54}`} />
            <path d={`M770 16v38H${route.layout.cool.x + route.layout.cool.width - 44}v${route.layout.cool.y + 18 - 54}`} />
            <circle cx={route.layout.warm.x + 44} cy={route.layout.warm.y + 18} r="3" />
            <circle cx={route.layout.cool.x + route.layout.cool.width - 44} cy={route.layout.cool.y + 18} r="3" />
          </g>
        </svg>
        <div className="if-route-under"><div className="if-route-constant"><span aria-hidden="true">↔</span>{t('diagrams.production.constant')}</div></div>
      </div>
      <div className="if-route-copy">
        <span className="if-eyebrow">{route.note}</span>
        <h3>{route.title}</h3>
        <p>{route.description}</p>
        <p className="if-route-use">{route.detail}</p>
      </div>
    </div>
    <p className="if-spectrum-note">{t('diagrams.production.note')}</p>
  </div>;
}

const processStages = [
  { id: 'define', name: t('approach.define.name'), warm: t('diagrams.process.define.warm'), cool: t('diagrams.process.define.cool'), result: t('diagrams.process.define.result'), explanation: t('diagrams.process.define.explanation'), layout: { warm: { x: 140, y: 75, width: 288, height: 272, radius: 34 }, cool: { x: 418, y: 117, width: 288, height: 272, radius: 34 } } },
  { id: 'prove', name: t('approach.prove.name'), warm: t('diagrams.process.prove.warm'), cool: t('diagrams.process.prove.cool'), result: t('diagrams.process.prove.result'), explanation: t('diagrams.process.prove.explanation'), layout: { warm: { x: 162, y: 66, width: 288, height: 272, radius: 34 }, cool: { x: 378, y: 128, width: 288, height: 272, radius: 34 } } },
  { id: 'build', name: t('approach.build.name'), warm: t('diagrams.process.build.warm'), cool: t('diagrams.process.build.cool'), result: t('diagrams.process.build.result'), explanation: t('diagrams.process.build.explanation'), layout: { warm: { x: 192, y: 62, width: 330, height: 272, radius: 34 }, cool: { x: 340, y: 126, width: 330, height: 272, radius: 34 } } },
  { id: 'review', name: t('approach.review.name'), warm: t('diagrams.process.review.warm'), cool: t('diagrams.process.review.cool'), result: t('diagrams.process.review.result'), explanation: t('diagrams.process.review.explanation'), layout: { warm: { x: 204, y: 76, width: 330, height: 272, radius: 34 }, cool: { x: 280, y: 100, width: 330, height: 272, radius: 34 } } },
  { id: 'finish', name: t('approach.finish.name'), warm: t('diagrams.process.finish.warm'), cool: t('diagrams.process.finish.cool'), result: t('diagrams.process.finish.result'), explanation: t('diagrams.process.finish.explanation'), layout: { warm: { x: 220, y: 74, width: 428, height: 272, radius: 34 }, cool: { x: 228, y: 82, width: 428, height: 272, radius: 34 } } },
  { id: 'extend', name: t('approach.extend.name'), warm: t('diagrams.process.extend.warm'), cool: t('diagrams.process.extend.cool'), result: t('diagrams.process.extend.result'), explanation: t('diagrams.process.extend.explanation'), layout: { warm: { x: 210, y: 70, width: 350, height: 272, radius: 34 }, cool: { x: 342, y: 118, width: 350, height: 272, radius: 34 } } },
] satisfies Array<{ id: string; name: string; warm: string; cool: string; result: string; explanation: string; layout: FieldLayout }>;

/** stage is zero-based (0–5). The same diagram remains visible at every screen size. */
export function ProcessDiagram({ stage, className = '' }: { stage: number; className?: string }) {
  const index = Number.isFinite(stage) ? Math.max(0, Math.min(5, Math.trunc(stage))) : 0;
  const item = processStages[index];
  const id = `process-${useId().replace(/:/g, '')}`;
  const motion = useFieldMotion();
  const warmPoint = { x: item.layout.warm.x + 44, y: item.layout.warm.y + 18 };
  const coolPoint = { x: item.layout.cool.x + item.layout.cool.width - 44, y: item.layout.cool.y + 18 };

  return <div ref={motion.ref} className={`if-diagram if-process if-process--${item.id} ${className}`} data-motion={motion.motion}><figure>
    <div className="if-process-labels">
      <span><i className="if-warm-dot" />{item.warm}</span>
      <span><i className="if-cool-dot" />{item.cool}</span>
    </div>
    <svg viewBox="90 0 680 456" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{t('diagrams.process.artTitle', { stage: item.name, result: item.result })}</title>
      <desc id={`${id}-desc`}>{t('diagrams.process.artDescription', { explanation: item.explanation })}</desc>
      <FieldDefinitions id={id} />
      {index === 5 ? <>
        <defs>
          <g id={`${id}-source`}><FieldPair id={id} layout={item.layout} /></g>
          <clipPath id={`${id}-crop-a`}><rect x="114" y="88" width="172" height="276" /></clipPath>
          <clipPath id={`${id}-crop-b`}><rect x="320" y="126" width="226" height="192" /></clipPath>
          <clipPath id={`${id}-crop-c`}><rect x="580" y="88" width="172" height="276" /></clipPath>
        </defs>
        <g clipPath={`url(#${id}-crop-a)`}><use href={`#${id}-source`} transform="translate(-195 -22) scale(.9)" /></g>
        <g clipPath={`url(#${id}-crop-b)`}><use href={`#${id}-source`} transform="translate(100 27) scale(.78)" /></g>
        <g clipPath={`url(#${id}-crop-c)`}><use href={`#${id}-source`} transform="translate(263 -4) scale(.88)" /></g>
        <g className="if-extension-edges" aria-hidden="true"><path d="M114 378v12h638v-12M432 390v20" /></g>
      </> : <g key={index} className="if-field-reveal"><FieldPair id={id} layout={item.layout} registration={index === 4} /></g>}
      {index === 3 && <rect className="if-retained-edge" x="246" y="88" width="330" height="272" />}
      {index !== 5 && <g className="if-leaders" aria-hidden="true">
        <path d={`M125 15v28H${warmPoint.x}V${warmPoint.y}M735 15v28H${coolPoint.x}V${coolPoint.y}`} />
        <circle cx={warmPoint.x} cy={warmPoint.y} r="3" />
        <circle cx={coolPoint.x} cy={coolPoint.y} r="3" />
      </g>}
    </svg>
    <figcaption><span className="if-process-result-mark" aria-hidden="true">=</span><span>{item.result}</span></figcaption>
  </figure></div>;
}
