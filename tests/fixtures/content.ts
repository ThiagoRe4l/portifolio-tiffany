import { z } from 'zod';
import { defaultContent } from '@/content/defaults';
import { getFieldMeta } from '@/content/fields';
import { siteContentSchema } from '@/content/schema';
import type { SiteContent } from '@/content/types';

/**
 * Conteúdo de teste (spec 001, RF-14): cada texto é único e marcado com «…»
 * (`«inicio.title»`, ou `«#n»` quando o caminho passa do limite do campo).
 * Base do teste obrigatório "sem texto fixo no site" (spec 002).
 */

/** Valores dos campos com formato próprio: válidos e diferentes do padrão. */
const FORMATTED: Record<string, unknown> = {
  'geral.initials': 'QZ',
  'contato.whatsapp.number': '5511987654321',
  'contato.phone.number': '5511912345678',
  'contato.email.address': 'contato@exemplo-teste.com.br',
  'contato.instagram.handle': 'perfil.de.teste',
  'contato.map.embedUrl': 'https://www.google.com/maps/embed?pb=fixture',
};

const FIXTURE_ICONS = ['chat', 'heart', 'star', 'calendar', 'book', 'sprout', 'hand', 'target'];

export function makeUniqueContent(): SiteContent {
  let counter = 0;
  let iconIndex = 0;

  const build = (schema: z.ZodType, value: unknown, path: string): unknown => {
    if (path in FORMATTED) return FORMATTED[path];
    const meta = getFieldMeta(schema);

    if (schema instanceof z.ZodObject) {
      const record = value as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, child]) => {
          const childPath = path ? `${path}.${key}` : key;
          return [key, build(child, record[key], childPath)];
        }),
      );
    }
    if (schema instanceof z.ZodArray) {
      return (value as unknown[]).map((item, index) =>
        build(schema.element as z.ZodType, item, `${path}.${index}`),
      );
    }
    if (path.endsWith('.src')) {
      return `https://imagens.exemplo-teste.com.br/${path}.webp`;
    }

    switch (meta?.kind) {
      case 'text':
      case 'longText': {
        const marked = path === 'geral.copyright' ? `«${path} {ano}»` : `«${path}»`;
        counter += 1;
        return meta.max !== undefined && marked.length > meta.max ? `«#${counter}»` : marked;
      }
      case 'icon':
        return FIXTURE_ICONS[iconIndex++ % FIXTURE_ICONS.length];
      case 'toggle':
        return !value;
      case 'number':
        return (value as number) + 1;
      default:
        throw new Error(`makeUniqueContent: campo sem valor de teste em ${path}`);
    }
  };

  const content = build(siteContentSchema, defaultContent, '') as SiteContent;
  // Botão flutuante ligado: o site precisa renderizá-lo nos testes.
  content.contato.floatingButton.enabled = true;
  return content;
}
