import { useId, type ComponentProps, type ReactNode } from 'react';
import styles from './TextField.module.css';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  /** Botão dentro do campo, à direita. */
  trailing?: ReactNode;
};

export function TextField({ label, value, onChange, error, trailing, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          {...input}
          id={id}
          className={styles.input}
          data-trailing={trailing ? '' : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {trailing}
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
