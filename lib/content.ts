import { t } from '@/lib/copy';
import type { OpticalMode } from '@/components/optical-field';
export const capabilities = [
  { title:t('capabilities.film.title'), short:t('capabilities.film.short'), description:t('capabilities.film.description'), scopes:[t('capabilities.film.scopes.1'),t('capabilities.film.scopes.2'),t('capabilities.film.scopes.3'),t('capabilities.film.scopes.4'),t('capabilities.film.scopes.5'),t('capabilities.film.scopes.6')], note:t('capabilities.film.note') },
  { title:t('capabilities.imagery.title'), short:t('capabilities.imagery.short'), description:t('capabilities.imagery.description'), scopes:[t('capabilities.imagery.scopes.1'),t('capabilities.imagery.scopes.2'),t('capabilities.imagery.scopes.3'),t('capabilities.imagery.scopes.4'),t('capabilities.imagery.scopes.5'),t('capabilities.imagery.scopes.6')], note:t('capabilities.imagery.note') },
  { title:t('capabilities.worlds.title'), short:t('capabilities.worlds.short'), description:t('capabilities.worlds.description'), scopes:[t('capabilities.worlds.scopes.1'),t('capabilities.worlds.scopes.2'),t('capabilities.worlds.scopes.3'),t('capabilities.worlds.scopes.4'),t('capabilities.worlds.scopes.5'),t('capabilities.worlds.scopes.6')], note:t('capabilities.worlds.note') },
  { title:t('capabilities.development.title'), short:t('capabilities.development.short'), description:t('capabilities.development.description'), scopes:[t('capabilities.development.scopes.1'),t('capabilities.development.scopes.2'),t('capabilities.development.scopes.3'),t('capabilities.development.scopes.4'),t('capabilities.development.scopes.5'),t('capabilities.development.scopes.6')], note:t('capabilities.development.note') },
  { title:t('capabilities.finishing.title'), short:t('capabilities.finishing.short'), description:t('capabilities.finishing.description'), scopes:[t('capabilities.finishing.scopes.1'),t('capabilities.finishing.scopes.2'),t('capabilities.finishing.scopes.3'),t('capabilities.finishing.scopes.4'),t('capabilities.finishing.scopes.5'),t('capabilities.finishing.scopes.6')], note:t('capabilities.finishing.note') },
];
export const stages = [
  { name:t('approach.define.name'), title:t('approach.define.title'), description:t('approach.define.description'), output:t('approach.define.output') },
  { name:t('approach.prove.name'), title:t('approach.prove.title'), description:t('approach.prove.description'), output:t('approach.prove.output') },
  { name:t('approach.build.name'), title:t('approach.build.title'), description:t('approach.build.description'), output:t('approach.build.output') },
  { name:t('approach.review.name'), title:t('approach.review.title'), description:t('approach.review.description'), output:t('approach.review.output') },
  { name:t('approach.finish.name'), title:t('approach.finish.title'), description:t('approach.finish.description'), output:t('approach.finish.output') },
  { name:t('approach.extend.name'), title:t('approach.extend.title'), description:t('approach.extend.description'), output:t('approach.extend.output') },
];
export type Study = { slug:string; number:string; title:string; mode:OpticalMode; category:string; summary:string; intent:string; decisions:{title:string;body:string}[] };
export const studies: Study[] = [
  { slug:'phase',number:'01',title:t('work.phase.title'),mode:'slices',category:t('work.phase.category'),summary:t('work.phase.summary'),intent:t('work.phase.intent'),decisions:[{title:t('work.phase.decision.1.title'),body:t('work.phase.decision.1.body')},{title:t('work.phase.decision.2.title'),body:t('work.phase.decision.2.body')},{title:t('work.phase.decision.3.title'),body:t('work.phase.decision.3.body')}] },
  { slug:'overlap',number:'02',title:t('work.overlap.title'),mode:'overlap',category:t('work.overlap.category'),summary:t('work.overlap.summary'),intent:t('work.overlap.intent'),decisions:[{title:t('work.overlap.decision.1.title'),body:t('work.overlap.decision.1.body')},{title:t('work.overlap.decision.2.title'),body:t('work.overlap.decision.2.body')},{title:t('work.overlap.decision.3.title'),body:t('work.overlap.decision.3.body')}] },
  { slug:'frequency',number:'03',title:t('work.frequency.title'),mode:'folds',category:t('work.frequency.category'),summary:t('work.frequency.summary'),intent:t('work.frequency.intent'),decisions:[{title:t('work.frequency.decision.1.title'),body:t('work.frequency.decision.1.body')},{title:t('work.frequency.decision.2.title'),body:t('work.frequency.decision.2.body')},{title:t('work.frequency.decision.3.title'),body:t('work.frequency.decision.3.body')}] },
] as const;
