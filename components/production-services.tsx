'use client';

import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { t, type CopyKey } from '@/lib/copy';
import { AlignmentContext } from './interference-context';

const productionTypes = [
  { id: 'film', title: 'home.work.film' },
  { id: 'imagery', title: 'home.work.stills' },
  { id: 'worlds', title: 'home.work.worlds' },
  { id: 'hybrid', title: 'home.work.hybrid' },
] as const;
type Production = typeof productionTypes[number];
const easing = [0.22, 1, 0.36, 1] as const;

function ProductionCard({ production, index, open, onToggle, still }: { production: Production; index: number; open: boolean; onToggle: () => void; still: boolean }) {
  const card = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = t(production.title);
  const id = `production-${production.id}`;
  const jobs = Array.from({ length: 6 }, (_, i) => t(`production.${production.id}.jobs.${i + 1}` as CopyKey));
  const transition = { duration: still ? 0 : 0.46, ease: easing };

  useLayoutEffect(() => {
    // A previous mobile tile collapsing must not hide the newly selected heading.
    if (open && card.current && window.matchMedia('(max-width: 850px)').matches && card.current.getBoundingClientRect().top < 0) {
      card.current.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [open]);

  return <motion.article layout={!still} ref={card} className="production-card" data-service={production.id} data-open={open} transition={{ layout: transition }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
        trigger.current?.focus({ preventScroll: true });
      }
    }}>
    <motion.h3 layout="position" transition={{ layout: transition }}>
      <button ref={trigger} className="production-card-trigger" type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-detail`} aria-labelledby={`${id}-label`} aria-describedby={`${id}-summary`}>
        <motion.span layout="position" transition={{ layout: transition }} className="production-card-top"><span className="production-card-number" aria-hidden="true">0{index + 1}</span><ChevronDown className="production-card-chevron" size={24} strokeWidth={1.25} aria-hidden="true"/></motion.span>
        <motion.span layout="position" transition={{ layout: transition }} className="production-card-content"><span id={`${id}-label`} className="production-card-title">{title}</span><span id={`${id}-summary`} className="production-card-summary">{t(`production.${production.id}.summary`)}</span><span className="production-card-hint mono" aria-hidden="true">{t(open ? 'production.collapse' : 'production.explore')}</span></motion.span>
      </button>
    </motion.h3>
    <motion.div layout="position" transition={{ layout: transition }} id={`${id}-detail`} className="production-card-detail" role="region" aria-labelledby={`${id}-label`} hidden={!open}>
      <motion.div key={String(open)} initial={still ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: still ? 0 : 0.24, delay: still ? 0 : 0.1 }}>
        <h4 className="production-jobs-label mono">{t('production.jobs')}</h4>
        <ul className="production-jobs">{jobs.map((job, jobIndex) => <motion.li key={job} initial={still ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: still ? 0 : 0.22, delay: still ? 0 : 0.12 + jobIndex * 0.025 }}>{job}</motion.li>)}</ul>
        <a className="home-contact-link production-enquiry" href={`mailto:${t('contact.email')}?subject=${encodeURIComponent(t('contact.capabilitySubject', { capability: title.toLowerCase() }))}`}>{t('production.enquiry', { production: title })}<ArrowUpRight size={20} aria-hidden="true"/></a>
      </motion.div>
    </motion.div>
  </motion.article>;
}

/** Coordinated bento expansion with quiet surfaces and readable project lists. */
export function ProductionServices() {
  const [active, setActive] = useState<Production['id'] | null>(null);
  const reducedMotion = useReducedMotion();
  const { paused } = useContext(AlignmentContext);
  const still = paused || reducedMotion === true;
  return <section id="production" className="home-section production-services" aria-labelledby="production-title">
    <div className="home-section-heading"><span className="mono" aria-hidden="true">03</span><h2 id="production-title">{t('production.title')}</h2></div>
    <p className="production-intro">{t('production.description')}</p>
    <MotionConfig reducedMotion="user"><LayoutGroup id="production-bento">
      <div className="production-cards" data-active={active ?? 'none'}>{productionTypes.map((production, index) => <ProductionCard key={production.id} production={production} index={index} open={active === production.id} still={still} onToggle={() => setActive(current => current === production.id ? null : production.id)}/>)}</div>
    </LayoutGroup></MotionConfig>
  </section>;
}
