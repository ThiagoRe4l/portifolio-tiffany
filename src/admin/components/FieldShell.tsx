import { useId, type ReactNode } from 'react';
import { CharCounter } from './CharCounter';
import styles from './TextField.module.css';

export type ControlProps = {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

type FieldShellProps = {
  label: string;
  hint?: string | undefined;
  /** Aviso que não impede salvar (ex.: texto provisório). */
  warning?: string | undefined;
  error?: string | undefined;
  /** Contagem de caracteres, quando o campo tem limite. */
  count?: { length: number; max: number } | undefined;
  children: (control: ControlProps) => ReactNode;
};

/**
 * Moldura comum dos campos: rótulo, controle e, abaixo, dica, aviso, erro e contagem,
 * todos ligados ao controle por `aria-describedby` (o erro primeiro).
 */
export function FieldShell({ label, hint, warning, error, count, children }: FieldShellProps) {
  const id = useId();
  const ids = {
    error: `${id}-error`,
    warning: `${id}-warning`,
    hint: `${id}-hint`,
    count: `${id}-count`,
  };
  const describedBy = [
    error && ids.error,
    warning && ids.warning,
    hint && ids.hint,
    count && ids.count,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        {children({
          id,
          ...(error ? { 'aria-invalid': true as const } : {}),
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        })}
      </div>
      {hint ? (
        <p id={ids.hint} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {warning ? (
        <p id={ids.warning} className={styles.warning}>
          {warning}
        </p>
      ) : null}
      {error ? (
        <p id={ids.error} className={styles.error}>
          {error}
        </p>
      ) : null}
      {count ? <CharCounter id={ids.count} length={count.length} max={count.max} /> : null}
    </div>
  );
}
