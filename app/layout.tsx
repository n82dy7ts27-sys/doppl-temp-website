import { t } from '@/lib/copy';
import type { Metadata } from 'next';
import '@fontsource-variable/dm-sans';
import '@fontsource/ibm-plex-mono/400.css';
import './globals.css';
import '@/styles/interference-diagrams.css';
import '@/styles/interference-system.css';
import '@/styles/discovery-scenes.css';
import '@/styles/home-page.css';
import '@/styles/mascot-echo.css';
import '@/styles/mascot-diagram.css';
import '@/styles/production-services.css';
import '@/styles/directions.css';
import '@/styles/spatial-site.css';

export const metadata: Metadata = {
  title: { default: t('metadata.title'), template: t('metadata.titleTemplate') },
  description: t('metadata.description'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
