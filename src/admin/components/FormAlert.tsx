import { useEffect, useRef } from 'react';
import styles from './FormAlert.module.css';

/**
 * Região de aviso. Fica vazia desde o início, para o leitor de tela anunciar a
 * mudança; com `focus`, leva o foco à mensagem depois de um envio que falhou.
 */
export function FormAlert({ message, focus = true }: { message: string | null; focus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && focus) ref.current?.focus();
  }, [message, focus]);

  return (
    <div ref={ref} className={styles.alert} role="alert" tabIndex={-1}>
      {message}
    </div>
  );
}
