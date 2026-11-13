import { ICON_IDS } from '@/content/icons';
import type { FieldNode } from './schemaTree';

/**
 * Rascunho da seção (spec 004, D2): leitura e escrita imutáveis por caminho.
 * O que não muda é reaproveitado, então o React só redesenha o que mudou.
 */
export type Path = readonly (string | number)[];
export type ListLimits = { min: number; max: number };

type Container = Record<string | number, unknown>;

export function getAt(value: unknown, path: Path): unknown {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Container)[key];
  }
  return current;
}

export function setAt<T>(value: T, path: Path, next: unknown): T {
  if (path.length === 0) return next as T;
  const [key, ...rest] = path as [string | number, ...(string | number)[]];
  const container = value as unknown as Container;
  const child = setAt(container[key], rest, next);

  if (Array.isArray(container)) {
    const copy = [...container];
    copy[key as number] = child;
    return copy as T;
  }
  return { ...container, [key]: child } as T;
}

function listAt(value: unknown, path: Path): unknown[] {
  const list = getAt(value, path);
  if (!Array.isArray(list)) throw new Error(`Não há lista em "${path.join('.')}"`);
  return list;
}

export const canAddItem = (list: readonly unknown[], limits: ListLimits) =>
  list.length < limits.max;

export const canRemoveItem = (list: readonly unknown[], limits: ListLimits) =>
  list.length > limits.min;

export function moveItem<T>(value: T, path: Path, from: number, to: number): T {
  const list = listAt(value, path);
  if (from === to || to < 0 || to >= list.length || from < 0 || from >= list.length) return value;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return setAt(value, path, copy);
}

export function removeItem<T>(value: T, path: Path, index: number, limits: ListLimits): T {
  const list = listAt(value, path);
  if (!canRemoveItem(list, limits) || index < 0 || index >= list.length) return value;
  return setAt(
    value,
    path,
    list.filter((_, position) => position !== index),
  );
}

export function addItem<T>(value: T, path: Path, item: unknown, limits: ListLimits): T {
  const list = listAt(value, path);
  if (!canAddItem(list, limits)) return value;
  return setAt(value, path, [...list, item]);
}

/** Valor inicial de um campo novo, com o formato do schema. */
export function newValueFor(node: FieldNode): unknown {
  switch (node.kind) {
    case 'group':
      return Object.fromEntries(
        (node.children ?? []).map((child) => [child.key, newValueFor(child)]),
      );
    case 'photo':
      return { src: '', width: 1, height: 1, alt: '' };
    case 'list':
      return Array.from({ length: node.meta.min ?? 0 }, () => newValueFor(node.item as FieldNode));
    case 'icon':
      return ICON_IDS[0];
    case 'toggle':
      return false;
    case 'number':
      return node.meta.min ?? 0;
    default:
      return '';
  }
}

/** Comparação estrutural: alterado é o que tem valor diferente, não outra referência. */
export function isDirty(saved: unknown, draft: unknown): boolean {
  if (saved === draft) return false;
  if (Array.isArray(saved) && Array.isArray(draft)) {
    return (
      saved.length !== draft.length || saved.some((item, index) => isDirty(item, draft[index]))
    );
  }
  if (isObject(saved) && isObject(draft)) {
    const keys = new Set([...Object.keys(saved), ...Object.keys(draft)]);
    return [...keys].some((key) => isDirty(saved[key], draft[key]));
  }
  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
