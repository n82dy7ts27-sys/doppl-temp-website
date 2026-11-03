'use client';

import { useContext, useEffect, useRef, type CSSProperties } from 'react';
import { AlignmentContext } from './interference-context';
import { HeroMascot } from './hero-mascot';
import { t } from '@/lib/copy';

const echoes = [
  { slot: -3, pose: '14', colour: 'var(--echo-outer)', opacity: .46, size: .76 },
  { slot: -2, pose: '04', colour: 'var(--echo-middle)', opacity: .65, size: .82 },
  { slot: -1, pose: '00', colour: 'var(--echo-inner)', opacity: .76, size: .9 },
  { slot: 1, pose: '00', colour: 'var(--echo-inner)', opacity: .76, size: .9 },
  { slot: 2, pose: '08', colour: 'var(--echo-middle)', opacity: .65, size: .82 },
  { slot: 3, pose: '14', colour: 'var(--echo-outer)', opacity: .46, size: .76 },
];

/** Exact sampled silhouettes; the original mascot remains the only decoder. */
export function MascotEcho() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { paused } = useContext(AlignmentContext);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => { pausedRef.current = paused; syncRef.current(); }, [paused]);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let rect = host.getBoundingClientRect();
    let pageTop = rect.top + window.scrollY;
    let visible = rect.bottom > 0 && rect.top < window.innerHeight;
    let hovering = false;
    let raf = 0;
    let last = 0;
    let disposed = false;
    const value = { x: 0, y: 0, open: 0 };
    const target = { x: 0, y: 0, open: 0 };
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const active = () => !disposed && !pausedRef.current && !reduced.matches && visible && !document.hidden;
    const paint = () => {
      host.style.setProperty('--echo-x', value.x.toFixed(4));
      host.style.setProperty('--echo-y', value.y.toFixed(4));
      host.style.setProperty('--echo-open', value.open.toFixed(4));
    };
    const frame = (now: number) => {
      raf = 0;
      if (!active()) { last = 0; return; }
      const easing = 1 - Math.exp(-Math.min(last ? now - last : 16.7, 50) / 170);
      last = now;
      value.x += (target.x - value.x) * easing;
      value.y += (target.y - value.y) * easing;
      value.open += (target.open - value.open) * easing;
      paint();
      if (Math.hypot(target.x - value.x, target.y - value.y, target.open - value.open) > .001) request();
      else last = 0;
    };
    function request() { if (active() && !raf) raf = requestAnimationFrame(frame); }
    const scroll = () => {
      if (!active()) return;
      target.open = Math.min(.32, Math.max(0, window.scrollY / window.innerHeight) * .4) + (hovering ? .65 : 0);
      request();
    };
    const move = (event: PointerEvent) => {
      if (!active() || event.pointerType === 'touch') return;
      hovering = true;
      target.x = clamp((event.clientX - rect.left) / rect.width * 2 - 1);
      target.y = clamp((event.clientY - pageTop + window.scrollY) / rect.height * 2 - 1);
      scroll();
    };
    const leave = () => {
      hovering = false;
      if (!active()) return;
      target.x = target.y = 0;
      scroll();
    };
    const key = (event: KeyboardEvent) => {
      if (!active() || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') { target.x = target.y = target.open = 0; }
      else {
        if (event.key === 'ArrowLeft') target.x = clamp(target.x - .3);
        if (event.key === 'ArrowRight') target.x = clamp(target.x + .3);
        if (event.key === 'ArrowUp') target.y = clamp(target.y - .3);
        if (event.key === 'ArrowDown') target.y = clamp(target.y + .3);
        target.open = .65;
      }
      request();
    };
    const measure = () => {
      rect = host.getBoundingClientRect();
      pageTop = rect.top + window.scrollY;
    };
    const sync = () => {
      if (!active()) { cancelAnimationFrame(raf); raf = last = 0; return; }
      if (!hovering) target.x = target.y = 0;
      scroll();
    };
    const preference = () => {
      if (reduced.matches) {
        target.x = target.y = target.open = value.x = value.y = value.open = 0;
        paint();
      }
      sync();
    };
    syncRef.current = sync;
    const resize = new ResizeObserver(measure);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) hovering = false;
      sync();
    });
    resize.observe(host);
    intersection.observe(host);
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    host.addEventListener('blur', leave);
    host.addEventListener('keydown', key);
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', preference);
    return () => {
      disposed = true;
      syncRef.current = () => {};
      cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('blur', leave);
      host.removeEventListener('keydown', key);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', preference);
    };
  }, []);

  return <div ref={hostRef} className="opening-mascot mascot-echo" tabIndex={0} role="img" aria-label={t('home.echo.label')}>
    <div className="mascot-echo-family" aria-hidden="true">
      {echoes.map(({ slot, pose, colour, opacity, size }) => <span key={slot}
        className={`mascot-echo-pose mascot-echo-pose--${Math.abs(slot)}`}
        style={{ '--slot': slot, '--drift': `${Math.abs(slot) * 9}px`, '--spread': `${slot * 14}px`, '--pose-size': size,
          '--pose-angle': `${slot * 1.8}deg`, '--pose-y': `${Math.abs(slot) * 5}px`, '--pose-colour': colour,
          '--pose-opacity': opacity, '--pose-image': `url('/mascot/echo/outline-${pose}.png')`,
        } as CSSProperties}/>) }
    </div>
    <HeroMascot/>
  </div>;
}
