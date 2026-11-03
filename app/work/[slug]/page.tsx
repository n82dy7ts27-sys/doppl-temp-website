import { t } from '@/lib/copy';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { studies } from '@/lib/content';
import { Header } from '@/components/identity';
import { SiteContact } from '@/components/site-contact';
import { InterferenceSystem } from '@/components/interference-system';

export function generateStaticParams() { return studies.map(study => ({ slug: study.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = studies.find(item => item.slug === slug);
  return { title: study?.title ?? t('study.metadataFallback'), description: t('home.work.status') };
}

export default async function StudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = studies.find(item => item.slug === slug);
  if (!study) notFound();
  return <InterferenceSystem><div id="top" className="home-page">
    <a className="skip-link" href="#main">{t('accessibility.skip')}</a><Header inner/>
    <main id="main" className="study-page">
      <section className="study-heading" data-field="belief">
        <Link href="/#work" className="back-link mono"><ArrowLeft size={15} aria-hidden="true"/>{t('study.back')}</Link>
        <div className="study-title-row"><h1>{study.title}</h1></div>
        <p>{t('home.work.status')}</p>
      </section>
    </main><SiteContact/>
  </div></InterferenceSystem>;
}
