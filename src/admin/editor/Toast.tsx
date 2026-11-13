import { useEffect } from 'react';
import { AdminIcon } from '../components/AdminIcon';
import type { Toast as ToastData } from './editorState';
import styles from './Toast.module.css';

const SUCCESS_MS = 5000;

/**
 * Avisos de salvar (RF-16). As duas regiões existem vazias desde o início, para o
 * leitor de tela anunciar quando o texto chega. Sucesso some sozinho; erro fica até fechar.
 */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (toast?.tone !== 'success') return;
    const timer = setTimeout(() => onDismiss(toast.id), SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className={styles.stack}>
      <div role="status">
        {toast?.tone === 'success' ? (
          <p className={styles.toast} data-tone="success">
            {toast.message}
          </p>
        ) : null}
      </div>
      <div role="alert">
        {toast?.tone === 'error' ? (
          <div className={styles.toast} data-tone="error">
            <p className={styles.message}>{toast.message}</p>
            <button
              type="button"
              className={styles.close}
              aria-label="Fechar aviso"
              onClick={() => onDismiss(toast.id)}
            >
              <AdminIcon name="close" size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
