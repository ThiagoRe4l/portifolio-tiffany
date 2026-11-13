import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { AdminIcon } from '../../components/AdminIcon';
import { addItem, canAddItem, canRemoveItem, moveItem, newValueFor, removeItem } from '../draft';
import type { FieldNode } from '../schemaTree';
import { pathKey } from '../validation';
import styles from './fields.module.css';
import type { FieldProps } from './types';

type ListFieldProps = Omit<FieldProps<unknown[]>, 'provisional'> & {
  renderItem: (index: number) => ReactNode;
};

type Focus = { index: number; target: 'up' | 'down' | 'title' } | 'add';

const plural = (count: number) => (count === 1 ? `${count} item` : `${count} itens`);
const SUMMARY_MAX = 40;

/** Resumo do item no título: o primeiro texto preenchido de um item que é grupo. */
function summary(item: FieldNode, value: unknown): string {
  if (!item.children || value === null || typeof value !== 'object') return '';
  for (const child of item.children) {
    const text = (value as Record<string, unknown>)[child.key];
    if (
      (child.kind === 'text' || child.kind === 'longText') &&
      typeof text === 'string' &&
      text.trim()
    ) {
      const trimmed = text.trim();
      return trimmed.length > SUMMARY_MAX ? `${trimmed.slice(0, SUMMARY_MAX)}…` : trimmed;
    }
  }
  return '';
}

/**
 * Lista (RF-07): mover, remover e adicionar com botões, sem arrastar. O foco
 * acompanha o item depois de cada ação.
 */
export function ListField({ node, path, value, onChange, error, renderItem }: ListFieldProps) {
  const id = useId();
  const container = useRef<HTMLFieldSetElement>(null);
  const pendingFocus = useRef<Focus | null>(null);
  const item = node.item as FieldNode;
  const limits = { min: node.meta.min ?? 0, max: node.meta.max ?? Number.POSITIVE_INFINITY };
  const canAdd = canAddItem(value, limits);
  const canRemove = canRemoveItem(value, limits);
  const ids = { hint: `${id}-hint`, error: `${id}-error`, min: `${id}-min`, max: `${id}-max` };

  useLayoutEffect(() => {
    const focus = pendingFocus.current;
    const root = container.current;
    if (!focus || !root) return;
    pendingFocus.current = null;

    if (focus === 'add') {
      root.querySelector<HTMLElement>('[data-action="add"]')?.focus();
      return;
    }
    const entry = root.querySelector(`[data-list-item="${focus.index}"]`);
    const find = (action: string) =>
      entry?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (focus.target === 'title') {
      entry?.querySelector<HTMLElement>('[data-item-title]')?.focus();
      return;
    }
    const wanted = find(focus.target);
    const fallback = find(focus.target === 'up' ? 'down' : 'up');
    (wanted && !wanted.disabled ? wanted : fallback)?.focus();
  });

  const move = (from: number, to: number, target: 'up' | 'down') => {
    pendingFocus.current = { index: to, target };
    onChange(moveItem(value, [], from, to));
  };

  const remove = (index: number) => {
    if (!canRemove) return;
    const remaining = value.length - 1;
    pendingFocus.current =
      remaining === 0 ? 'add' : { index: Math.min(index, remaining - 1), target: 'title' };
    onChange(removeItem(value, [], index, limits));
  };

  const add = () => {
    if (!canAdd) return;
    pendingFocus.current = { index: value.length, target: 'title' };
    onChange(addItem(value, [], newValueFor(item), limits));
  };

  const describedBy = [error && ids.error, node.meta.hint && ids.hint].filter(Boolean).join(' ');

  return (
    <fieldset
      ref={container}
      className={styles.group}
      aria-describedby={describedBy || undefined}
      data-field-path={pathKey(path)}
    >
      <legend className={styles.legend}>{node.meta.label}</legend>
      {node.meta.hint ? (
        <p id={ids.hint} className={styles.hint}>
          {node.meta.hint}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className={styles.error}>
          {error}
        </p>
      ) : null}

      <ol className={styles.items}>
        {value.map((entry, index) => {
          const name = `${item.meta.label} ${index + 1}`;
          const extra = summary(item, entry);
          return (
            <li key={index} className={styles.item} data-list-item={index}>
              <div className={styles.itemHeader}>
                <span className={styles.itemTitle} tabIndex={-1} data-item-title="">
                  {extra ? `${name} · ${extra}` : name}
                </span>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Mover ${name} para cima`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1, 'up')}
                    data-action="up"
                  >
                    <AdminIcon name="arrowUp" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Mover ${name} para baixo`}
                    disabled={index === value.length - 1}
                    onClick={() => move(index, index + 1, 'down')}
                    data-action="down"
                  >
                    <AdminIcon name="arrowDown" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Remover ${name}`}
                    aria-disabled={canRemove ? undefined : true}
                    aria-describedby={canRemove ? undefined : ids.min}
                    onClick={() => remove(index)}
                    data-action="remove"
                  >
                    <AdminIcon name="trash" />
                  </button>
                </div>
              </div>
              <div className={styles.itemBody}>{renderItem(index)}</div>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className={styles.addButton}
        aria-label={`Adicionar item: ${node.meta.label}`}
        aria-disabled={canAdd ? undefined : true}
        aria-describedby={canAdd ? undefined : ids.max}
        onClick={add}
        data-action="add"
      >
        <AdminIcon name="plus" />
        Adicionar item
      </button>
      {canRemove ? null : (
        <p id={ids.min} className={styles.hint}>
          {`Mínimo de ${plural(limits.min)}: para remover, adicione outro antes.`}
        </p>
      )}
      {canAdd ? null : (
        <p id={ids.max} className={styles.hint}>
          {`Máximo de ${plural(limits.max)}.`}
        </p>
      )}
    </fieldset>
  );
}
