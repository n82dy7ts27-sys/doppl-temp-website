'use client';

import { useEffect, useRef, useState } from 'react';
import { siteMedia } from '@/lib/site-media';

/** The supplied 1280×720 film keeps its native frame; it is never cropped. */
export function OpeningFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rect = video.getBoundingClientRect();
    let visible = rect.bottom > 0 && rect.top < window.innerHeight;
    let disposed = false;
    let pending = false;
    const canPlay = () => !disposed && visible && !document.hidden && !reduced.matches;
    const sync = () => {
      if (disposed) return;
      video.autoplay = canPlay();
      if (!canPlay()) { video.pause(); return; }
      if (!video.paused || pending) return;
      video.muted = true;
      pending = true;
      void video.play().then(() => {
        if (!disposed && !canPlay()) video.pause();
      }).catch(() => { /* Poster remains until playback is permitted. */ }).finally(() => { pending = false; });
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.01 });
    observer.observe(video);
    video.addEventListener('canplay', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('pointerdown', sync, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      disposed = true;
      observer.disconnect();
      video.pause();
      video.removeEventListener('canplay', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('pointerdown', sync);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  return <div className="opening-film">
    <video ref={videoRef} src={siteMedia.reel.src} poster={siteMedia.reel.poster} width={1280} height={720}
      muted loop playsInline preload="metadata" aria-label="Doppl studio film"
      onError={() => setFailed(true)}/>
    {failed && <p className="opening-film-error">Film unavailable. <a href={siteMedia.reel.src}>Open the video</a></p>}
  </div>;
}
