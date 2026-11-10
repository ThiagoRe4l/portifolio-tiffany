import { useAuth } from './auth/AuthProvider';
import styles from './AdminEditorPage.module.css';
import { AdminIcon } from './components/AdminIcon';

/** Casca protegida do editor. Os formulários e a publicação chegam na spec 004. */
export function AdminEditorPage() {
  const { signOut } = useAuth();

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>Editar site</h1>
        <div className={styles.actions}>
          {/* Link comum: o site público não faz parte do roteador do admin. */}
          <a className={styles.viewSite} href="/">
            <AdminIcon name="eye" size={18} />
            Ver site
          </a>
          <button
            type="button"
            className={styles.signOut}
            aria-label="Sair"
            onClick={() => void signOut()}
          >
            <AdminIcon name="logout" />
          </button>
        </div>
      </header>
      <main className={styles.main}></main>
    </>
  );
}
