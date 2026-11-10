import { AuthLayout } from '../components/AuthLayout';
import buttonStyles from '../components/SubmitButton.module.css';
import { AUTH_NOTICES } from './authMessages';
import styles from './AuthScreens.module.css';

const TITLE = 'Área administrativa';

export function AuthLoading() {
  return (
    <main className={styles.loading}>
      <p role="status">Carregando…</p>
    </main>
  );
}

export function AuthCheckFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <AuthLayout title={TITLE} initials={null}>
      <div className={styles.message}>
        <p role="alert">{AUTH_NOTICES.checkFailed}</p>
        <button type="button" className={buttonStyles.button} onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    </AuthLayout>
  );
}

export function AuthUnconfigured() {
  return (
    <AuthLayout title={TITLE} initials={null}>
      <div className={styles.message}>
        <p>{AUTH_NOTICES.unconfigured}</p>
      </div>
    </AuthLayout>
  );
}
