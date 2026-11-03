'use client';

import { useContext, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { AlignmentContext } from './interference-context';

/** 21st Cursor Trail inspired the spring pairing; two pointer echoes, no particles. */
export function CursorEcho() {
  const host = useRef<HTMLDivElement>(null);
  const { paused } = useContext(AlignmentContext);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const nearX = useSpring(x, { stiffness: 650, damping: 38, mass: 0.28 });
  const nearY = useSpring(y, { stiffness: 650, damping: 38, mass: 0.28 });
  const farX = useSpring(x, { stiffness: 420, damping: 36, mass: 0.45 });
  const farY = useSpring(y, { stiffness: 420, damping: 36, mass: 0.45 });

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let timer: ReturnType<typeof setTimeout>;
    let primed = false;
    const hide = () => { node.dataset.active = 'false'; clearTimeout(timer); primed = false; };
    const move = (event: PointerEvent) => {
      if (paused || !enabled.matches || event.pointerType !== 'mouse' || event.buttons || document.hidden) { hide(); return; }
      x.set(event.clientX + 3); y.set(event.clientY + 4);
      if (!primed) {
        nearX.jump(event.clientX + 3); nearY.jump(event.clientY + 4);
        farX.jump(event.clientX + 5); farY.jump(event.clientY + 6);
        primed = true;
      }
      node.dataset.active = 'true';
      clearTimeout(timer);
      timer = setTimeout(hide, 110);
    };
    hide();
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', hide, { passive: true });
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('blur', hide);
    window.addEventListener('keydown', hide);
    document.addEventListener('pointerleave', hide);
    document.addEventListener('visibilitychange', hide);
    enabled.addEventListener('change', hide);
    return () => {
      hide();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', hide);
      window.removeEventListener('scroll', hide);
      window.removeEventListener('blur', hide);
      window.removeEventListener('keydown', hide);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('visibilitychange', hide);
      enabled.removeEventListener('change', hide);
    };
  }, [paused, x, y, nearX, nearY, farX, farY]);

  const pointer = <svg viewBox="0 0 18 24" fill="currentColor"><path d="M1 1v18l4.7-4.5L9.2 23l3.2-1.4-3.5-8.1 6.6-.2L1 1Z"/></svg>;
  return <div ref={host} className="cursor-echo" aria-hidden="true" data-active="false">
    <motion.span style={{ x: nearX, y: nearY }}>{pointer}</motion.span>
    <motion.span style={{ x: farX, y: farY }}>{pointer}</motion.span>
  </div>;
}
