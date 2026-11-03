'use client';

import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowUpRight, ArrowLeft } from 'lucide-react';
import { EchoSystem } from '@/components/echo-system';
import { AlignmentContext } from '@/components/interference-context';
import { HeroMascot } from '@/components/hero-mascot';
import { Wordmark } from '@/components/identity';
import { ProductionServices } from '@/components/production-services';
import { SiteContact } from '@/components/site-contact';
import { OpeningFilm } from '@/components/opening-film';
import { CursorEcho } from '@/components/cursor-echo';
import { t, type CopyKey } from '@/lib/copy';

type Direction = 'editorial' | 'cinematic' | 'spatial';
const directions = [
  { id: 'editorial', name: 'Editorial Chapters' },
  { id: 'cinematic', name: 'Cinematic Sequence' },
  { id: 'spatial', name: 'Spatial Index' },
] as const;
const chapters = [
  { id: 'studio', label: 'Studio' },
  { id: 'how-we-work', label: 'How we work' },
  { id: 'production', label: 'Capabilities' },
  { id: 'work', label: 'Our work' },
] as const;

function useStill() {
  const reduced = useReducedMotion();
  const { paused } = useContext(AlignmentContext);
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 800px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return paused || reduced === true || compact;
}

/** The wrapper is the stable measurement target; only the child moves. */
function Depth({ children, className = '', amount = 32, settle = false }: { children: ReactNode; className?: string; amount?: number; settle?: boolean }) {
  const target = useRef<HTMLDivElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 0.48, 1], [amount, 0, settle ? 0 : -amount]);
  return <div ref={target} className={className}><motion.div className="direction-depth-child" style={{ y: still ? 0 : y }}>{children}</motion.div></div>;
}

function Sentences({ copyKey, className = '' }: { copyKey: CopyKey; className?: string }) {
  const sentences = t(copyKey).split(/(?<=[.!?])\s+/);
  // Keep brief conversational openings attached to the sentence they introduce.
  if (sentences.length > 1 && sentences[0].split(/\s+/).length < 5) {
    sentences.splice(0, 2, `${sentences[0]} ${sentences[1]}`);
  }
  return <div className={`direction-sentences ${className}`}>{sentences.map((sentence, index) => <p key={index}>{sentence}</p>)}</div>;
}

function StudyBar({ direction }: { direction: Direction }) {
  return <div className="direction-review-bar"><a href="/directions/"><ArrowLeft size={13}/><span>All directions</span></a><nav aria-label="Choose a design study">{directions.map((item, index) => <a key={item.id} href={`/directions/${item.id}/`} aria-label={`0${index + 1} ${item.name}`} aria-current={direction === item.id ? 'page' : undefined}><span>0{index + 1}</span><span>{item.name}</span></a>)}</nav></div>;
}

function useChapter() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-direction-chapter]'));
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      const nearest = sections.filter(section => visible.has(section)).sort((a,b) => Math.abs(a.getBoundingClientRect().top - 150) - Math.abs(b.getBoundingClientRect().top - 150))[0];
      if (nearest) setActive(nearest.dataset.directionChapter ?? 'top');
    }, { rootMargin: '-18% 0px -50% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return active;
}

function ChapterLinks({ active, spatial = false, onSelect }: { active: string; spatial?: boolean; onSelect?: () => void }) {
  return <>{chapters.map((item, index) => <a key={item.id} href={`#${item.id}`} onClick={onSelect} aria-current={active === item.id ? 'location' : undefined}><span className="direction-nav-number mono" aria-hidden="true">0{index + 1}</span><span>{spatial && item.id === 'studio' ? t('home.studio.title').replace(/\s+/g, ' ') : item.label}</span></a>)}</>;
}

function DirectionNav({ direction, active }: { direction: Direction; active: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  return <header className="direction-nav">
    <a className="header-symbol" href="#top" aria-label={t('navigation.homeAria')}><span aria-hidden="true"/></a>
    {direction === 'editorial' ? <nav className="direction-chapter-links" aria-label="Main navigation"><ChapterLinks active={active}/></nav> : direction === 'spatial' ? <a className="direction-index-jump" href="#index">Studio index<ArrowDown size={15}/></a> : <button className="direction-index-trigger" ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="direction-menu" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>Index<span className="direction-menu-lines" aria-hidden="true"/></button>}
    <a href="#contact" className="direction-contact">Contact<ArrowUpRight size={16} aria-hidden="true"/></a>
    {direction === 'cinematic' && <dialog id="direction-menu" ref={dialog} className="direction-menu" aria-label="Site index" onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }} onClick={event => { if(event.target === event.currentTarget) close(); }}>
      <div className="direction-menu-top"><span className="mono">Doppl / Index</span><button type="button" onClick={close}>Close<ArrowUpRight size={18}/></button></div>
      <nav aria-label="Site index"><ChapterLinks active={active} onSelect={close}/><a href="#contact" onClick={close}><span className="direction-nav-number mono">05</span><span>Contact</span></a></nav>
    </dialog>}
  </header>;
}

function Intro({ direction }: { direction: Direction }) {
  return <section id="top" className="direction-opening" aria-labelledby="direction-title" data-direction-chapter="top">
    <div className="direction-wordmark"><Wordmark/></div>
    {direction === 'spatial' && <div className="spatial-film-intro"><p className="mono">{t('hero.studio')}</p><OpeningFilm/></div>}
    {direction !== 'spatial' && <div className="direction-signature"><p className="direction-descriptor mono">{t('hero.studio')}</p><div className="direction-mascot"><HeroMascot/></div></div>}
    <div className="direction-proposition">
      <Depth className="direction-proposition-heading" amount={direction === 'cinematic' ? 44 : 22} settle><h1 id="direction-title">{t('hero.title').split(/(\s+)/).map((part, index) => /\S/.test(part) ? <span className="direction-title-word" key={index}>{part}</span> : part)}</h1></Depth>
      {direction === 'spatial' ? <>
        <div className="direction-mascot spatial-proposition-mascot"><HeroMascot/></div>
        <div className="spatial-proposition-copy">
          <div><p>{t('hero.description')}</p><p>{t('home.production')}</p></div>
          <div><p>{t('home.studio.worlds')}</p><a className="direction-text-link" href="#contact">{t('home.intro.cta')}<ArrowUpRight size={20}/></a></div>
        </div>
      </> : <>
        <p className="direction-lead">{t('hero.description')}</p>
        <div className="direction-support"><p>{t('home.production')}</p><p>{t('home.studio.worlds')}</p><a className="direction-text-link" href="#contact">{t('home.intro.cta')}<ArrowUpRight size={20}/></a></div>
      </>}
    </div>
  </section>;
}

function Reel({ direction }: { direction: Direction }) {
  const target = useRef<HTMLElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target, offset: ['start end', 'center center'] });
  const aperture = useTransform(scrollYProgress, [0,1], ['inset(12% 14% 12% 14%)','inset(0% 0% 0% 0%)']);
  return <section ref={target} className="direction-reel" aria-label={t('home.reel.title')}>
    <motion.div className="direction-reel-frame" style={{ clipPath: !still && direction === 'cinematic' ? aperture : 'inset(0%)' }}>
      <span className="direction-reel-corner mono" aria-hidden="true">Doppl / Reel</span>
      <div><p>{t('home.reel.title')}</p><span className="mono">{t('home.reel.status')}</span></div>
      <span className="direction-reel-format mono" aria-hidden="true">16:9</span>
    </motion.div>
  </section>;
}

function Studio({ direction }: { direction: Direction }) {
  return <section id="studio" className="direction-studio direction-section" aria-labelledby="direction-studio-title" data-direction-chapter="studio">
    <div className="direction-label mono"><span>01</span><span>Studio</span></div>
    {direction === 'cinematic' ? <>
      <Depth amount={40}><h2 id="direction-studio-title">{t('home.studio.title')}</h2></Depth>
      <p className="direction-studio-intro">{t('home.studio.intro')}</p>
      <div className="direction-film-panels">
        <div className="direction-film-panel"><Sentences copyKey="home.studio.creative"/></div>
        <div className="direction-film-panel"><Sentences copyKey="home.studio.strategy"/></div>
      </div>
    </> : <>
      <Depth amount={direction === 'spatial' ? 32 : 26} settle={direction === 'spatial'}><h2 id="direction-studio-title">{t('home.studio.title')}</h2></Depth>
      <div className="direction-studio-reading"><p className="direction-studio-intro">{t('home.studio.intro')}</p><div className="direction-expertise"><Sentences copyKey="home.studio.creative"/><Sentences copyKey="home.studio.strategy"/></div></div>
    </>}
  </section>;
}

function Engagement({ direction }: { direction: Direction }) {
  return <section id="how-we-work" className="direction-engagement direction-section" aria-labelledby="direction-how-title" data-direction-chapter="how-we-work">
    <div className="direction-label mono"><span>02</span><span>{t('home.engagement.title')}</span></div>
    <div className="direction-engagement-heading"><Depth amount={24} settle={direction === 'spatial'}><h2 id="direction-how-title">{t('home.engagement.title')}</h2></Depth><p>{t('home.engagement.intro')}</p></div>
    <article id="idea" className="direction-engagement-passage">
      <h3>{t('home.engagement.idea.title')}</h3>
      <div className="direction-engagement-answer"><Sentences copyKey="home.engagement.idea.description"/><a className="direction-text-link" href={`mailto:${t('contact.email')}?subject=${encodeURIComponent(t('home.engagement.idea.subject'))}`}>{t('home.engagement.idea.cta')}<ArrowUpRight size={18}/></a></div>
    </article>
    <article id="brand" className="direction-engagement-passage">
      <h3>{t('home.engagement.brand.title')}</h3>
      <p className="direction-brand-response">{t('home.engagement.brand.description')}</p>
      <ol className="direction-brand-options"><li><Sentences copyKey="home.engagement.assets.description"/></li><li><Sentences copyKey="home.engagement.world.description"/></li></ol>
      <a className="direction-text-link" href={`mailto:${t('contact.email')}?subject=${encodeURIComponent(t('home.engagement.brand.subject'))}`}>{t('home.engagement.brand.cta')}<ArrowUpRight size={18}/></a>
    </article>
  </section>;
}

function Capabilities() {
  return <div className="direction-capabilities" data-direction-chapter="production"><ProductionServices/></div>;
}

function Work() {
  return <section id="work" className="direction-work direction-section" data-direction-chapter="work" aria-labelledby="direction-work-title"><div className="direction-label mono"><span>04</span><span>{t('home.work.title')}</span></div><Depth amount={26} settle><h2 id="direction-work-title">{t('home.work.title')}</h2></Depth><p>{t('home.work.status')}</p></section>;
}

function SpatialBody({ active }: { active: string }) {
  return <div id="index" className="direction-index-layout">
    <aside className="direction-rail"><p className="mono">Studio index</p><nav aria-label="Chapter navigation"><ChapterLinks spatial active={active}/><a href="#contact"><span className="direction-nav-number mono" aria-hidden="true">05</span><span>Contact</span></a></nav><div className="direction-rail-routes"><a href="#idea">Have an idea?<ArrowUpRight size={13}/></a><a href="#brand">Build your brand<ArrowUpRight size={13}/></a></div></aside>
    <div className="direction-index-content"><Studio direction="spatial"/><Engagement direction="spatial"/><Capabilities/><Work/></div>
  </div>;
}

function PreviewContent({ direction, site }: { direction: Direction; site: boolean }) {
  const active = useChapter();
  const still = useStill();
  return <div className={`home-page direction-preview direction-${direction}${site ? ' spatial-site' : ''}${direction === 'spatial' ? ' spatial-textured' : ''}`} data-direction-still={still}>
    <a className="skip-link" href="#direction-main">{t('accessibility.skip')}</a>
    {!site && <StudyBar direction={direction}/>}<DirectionNav direction={direction} active={active}/>
    {direction === 'spatial' && <CursorEcho/>}
    <main id="direction-main"><Intro direction={direction}/>{direction !== 'spatial' && <Reel direction={direction}/>} {direction === 'spatial' ? <SpatialBody active={active}/> : <><Studio direction={direction}/><Engagement direction={direction}/><Capabilities/><Work/></>}</main>
    <div data-direction-chapter="contact"><SiteContact/></div>
    {!site && <footer className="direction-study-footer"><a href="/directions/"><ArrowLeft size={16}/>Compare all three directions</a><span className="mono">{direction === 'spatial' ? 'Selected direction' : 'Local design study'}</span></footer>}
  </div>;
}

export function DirectionPreview({ direction, site = false }: { direction: Direction; site?: boolean }) {
  return <EchoSystem><MotionConfig reducedMotion="user"><PreviewContent direction={direction} site={site}/></MotionConfig></EchoSystem>;
}
