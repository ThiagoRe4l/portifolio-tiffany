import { z } from 'zod';
import { getFieldMeta, type FieldMeta } from '@/content/fields';

/**
 * Percorre um schema de conteúdo e devolve cada campo com seu caminho.
 * Caminhos: `inicio.badge.title`; item de lista: `trabalho.cards[].title`.
 * Também será usado no teste de cobertura do admin (spec 004).
 */
export type WalkEntry = { path: string; meta: FieldMeta | undefined; schema: z.ZodType };

export function walkSchema(
  schema: z.ZodType,
  options: { prefix?: string; intoPhotos?: boolean } = {},
): WalkEntry[] {
  const { prefix = '', intoPhotos = false } = options;
  const entries: WalkEntry[] = [];

  const visitChildren = (node: z.ZodType, path: string) => {
    const meta = getFieldMeta(node);
    if (node instanceof z.ZodObject) {
      if (meta?.kind === 'photo' && !intoPhotos) return;
      for (const [key, child] of Object.entries(node.shape as Record<string, z.ZodType>)) {
        const childPath = path ? `${path}.${key}` : key;
        entries.push({ path: childPath, meta: getFieldMeta(child), schema: child });
        visitChildren(child, childPath);
      }
    } else if (node instanceof z.ZodArray) {
      const element = node.element as z.ZodType;
      const elementPath = `${path}[]`;
      entries.push({ path: elementPath, meta: getFieldMeta(element), schema: element });
      visitChildren(element, elementPath);
    }
  };

  visitChildren(schema, prefix);
  return entries;
}
