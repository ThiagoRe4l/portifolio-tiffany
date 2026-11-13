import { useId, type ReactNode } from 'react';
import type { FieldNode } from '../schemaTree';
import styles from './fields.module.css';

/** Grupo (RF-06): um bloco com título, como "WhatsApp" no design. */
export function GroupField({ node, children }: { node: FieldNode; children: ReactNode }) {
  const hintId = useId();

  return (
    <fieldset className={styles.group} aria-describedby={node.meta.hint ? hintId : undefined}>
      <legend className={styles.legend}>{node.meta.label}</legend>
      {node.meta.hint ? (
        <p id={hintId} className={styles.hint}>
          {node.meta.hint}
        </p>
      ) : null}
      {children}
    </fieldset>
  );
}
