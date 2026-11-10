import type { ReactNode } from 'react';
import styles from './SubmitButton.module.css';

export function SubmitButton({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={styles.button}
      disabled={busy}
      aria-busy={busy ? true : undefined}
    >
      {busy ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
