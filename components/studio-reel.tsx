import { t } from '@/lib/copy';
import { siteMedia } from '@/lib/site-media';

/** No playback affordance until the finished reel is supplied. */
export function StudioReel() {
  const { reel } = siteMedia;
  return <section className={`studio-reel ${reel.src ? 'has-reel' : 'is-reserved'}`} data-field="capabilities" aria-label={t('home.reel.title')}>
    {reel.src ? <video controls playsInline preload="metadata" poster={reel.poster || undefined} aria-label={t('home.reel.title')}>
      <source src={reel.src} type="video/mp4"/>
      {reel.captions && <track kind="captions" src={reel.captions} srcLang="en" label="English" default/>}
    </video> : <div className="reel-reserve">
      <div className="reel-reserve-art" aria-hidden="true"/>
      <p>{t('home.reel.title')}<span className="mono">{t('home.reel.status')}</span></p>
    </div>}
  </section>;
}
