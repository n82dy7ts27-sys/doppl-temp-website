import { t } from '@/lib/copy';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function Wordmark({ className = '' }: { className?: string }) {
  return <div className={`wordmark ${className}`}><img src="/doppl-wordmark.svg" width="1778" height="239" alt={t('brand.wordmarkAlt')} draggable="false" /></div>;
}

export function TalkLink({ children = t('contact.talk'), className = '' }: { children?: React.ReactNode; className?: string }) {
  return <a href={`mailto:${t('contact.email')}`} className={`talk-link ${className}`}><span>{children}</span><span className="talk-arrow"><ArrowUpRight size={19} strokeWidth={1.4} aria-hidden="true" /></span></a>;
}

export function Header({ inner = false }: { inner?: boolean }) {
  return <header className={`header ${inner ? 'header-inner' : ''}`}>
    <Link href="/#top" className="header-symbol" aria-label={t('navigation.homeAria')}><span aria-hidden="true"/></Link>
    <nav aria-label={t('navigation.aria')}><a href="/#studio">{t('navigation.studio')}</a><a href="/#how-we-work">{t('navigation.how')}</a><a href="/#production">{t('navigation.production')}</a><a href="/#work">{t('navigation.work')}</a><a href="/#contact">{t('navigation.contact')}</a></nav>
  </header>;
}

export function SectionLabel({ number, children, aside }: { number: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return <div className="section-label"><span className="section-name">{children}</span><span className="section-label-aside">{aside}</span><span>{number}</span></div>;
}
