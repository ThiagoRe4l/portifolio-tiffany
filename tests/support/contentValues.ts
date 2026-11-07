import { z } from 'zod';
import { getFieldMeta, type FieldKind } from '@/content/fields';
import { siteContentSchema } from '@/content/schema';

export type Leaf = { path: string; kind: FieldKind | undefined; value: unknown };

/**
 * Percorre schema e valor juntos e devolve cada valor final com o caminho concreto
 * (`trabalho.cards.1.title`) e o tipo de campo. Entra nas fotos (src, alt, dimensões).
 */
export function contentLeaves(content: unknown, schema: z.ZodType = siteContentSchema): Leaf[] {
  const leaves: Leaf[] = [];

  const visit = (node: z.ZodType, value: unknown, path: string) => {
    if (node instanceof z.ZodObject) {
      const record = value as Record<string, unknown>;
      for (const [key, child] of Object.entries(node.shape as Record<string, z.ZodType>)) {
        visit(child, record[key], path ? `${path}.${key}` : key);
      }
    } else if (node instanceof z.ZodArray) {
      (value as unknown[]).forEach((item, index) => {
        visit(node.element as z.ZodType, item, `${path}.${index}`);
      });
    } else {
      leaves.push({ path, kind: getFieldMeta(node)?.kind, value });
    }
  };

  visit(schema, content, '');
  return leaves;
}

/**
 * Só os textos que a pessoa lê (texto, texto longo e texto alternativo).
 * O endereço da foto (`.src`) fica de fora: é preenchido pelo upload, não é texto.
 */
export function textLeaves(content: unknown): Leaf[] {
  return contentLeaves(content).filter(
    (leaf) => (leaf.kind === 'text' || leaf.kind === 'longText') && !leaf.path.endsWith('.src'),
  );
}
