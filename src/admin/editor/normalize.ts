import { formatPhoneBR } from '@/lib/phone';
import type { FieldKind } from '@/content/fields';
import type { FieldNode } from './schemaTree';

/**
 * Formatos livres de telefone e Instagram (spec 004, D3; decisão 4 do Gate 1).
 * Ela digita como costuma; o valor gravado segue o formato do schema.
 */

/** Só dígitos, com o 55 do Brasil quando vierem só DDD e número (10 ou 11 dígitos). */
export function normalizePhone(typed: string): string {
  const digits = typed.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/** `5511999998888` → `+55 (11) 99999-8888`. O que não for número válido aparece como está. */
export function displayPhone(stored: string): string {
  if (!stored) return '';
  try {
    return `+55 ${formatPhoneBR(stored)}`;
  } catch {
    return stored;
  }
}

/** `@perfil` ou o link do perfil → `perfil`. */
export function normalizeInstagram(typed: string): string {
  const withoutLink = typed.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '');
  const [handle = ''] = withoutLink.split(/[/?#]/);
  return handle.replace(/^@/, '');
}

/** O navegador apagaria as quebras coladas num campo de uma linha, juntando as palavras. */
export function singleLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ');
}

type Transform = (kind: FieldKind, value: unknown) => unknown;

function mapLeaves<T>(node: FieldNode, value: T, transform: Transform): T {
  if (node.children && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const object = { ...(value as Record<string, unknown>) };
    for (const child of node.children) {
      if (child.key in object) object[child.key] = mapLeaves(child, object[child.key], transform);
    }
    return object as T;
  }
  if (node.item && Array.isArray(value)) {
    const item = node.item;
    return value.map((entry: unknown) => mapLeaves(item, entry, transform)) as T;
  }
  return transform(node.kind, value) as T;
}

/** Antes de validar e gravar. */
export function normalizeSection<T>(tree: FieldNode, value: T): T {
  return mapLeaves(tree, value, (kind, leaf) => {
    if (typeof leaf !== 'string') return leaf;
    if (kind === 'phone') return normalizePhone(leaf);
    if (kind === 'instagram') return normalizeInstagram(leaf);
    return leaf;
  });
}

/** Ao carregar: telefones formatados, como ela os reconhece. */
export function toDisplay<T>(tree: FieldNode, value: T): T {
  return mapLeaves(tree, value, (kind, leaf) =>
    kind === 'phone' && typeof leaf === 'string' ? displayPhone(leaf) : leaf,
  );
}
