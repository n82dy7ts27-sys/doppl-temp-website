'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { t } from '@/lib/copy';
import { AlignmentContext } from './interference-context';
import { createOpticalRenderer, opticalCompositions, type OpticalRenderer } from './approved-optics';

export type OpticalMode = 'folds' | 'slices' | 'overlap';

export function OpticalField({ mode = 'folds', className = '', still = false, parallax = !still, zoom = 1, immersive = false }: {
  mode?: OpticalMode;
  className?: string;
  still?: boolean;
  parallax?: boolean;
  zoom?: number;
  immersive?: boolean;
}) {
  const { paused: pagePaused } = useContext(AlignmentContext);
  const pagePauseRef = useRef(pagePaused);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  useEffect(() => { pagePauseRef.current = pagePaused; wake.current(); }, [pagePaused]);

  useEffect(() => {
    const surface = canvas.current;
    const container = host.current;
    if (!surface || !container) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const config = { ...opticalCompositions[mode], zoom: opticalCompositions[mode].zoom * zoom };
    const track = container.closest<HTMLElement>('.discovery-scene-track');
    const pinned = !!container.closest('.discovery-scene--wide');
    // Foreground editorial copy shares its field's pointer interaction.
    const interactionSurface = container.closest<HTMLElement>('.discovery-scene-stage') || container;
    let renderer: OpticalRenderer | undefined;
    let loading = false;
    let reduce = media.matches;
    let disposed = false;
    let visible = false;
    let raf = 0;
    let last = 0;
    let scrollDirty = true;
    let phase = 0;
    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };
    const clamp = (value: number) => Math.max(0, Math.min(1, value));

    function request() {
      if (!still && !disposed && renderer && visible && !document.hidden && !pagePauseRef.current && !raf) raf = requestAnimationFrame(frame);
    }
    function measureScroll() {
      scrollDirty = false;
      if (pagePauseRef.current) return;
      if (still || reduce || !parallax) { phase = 0; return; }
      const rect = (track || container!).getBoundingClientRect();
      phase = pinned
        ? clamp(-rect.top / Math.max(1, rect.height - container!.offsetHeight)) * .84
        : clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height)) * .16;
    }
    function frame(now: number) {
      raf = 0;
      if (disposed || !renderer || !visible || document.hidden || pagePauseRef.current) return;
      if (scrollDirty) measureScroll();
      const elapsed = last ? Math.min(now - last, 50) : 16.7;
      last = now;
      const easing = 1 - Math.exp(-elapsed / 85);
      if (reduce) pointer.x = pointer.y = 0;
      else {
        pointer.x += (pointerTarget.x - pointer.x) * easing;
        pointer.y += (pointerTarget.y - pointer.y) * easing;
      }
      renderer.draw(reduce ? 0 : phase, pointer.x, pointer.y);
      if (!reduce && Math.hypot(pointerTarget.x - pointer.x, pointerTarget.y - pointer.y) > .0005) request();
      else last = 0;
    }
    function resize() {
      scrollDirty = true;
      if (!visible || !renderer) return;
      const rect = container!.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
      measureScroll();
      renderer.draw(reduce ? 0 : phase, reduce ? 0 : pointer.x, reduce ? 0 : pointer.y);
      // Still cards get the same 2x alpha product, but retain only their result.
      // Their source rasters and all rendering work stop immediately after paint.
      if (still) renderer.releasePlates();
      request();
    }
    function ensureRenderer() {
      if (loading || renderer || !visible || disposed || document.hidden) return;
      loading = true;
      createOpticalRenderer(surface!, config, immersive ? 6_000_000 : 4_000_000).then(next => {
        loading = false;
        if (disposed || !visible || document.hidden) { next.dispose(); return; }
        renderer = next;
        resize();
        setReady(true);
      }).catch(() => { loading = false; });
    }
    function suspend() {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      renderer?.dispose();
      renderer = undefined;
      setReady(false);
    }
    function scroll() {
      if (!visible || reduce || pagePauseRef.current) return;
      scrollDirty = true;
      request();
    }
    function move(event: PointerEvent) {
      if (reduce || pagePauseRef.current || event.pointerType === 'touch') return;
      const rect = container!.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - rect.left) / rect.width - .5) * 1.7;
      pointerTarget.y = ((event.clientY - rect.top) / rect.height - .5) * 1.2;
      request();
    }
    function leave() {
      if (pagePauseRef.current) return;
      pointerTarget.x = pointerTarget.y = 0;
      request();
    }
    function key(event: KeyboardEvent) {
      if (reduce || pagePauseRef.current) return;
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-.14, 0], ArrowRight: [.14, 0], ArrowUp: [0, -.14], ArrowDown: [0, .14],
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      pointerTarget.x = Math.max(-.85, Math.min(.85, pointerTarget.x + direction[0]));
      pointerTarget.y = Math.max(-.6, Math.min(.6, pointerTarget.y + direction[1]));
      request();
    }
    function preference(event: MediaQueryListEvent) {
      reduce = event.matches;
      pointer.x = pointer.y = pointerTarget.x = pointerTarget.y = 0;
      phase = 0;
      resize();
    }
    function visibility() {
      if (document.hidden) suspend();
      else { scrollDirty = true; ensureRenderer(); }
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    if (track) resizeObserver.observe(track);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { scrollDirty = true; ensureRenderer(); }
      else suspend();
    });
    observer.observe(container);
    if (!still) {
      interactionSurface.addEventListener('pointermove', move, { passive: true });
      interactionSurface.addEventListener('pointerleave', leave);
      container.addEventListener('blur', leave);
      container.addEventListener('keydown', key);
    }
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    if (parallax && !still) window.addEventListener('scroll', scroll, { passive: true });
    wake.current = () => {
      last = 0;
      if (pagePauseRef.current) { cancelAnimationFrame(raf); raf = 0; }
      else { scrollDirty = true; ensureRenderer(); request(); }
    };
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer?.dispose();
      observer.disconnect();
      resizeObserver.disconnect();
      interactionSurface.removeEventListener('pointermove', move);
      interactionSurface.removeEventListener('pointerleave', leave);
      container.removeEventListener('blur', leave);
      container.removeEventListener('keydown', key);
      media.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scroll);
      wake.current = () => {};
    };
  }, [mode, still, parallax, zoom, immersive]);

  const description = `${t(`optical.${mode}.description`)} ${t(still ? 'optical.stillHint' : 'optical.interactiveHint')}`;
  return <div ref={host} className={`optical-field optical-${mode} ${immersive ? 'is-immersive' : ''} ${still ? 'is-still' : ''} ${ready ? 'is-ready' : ''} ${className}`}
    role="img" aria-label={description} tabIndex={still ? undefined : 0}>
    <div className="optical-fallback" aria-hidden="true"/>
    <canvas ref={canvas} className={ready ? 'is-ready' : ''} aria-hidden="true"/>
  </div>;
}
