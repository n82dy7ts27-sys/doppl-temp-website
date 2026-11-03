'use client';
import { t } from '@/lib/copy';
import { useRef, useState } from 'react';
import { ArrowUpRight, Plus, Minus } from 'lucide-react';
import { capabilities, stages } from '@/lib/content';
import { ProductionSpectrum, ProcessDiagram } from './interference-diagrams';
import { SectionLabel } from './identity';

// Adapted from the state/content relationship in 21st's Studiova Services Tabs.
// Original doppl design and copy, with native button and region semantics.
export function Capabilities(){
  const [active,setActive]=useState<number|null>(0);
  return <section id="capabilities" className="capabilities-section" data-field="capabilities">
    <SectionLabel number="03" aside={t('capabilities.aside')}>{t('capabilities.label')}</SectionLabel>
    <div className="capabilities-heading"><h2><span style={{ whiteSpace: 'pre-line' }}>{t('capabilities.title')}</span></h2><p>{t('capabilities.description')}</p></div>
    <ProductionSpectrum/>
    <div className="capability-list">{capabilities.map((item,i)=><article className={`capability ${active===i?'is-open':''}`} key={item.title}>
      <h3><button type="button" aria-expanded={active===i} aria-controls={`capability-panel-${i}`} id={`capability-button-${i}`} onClick={()=>setActive(active===i?null:i)}><span className="capability-number mono">0{i+1}/</span><span>{item.title}</span><span className="capability-toggle">{active===i?<Minus size={26} strokeWidth={1.2} aria-hidden="true"/>:<Plus size={26} strokeWidth={1.2} aria-hidden="true"/>}</span></button></h3>
      <div className="capability-reveal" hidden={active!==i} id={`capability-panel-${i}`} role="region" aria-labelledby={`capability-button-${i}`}>
        <div className="capability-story"><p className="capability-short">{item.short}</p><p>{item.description}</p><a className="text-link mono" href={`mailto:${t('contact.email')}?subject=${encodeURIComponent(t('contact.capabilitySubject', { capability: item.title.toLowerCase() }))}`}>{t('capabilities.cta')} <ArrowUpRight size={17} aria-hidden="true"/></a></div>
        <ul className="capability-scope">{item.scopes.map(scope=><li key={scope}>{scope}</li>)}</ul><span className="capability-note mono">{item.note}</span>
      </div>
    </article>)}</div>
  </section>;
}

export function Approach(){
  const [stage,setStage]=useState(0);
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);
  const current=stages[stage];
  return <section id="approach" className="approach-section" data-field="process">
    <SectionLabel number="05" aside={t('approach.aside')}>{t('approach.label')}</SectionLabel>
    <div className="approach-intro"><h2><span style={{ whiteSpace: 'pre-line' }}>{t('approach.title')}</span></h2><p>{t('approach.description')}</p></div>
    <div className="process-tabs" role="tablist" aria-label={t('approach.tabsAria')} onKeyDown={event=>{let next=stage;if(event.key==='ArrowRight')next=(stage+1)%6;else if(event.key==='ArrowLeft')next=(stage+5)%6;else if(event.key==='Home')next=0;else if(event.key==='End')next=5;else return;event.preventDefault();setStage(next);buttons.current[next]?.focus();}}>
      {stages.map((item,i)=><button ref={el=>{buttons.current[i]=el;}} key={item.name} type="button" role="tab" aria-selected={stage===i} aria-controls="process-panel" id={`stage-${i}`} tabIndex={stage===i?0:-1} onClick={()=>setStage(i)}><span className="mono">0{i+1}</span><span>{item.name}</span><span className="process-line"/></button>)}
    </div>
    <div id="process-panel" role="tabpanel" aria-labelledby={`stage-${stage}`} className="process-panel" tabIndex={0}>
      <span className="process-big-number" aria-hidden="true">0{stage+1}</span><div className="process-copy" key={stage}><h3>{current.title}</h3><p>{current.description}</p><div className="process-output mono">{current.output}</div></div><div className="process-art"><ProcessDiagram stage={stage}/></div>
    </div>
  </section>;
}

export { SiteContact as Footer } from './site-contact';
