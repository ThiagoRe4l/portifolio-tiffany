import type { z } from 'zod';
import type { SECTION_KEYS, siteContentSchema } from './schema';

// Só tipos: o site no navegador importa daqui sem levar o Zod para o bundle.

export type SiteContent = z.output<typeof siteContentSchema>;
export type SectionKey = (typeof SECTION_KEYS)[number];
export type Photo = SiteContent['inicio']['photo'];
