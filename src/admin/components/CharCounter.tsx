import styles from './TextField.module.css';

/**
 * Contagem de caracteres (spec 004, RF-05). Visível sempre; muda de cor a partir de 90%
 * do limite e só é anunciada a leitores de tela quando o limite é ultrapassado.
 */
export function CharCounter({ id, length, max }: { id: string; length: number; max: number }) {
  const over = length > max;
  const state = over ? 'over' : length >= max * 0.9 ? 'near' : 'ok';

  return (
    <div className={styles.counterRow}>
      <p id={id} className={styles.counter} data-state={state}>
        {length} / {max}
      </p>
      <span role="status" className="visually-hidden">
        {over ? `Passou do limite de ${max} caracteres.` : ''}
      </span>
    </div>
  );
}
