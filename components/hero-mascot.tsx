'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import { AlignmentContext } from './interference-context';

const POSTER = '/mascot/white-form-18s-poster.png';

export function HeroMascot() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const { paused } = useContext(AlignmentContext);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => {});
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const context = canvas?.getContext('2d');
    if (!video || !canvas || !context || !host) return;

    // Paint decoded alpha frames into a persistent surface. A native video layer
    // can disappear when the browser suspends/recomposites it during scrolling,
    // even while readyState and the playback clock both look healthy.
    const frame = document.createElement('canvas');
    frame.width = frame.height = 600;
    const frameContext = frame.getContext('2d');
    const probe = document.createElement('canvas');
    probe.width = probe.height = 16;
    const probeContext = probe.getContext('2d', { willReadFrequently: true });
    if (!frameContext || !probeContext) return;

    // Keep the original alpha export appropriate to this browser.
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const safari = /Safari/.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Android)/.test(ua);
    const source = `/mascot/white-form-18s${ios || safari ? '-safari.mov' : '.webm'}`;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rect = host.getBoundingClientRect();
    let inView = rect.bottom > -150 && rect.top < window.innerHeight + 150;
    let disposed = false;
    let painted = false;
    let pendingPlay: Promise<void> | undefined;
    let frameCallback = 0;
    let paintCallback = 0;
    let interruptedStarts = 0;

    const shouldPlay = () => !disposed && !pausedRef.current && !reducedMotion.matches && inView && !document.hidden;
    const paintFrame = () => {
      if (disposed || !inView || video.readyState < 2 || !video.videoWidth) return;
      try {
        frameContext.clearRect(0, 0, 600, 600);
        frameContext.drawImage(video, 0, 0, 600, 600);
        probeContext.clearRect(0, 0, 16, 16);
        probeContext.drawImage(frame, 0, 0, 16, 16);
        const pixels = probeContext.getImageData(0, 0, 16, 16).data;
        let visiblePixels = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 16) visiblePixels++;
        }
        // Never replace a good frame (or the poster) with an empty alpha plane.
        if (visiblePixels < 3) return;
        context.clearRect(0, 0, 600, 600);
        context.drawImage(frame, 0, 0);
        if (!painted) {
          painted = true;
          setHasFrame(true);
        }
      } catch {
        // Decoding may be interrupted by a seek or browser suspension. Keep the
        // previous visible frame and try again when playback supplies another.
      }
    };
    const stopFrames = () => {
      if (frameCallback) video.cancelVideoFrameCallback(frameCallback);
      cancelAnimationFrame(paintCallback);
      frameCallback = paintCallback = 0;
    };
    const queueFrame = () => {
      if (!shouldPlay() || frameCallback || paintCallback) return;
      const next = () => {
        frameCallback = paintCallback = 0;
        if (!shouldPlay()) return;
        paintFrame();
        queueFrame();
      };
      if (typeof video.requestVideoFrameCallback === 'function') {
        frameCallback = video.requestVideoFrameCallback(next);
      } else {
        paintCallback = requestAnimationFrame(next);
      }
    };
    const revealFrame = () => {
      interruptedStarts = 0;
      paintFrame();
      queueFrame();
    };
    const syncPlayback = () => {
      if (disposed) return;
      const play = shouldPlay();
      video.autoplay = play;
      if (!play) { stopFrames(); video.pause(); return; }
      paintFrame();
      queueFrame();
      if (!video.paused || pendingPlay) return;
      video.muted = true;
      let retryInterruptedStart = false;
      pendingPlay = video.play().catch((error: unknown) => {
        if (disposed) return;
        retryInterruptedStart = error instanceof DOMException
          && error.name === 'AbortError' && interruptedStarts++ < 2;
      }).finally(() => {
        // An old Strict Mode effect must not pause a new effect's playback.
        if (disposed) return;
        pendingPlay = undefined;
        // Visibility or the page pause may have changed while play was pending.
        if (!shouldPlay()) video.pause();
        else if (retryInterruptedStart) syncPlayback();
      });
    };

    syncRef.current = syncPlayback;
    video.muted = true;
    video.addEventListener('playing', revealFrame);
    video.addEventListener('loadeddata', paintFrame);
    video.addEventListener('seeked', paintFrame);
    video.addEventListener('canplay', syncPlayback);
    video.addEventListener('pause', syncPlayback);
    video.addEventListener('error', stopFrames);
    video.addEventListener('emptied', stopFrames);
    if (video.getAttribute('src') !== source) video.src = source;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { rootMargin: '150px 0px' });
    observer.observe(host);
    reducedMotion.addEventListener('change', syncPlayback);
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('pageshow', syncPlayback);
    // Retry after a genuine interaction if a device's autoplay policy blocked it.
    window.addEventListener('pointerdown', syncPlayback, { passive: true });
    window.addEventListener('keydown', syncPlayback);
    syncPlayback();

    return () => {
      disposed = true;
      syncRef.current = () => {};
      observer.disconnect();
      stopFrames();
      reducedMotion.removeEventListener('change', syncPlayback);
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('pageshow', syncPlayback);
      window.removeEventListener('pointerdown', syncPlayback);
      window.removeEventListener('keydown', syncPlayback);
      video.removeEventListener('playing', revealFrame);
      video.removeEventListener('loadeddata', paintFrame);
      video.removeEventListener('seeked', paintFrame);
      video.removeEventListener('canplay', syncPlayback);
      video.removeEventListener('pause', syncPlayback);
      video.removeEventListener('error', stopFrames);
      video.removeEventListener('emptied', stopFrames);
      video.pause();
    };
  }, []);

  return <div ref={hostRef} className={`hero-mascot${hasFrame ? ' is-playing' : ''}`} aria-hidden="true">
    <img src={POSTER} width={300} height={300} alt="" draggable={false}/>
    <canvas ref={canvasRef} width={600} height={600}/>
    <video ref={videoRef} width={300} height={300} autoPlay loop muted playsInline
      preload="auto" poster={POSTER} controls={false} disablePictureInPicture
      disableRemotePlayback tabIndex={-1}/>
  </div>;
}
