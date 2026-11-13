import { FieldShell } from '../../components/FieldShell';
import styles from '../../components/TextField.module.css';
import { pathKey } from '../validation';
import { asText, PROVISIONAL_WARNING, type FieldProps } from './types';

export function TextAreaField({ node, path, value, onChange, error, provisional }: FieldProps) {
  const text = asText(value);

  return (
    <FieldShell
      label={node.meta.label}
      hint={node.meta.hint}
      warning={provisional ? PROVISIONAL_WARNING : undefined}
      error={error}
      count={node.meta.max === undefined ? undefined : { length: text.length, max: node.meta.max }}
    >
      {(control) => (
        <textarea
          {...control}
          className={styles.textarea}
          rows={4}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          data-field-path={pathKey(path)}
        />
      )}
    </FieldShell>
  );
}
