import type { z } from 'zod';
import { PLACEHOLDER_INITIALS, PLACEHOLDER_WHATSAPP } from './defaults';

/**
 * Mensagens de validação legíveis: `seção › campo › #posição › campo: problema`.
 * Posições em listas começam em 1, como a psicóloga as vê no admin.
 */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path
      .map((segment) => (typeof segment === 'number' ? `#${segment + 1}` : String(segment)))
      .join(' › ');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Completa o que veio do banco com o padrão (RF-10): campo ausente em objeto
 * recebe o valor padrão, recursivamente. **Listas não são mescladas**: vale a do
 * banco inteira. Por isso, campo novo dentro de item de lista precisa ser opcional
 * ou ter `.default()` no schema. Não altera as entradas.
 */
export function mergeWithDefaults<T>(defaults: T, data: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(data)) return data as T;
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(data)) {
    merged[key] = key in defaults ? mergeWithDefaults(defaults[key], value) : value;
  }
  return merged as T;
}

function mapStrings(value: unknown, map: (text: string) => string): unknown {
  if (typeof value === 'string') return map(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, mapStrings(child, map)]),
    );
  }
  return value;
}

/** Troca `{ano}` pelo ano do build em todos os textos. Devolve uma cópia. */
export function resolveYear<T>(content: T, year: number): T {
  return mapStrings(content, (text) => text.replaceAll('{ano}', String(year))) as T;
}

const BRACKETED = /\[[^[\]]+\]/;

/** Placeholders que não podem ser `[...]` porque o campo tem formato próprio. */
const DECLARED_PLACEHOLDERS: Record<string, string> = {
  'geral.initials': PLACEHOLDER_INITIALS,
  'contato.whatsapp.number': PLACEHOLDER_WHATSAPP,
};

/** Caminhos (`sobre.education.0`) que ainda têm placeholder. */
export function findPlaceholders(content: unknown): string[] {
  const found: string[] = [];
  const visit = (value: unknown, path: string) => {
    if (typeof value === 'string') {
      if (BRACKETED.test(value) || DECLARED_PLACEHOLDERS[path] === value) found.push(path);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
    } else if (isPlainObject(value)) {
      for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(content, '');
  return found;
}
