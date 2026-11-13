import type { ComponentProps, ReactNode } from 'react';
import { FieldShell } from './FieldShell';
import styles from './TextField.module.css';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  warning?: string | undefined;
  /** Mostra a contagem de caracteres com este limite. */
  max?: number | undefined;
  /** Botão dentro do campo, à direita. */
  trailing?: ReactNode;
};

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  warning,
  max,
  trailing,
  ...input
}: TextFieldProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      warning={warning}
      error={error}
      count={max === undefined ? undefined : { length: value.length, max }}
    >
      {(control) => (
        <>
          <input
            {...input}
            {...control}
            className={styles.input}
            data-trailing={trailing ? '' : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          {trailing}
        </>
      )}
    </FieldShell>
  );
}
