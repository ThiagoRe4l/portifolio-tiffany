import { z } from 'zod';
import { getFieldMeta } from '@/content/fields';

/**
 * Gera um valor mínimo e válido para qualquer schema de conteúdo, a partir dos
 * metadados de cada campo. Listas recebem o número mínimo de itens.
 */
export function sampleValue(schema: z.ZodType): unknown {
  const meta = getFieldMeta(schema);

  switch (meta?.kind) {
    case 'text':
    case 'longText':
      return 'x';
    case 'number':
      return 1;
    case 'phone':
      return '5511999998888';
    case 'email':
      return 'a@b.co';
    case 'instagram':
      return 'a';
    case 'mapUrl':
      return 'https://www.google.com/maps/embed?pb=1';
    case 'icon':
      return 'clipboard';
    case 'toggle':
      return true;
    case 'photo':
      return { src: '', width: 1, height: 1, alt: 'x' };
    default:
      break;
  }

  if (schema instanceof z.ZodArray) {
    const element = schema.element as z.ZodType;
    return Array.from({ length: meta?.min ?? 1 }, () => sampleValue(element));
  }
  if (schema instanceof z.ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, child]) => [
        key,
        sampleValue(child),
      ]),
    );
  }
  throw new Error('sampleValue: schema sem metadados reconhecidos');
}

/** Troca o valor num caminho no formato do walkSchema (`a.b[].c` usa o primeiro item). */
export function setAtPath(target: unknown, path: string, value: unknown): void {
  const segments = path.replace(/\[\]/g, '.0').split('.');
  let node = target as Record<string, unknown>;
  for (const segment of segments.slice(0, -1)) {
    node = node[segment] as Record<string, unknown>;
  }
  node[segments[segments.length - 1] as string] = value;
}
