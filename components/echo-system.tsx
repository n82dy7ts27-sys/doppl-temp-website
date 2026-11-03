'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlignmentContext } from './interference-context';
import { t } from '@/lib/copy';

/** Shared motion control without loading the retired full-page optical field. */
export function EchoSystem({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape' && !event.repeat) setPaused(value => !value);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return <AlignmentContext.Provider value={{ paused }}>
    <div className="doppl-system echo-system" data-motion={paused ? 'paused' : 'playing'}>
      <p className="sr-only">{t('home.echo.instructions')}</p>
      {children}
    </div>
  </AlignmentContext.Provider>;
}
