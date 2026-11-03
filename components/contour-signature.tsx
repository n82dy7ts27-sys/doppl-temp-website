'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { AlignmentContext } from './interference-context';
import { drawContour, type ContourInput } from '@/lib/contour';
import seed from '@/lib/contour-seed.json';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Decorative identity: a quiet response within its own space, with no idle loop. */
export function ContourSignature() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { paused } = useContext(AlignmentContext);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const element = host.current;
    const surface = canvas.current;
    const context = surface?.getContext('2d');
    if (!element || !surface || !context || typeof Path2D === 'undefined') return;

    const path = new Path2D(seed.path);
    const still = matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 700px)');
    const current: ContourInput = { x: 0, y: 0, scroll: 0 };
    const target: ContourInput = { x: 0, y: 0, scroll: 0 };
    let width = 0, height = 0, dpr = 1, frame = 0, last = 0;
    let visible = false, disposed = false, painted = false;
    let bounds = element.getBoundingClientRect();
    let pageTop = bounds.top + window.scrollY;

    const draw = () => {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      drawContour(context, path, width, height, current);
      if (!painted) { painted = true; setReady(true); }
    };
    const active = () => !disposed && visible && !still.matches && !pausedRef.current && !document.hidden;
    const stop = () => { cancelAnimationFrame(frame); frame = last = 0; };
    const tick = (time: number) => {
      frame = 0;
      if (!active()) return;
      const ease = 1-Math.exp(-Math.min(last ? time-last : 16.7, 50)/190);
      last = time;
      for (const key of ['x', 'y', 'scroll'] as const) current[key] += (target[key]-current[key])*ease;
      draw();
      if (Math.hypot(target.x-current.x, target.y-current.y, target.scroll-current.scroll) > .0008) request();
      else last = 0;
    };
    function request() { if (active() && !frame) frame = requestAnimationFrame(tick); }
    const measure = () => {
      bounds = element.getBoundingClientRect();
      pageTop = bounds.top + window.scrollY;
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(devicePixelRatio || 1, 1.6);
      surface.width = Math.round(width*dpr);
      surface.height = Math.round(height*dpr);
      draw();
    };
    const move = (event: PointerEvent) => {
      if (!active() || event.pointerType === 'touch') return;
      target.x = clamp((event.clientX-bounds.left)/width*2-1)*.25;
      target.y = clamp((event.clientY-pageTop+window.scrollY)/height*2-1)*.25;
      request();
    };
    const leave = () => { target.x = target.y = 0; request(); };
    const sync = () => {
      stop();
      if (still.matches) {
        current.x = current.y = current.scroll = target.x = target.y = target.scroll = 0;
        draw();
      } else request();
    };

    syncRef.current = sync;
    const resize = new ResizeObserver(measure);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { measure(); request(); } else stop();
    }, { rootMargin: '80px 0px' });
    measure();
    resize.observe(element);
    observer.observe(element);
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', leave);
    window.addEventListener('pageshow', measure);
    document.addEventListener('visibilitychange', sync);
    still.addEventListener('change', sync);
    return () => {
      disposed = true;
      stop();
      syncRef.current = () => {};
      resize.disconnect();
      observer.disconnect();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', leave);
      window.removeEventListener('pageshow', measure);
      document.removeEventListener('visibilitychange', sync);
      still.removeEventListener('change', sync);
    };
  }, []);

  return <div ref={host} className={`contour-signature${ready ? ' is-ready' : ''}`} aria-hidden="true">
    <picture><source media="(max-width: 700px)" srcSet="/brand/contour-mobile.svg"/><img src="/brand/contour.svg" alt="" loading="lazy"/></picture>
    <canvas ref={canvas}/>
  </div>;
}
