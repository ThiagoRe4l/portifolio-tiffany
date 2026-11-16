import { AdminIcon } from '../components/AdminIcon';
import styles from './ActionBar.module.css';

type ActionBarProps = {
  dirty: boolean;
  saving: boolean;
  /** Envio de foto em andamento (005): nada de publicar nem descartar até terminar. */
  blocked?: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

/** "Descartar" e "Salvar e publicar", fixos no rodapé (RF-04). */
export function ActionBar({ dirty, saving, blocked = false, onDiscard, onSave }: ActionBarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.discard}
          disabled={!dirty || saving || blocked}
          onClick={onDiscard}
        >
          Descartar
        </button>
        <button
          type="button"
          className={styles.save}
          disabled={!dirty || saving || blocked}
          aria-busy={saving ? true : undefined}
          onClick={onSave}
        >
          {saving ? (
            'Publicando…'
          ) : (
            <>
              <AdminIcon name="check" size={18} />
              Salvar e publicar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
