'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { t } from '@/lib/copy';

export function SiteContact() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copyEmail() {
    try { await navigator.clipboard.writeText(t('contact.email')); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }
  return <footer id="contact" className="site-contact" data-field="contact" aria-labelledby="contact-title">
    <div className="site-contact-heading"><h2 id="contact-title">{t('home.contact.title')}</h2><p>{t('home.contact.description')}</p></div>
    <div className="site-contact-actions">
      <a className="site-contact-email" href={`mailto:${t('contact.email')}`}>{t('contact.email')}<ArrowUpRight strokeWidth={1} aria-hidden="true"/></a>
      <button type="button" className="site-copy-email mono" onClick={copyEmail}>{copyState === 'copied' ? <Check size={15} aria-hidden="true"/> : <Copy size={15} aria-hidden="true"/>}<span aria-live="polite">{t(copyState === 'copied' ? 'contact.copied' : copyState === 'failed' ? 'contact.copyFailed' : 'contact.copy')}</span></button>
    </div>
    <div className="site-contact-bottom mono"><span>{t('footer.copyright', { year: new Date().getFullYear() })}</span><a href="#top">{t('footer.top')}</a></div>
  </footer>;
}
