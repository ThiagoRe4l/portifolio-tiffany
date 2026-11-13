import { useId } from 'react';
import { pathKey } from '../validation';
import styles from './fields.module.css';
import type { FieldProps } from './types';

export function ToggleField({ node, path, value, onChange }: FieldProps) {
  const hintId = useId();

  return (
    <div className={styles.toggleField}>
      <label className={styles.toggle}>
        <span>{node.meta.label}</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={node.meta.hint ? hintId : undefined}
          data-field-path={pathKey(path)}
        />
      </label>
      {node.meta.hint ? (
        <p id={hintId} className={styles.hint}>
          {node.meta.hint}
        </p>
      ) : null}
    </div>
  );
}
