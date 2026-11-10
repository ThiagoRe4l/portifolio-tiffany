import type { ReactNode } from 'react';
import { AdminIcon } from './AdminIcon';
import styles from './AuthLayout.module.css';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  /** Texto do círculo. `undefined`: ainda carregando; `null`: indisponível (cadeado). */
  initials?: string | null | undefined;
  note?: string | undefined;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, initials, note, children }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      {/* Link comum: o site público não faz parte do roteador do admin. */}
      <a className={styles.back} href="/">
        <AdminIcon name="arrowLeft" size={18} />
        Voltar ao site
      </a>
      <div className={styles.heading}>
        <span className={styles.mark} data-part="mark" aria-hidden="true">
          {initials === null ? <AdminIcon name="lock" size={24} /> : initials}
        </span>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      <div className={styles.body}>{children}</div>
      {note ? (
        <p className={styles.note} data-part="note">
          {note}
        </p>
      ) : null}
    </main>
  );
}
