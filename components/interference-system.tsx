'use client';

import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/copy';
import { AlignmentContext } from './interference-context';
import { chapterCompositions, createOpticalRenderer, type OpticalRenderer } from './approved-optics';

export function InterferenceSystem({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const paused = useRef(false);
  const [frozen, setFrozen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = root.current;
    const surface = canvas.current;
    if (!host || !surface) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let reduce = media.matches;
    let renderer: OpticalRenderer | undefined;
    let disposed = false;
    let raf = 0;
    let last = 0;
    let layoutDirty = true;
    let scrollDirty = true;
    let occluded = false;
    let phase = 0;
    let phaseTarget = 0;
    let activeChapter = 'origin';
    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };
    let bounds: { element: HTMLElement; top: number; height: number }[] = [];
    let covers: { top: number; bottom: number }[] = [];
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    function request() {
      if (!disposed && renderer && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    }
    function cacheLayout() {
      layoutDirty = false;
      const y = window.scrollY;
      bounds = Array.from(host!.querySelectorAll<HTMLElement>('[data-field]')).map(element => {
        const rect = element.getBoundingClientRect();
        return { element, top: rect.top + y, height: rect.height };
      });
      covers = Array.from(host!.querySelectorAll<HTMLElement>('.discovery-scene--wide .discovery-scene-track')).flatMap(element => {
        const rect = element.getBoundingClientRect();
        const stage = element.firstElementChild?.getBoundingClientRect();
        return stage && stage.width >= window.innerWidth - 1 && stage.height >= window.innerHeight - 1
          ? [{ top: rect.top + y, bottom: rect.bottom + y - window.innerHeight }] : [];
      });
    }
    function measureScroll() {
      scrollDirty = false;
      if (layoutDirty) cacheLayout();
      const y = window.scrollY;
      const height = window.innerHeight;
      occluded = covers.some(cover => y >= cover.top && y <= cover.bottom);
      if (paused.current) return;
      let section = bounds[0];
      for (const candidate of bounds) if (candidate.top - y <= height * .46) section = candidate;
      const chapter = section?.element.dataset.field || 'origin';
      const progress = section ? clamp((y - section.top) / Math.max(1, section.height)) : 0;
      // Every chapter has its own geometry. Scroll still changes registration,
      // rather than revealing or painting a separate intersection shape.
      phaseTarget = reduce ? 0 : progress * .1;
      host!.dataset.chapter = chapter;
      if (chapter !== activeChapter && renderer) {
        activeChapter = chapter;
        const composition = chapterCompositions[chapter] || chapterCompositions.origin;
        renderer.setComposition(composition, !reduce).then(changed => {
          if (!changed || disposed) return;
          host!.dataset.opticalSource = composition.source;
          request();
        }).catch(() => { /* Retain the last complete field if an asset fails. */ });
      }
    }
    function frame(now: number) {
      raf = 0;
      if (disposed || !renderer || document.hidden) return;
      if (scrollDirty) measureScroll();
      // The dedicated full-screen field is opaque, so the background can sleep.
      if (occluded || paused.current) { last = 0; return; }
      const elapsed = last ? Math.min(now - last, 50) : 16.7;
      last = now;
      const easing = 1 - Math.exp(-elapsed / 85);
      if (reduce) {
        pointer.x = pointer.y = phase = 0;
      } else {
        pointer.x += (pointerTarget.x - pointer.x) * easing;
        pointer.y += (pointerTarget.y - pointer.y) * easing;
        phase += (phaseTarget - phase) * easing;
      }
      const transitioning = renderer.draw(phase, pointer.x, pointer.y);
      if (transitioning || (!reduce && Math.hypot(pointerTarget.x - pointer.x, pointerTarget.y - pointer.y, phaseTarget - phase) > .0005)) request();
      else last = 0;
    }
    function resize() {
      layoutDirty = scrollDirty = true;
      renderer?.resize(window.innerWidth, window.innerHeight);
      renderer?.draw(reduce ? 0 : phase, reduce ? 0 : pointer.x, reduce ? 0 : pointer.y);
      request();
    }
    function scroll() { scrollDirty = true; request(); }
    function move(event: PointerEvent) {
      if (reduce || paused.current || occluded || event.pointerType === 'touch') return;
      // Local artwork owns pointer input while the pointer is over it.
      if (event.target instanceof Element && event.target.closest('.optical-field')) return;
      pointerTarget.x = (event.clientX / window.innerWidth - .5) * 1.7;
      pointerTarget.y = (event.clientY / window.innerHeight - .5) * 1.2;
      request();
    }
    function leave() {
      if (paused.current) return;
      pointerTarget.x = pointerTarget.y = 0;
      request();
    }
    function key(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.repeat || reduce) return;
      paused.current = !paused.current;
      setFrozen(paused.current);
      last = 0;
      if (paused.current) { cancelAnimationFrame(raf); raf = 0; }
      else scroll();
    }
    function preference(event: MediaQueryListEvent) {
      reduce = event.matches;
      pointer.x = pointer.y = pointerTarget.x = pointerTarget.y = 0;
      if (reduce) { phase = 0; renderer?.finishTransition(); renderer?.draw(0, 0, 0); }
      scroll();
    }
    function visibility() {
      last = 0;
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else scroll();
    }
    const resizeObserver = new ResizeObserver(() => { layoutDirty = scrollDirty = true; request(); });
    resizeObserver.observe(host);
    // Motion reveals stay subordinate to the native reading flow.
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-in-view');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: .12 });
    const reveals = Array.from(host.querySelectorAll<HTMLElement>('.work-card,.value-grid article,.commission-row,.studio-intro,.capabilities-heading,.approach-intro'));
    for (const element of reveals) { element.classList.add('motion-reveal'); revealObserver.observe(element); }
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', preference);
    createOpticalRenderer(surface).then(next => {
      if (disposed) { next.dispose(); return; }
      renderer = next;
      resize();
      setReady(true);
    }).catch(() => { /* The exact approved SVG remains visible as the fallback. */ });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer?.dispose();
      resizeObserver.disconnect();
      revealObserver.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', preference);
      reveals.forEach(element => element.classList.remove('motion-reveal', 'is-in-view'));
    };
  }, []);

  return <AlignmentContext.Provider value={{ paused: frozen }}>
    <div ref={root} className="doppl-system" data-motion={frozen ? 'paused' : 'playing'} data-chapter="origin">
      <p className="sr-only">{t('motion.instructions')}</p>
      <div className={`interference-ground ${ready ? 'is-ready' : ''}`} aria-hidden="true">
        <div className="ground-fallback"/>
        <canvas ref={canvas}/>
      </div>
      <div className="interference-content">{children}</div>
    </div>
  </AlignmentContext.Provider>;
}
