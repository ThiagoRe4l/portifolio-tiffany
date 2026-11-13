import type { MouseEvent } from 'react';
import { AdminIcon } from '../components/AdminIcon';
import styles from './EditorHeader.module.css';

type EditorHeaderProps = {
  status: string | null;
  unsaved: boolean;
  /** Com alterações, o editor intercepta o clique para confirmar antes (RF-20). */
  onViewSite: (event: MouseEvent<HTMLAnchorElement>) => void;
  onSignOut: () => void;
};

/** "Editar site", status da publicação, "Ver site" e "Sair" (RF-01; cabeçalho da 003). */
export function EditorHeader({ status, unsaved, onViewSite, onSignOut }: EditorHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <h1 className={styles.title}>Editar site</h1>
        {status ? (
          <p className={styles.status} data-part="status" data-unsaved={unsaved ? '' : undefined}>
            {status}
          </p>
        ) : null}
      </div>
      <div className={styles.actions}>
        {/* Link comum: o site público não faz parte do roteador do admin. */}
        <a className={styles.viewSite} href="/" onClick={onViewSite}>
          <AdminIcon name="eye" size={18} />
          Ver site
        </a>
        <button type="button" className={styles.signOut} aria-label="Sair" onClick={onSignOut}>
          <AdminIcon name="logout" />
        </button>
      </div>
    </header>
  );
}
