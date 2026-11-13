import type { z } from 'zod';
import { findPlaceholders } from '@/content/transform';
import type { SectionKey } from '@/content/types';

/** Caminho como texto, para ligar erros e avisos aos campos: `cards.2.title`. */
export const pathKey = (path: readonly PropertyKey[]): string => path.map(String).join('.');

export type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; errors: Map<string, string> };

/**
 * Valida a seção pelo schema (spec 004, D3). Com sucesso, devolve a saída do parse,
 * que é o que se grava (com os espaços das pontas já removidos). Com erro, a primeira
 * mensagem de cada campo.
 */
export function validateSection<S extends z.ZodType>(
  schema: S,
  value: unknown,
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };

  const errors = new Map<string, string>();
  for (const issue of result.error.issues) {
    const key = pathKey(issue.path);
    if (!errors.has(key)) errors.set(key, issue.message);
  }
  return { ok: false, errors };
}

/** Campos que ainda têm texto provisório (`[...]` ou os provisórios declarados na 001). */
export function placeholderPaths(section: SectionKey, value: unknown): Set<string> {
  const prefix = `${section}.`;
  return new Set(
    findPlaceholders({ [section]: value }).map((path) =>
      path.startsWith(prefix) ? path.slice(prefix.length) : path,
    ),
  );
}
