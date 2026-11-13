import { useEffect, useId, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Janela de confirmação (spec 004, D7) com o <dialog> nativo: o navegador prende o
 * foco nela e deixa o fundo inerte. O foco começa na opção segura; Esc cancela.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    cancelButton.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        // Esc: quem fecha é o editor, para o estado não ficar diferente da tela.
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={`${id}-title`} className={styles.title}>
        {title}
      </h2>
      <p id={`${id}-message`} className={styles.message}>
        {message}
      </p>
      <div className={styles.actions}>
        <button ref={cancelButton} type="button" className={styles.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
