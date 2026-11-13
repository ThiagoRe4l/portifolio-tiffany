import { useId } from 'react';
import { SECTION_KEYS } from '@/content/schema';
import type { SectionKey } from '@/content/types';
import { TREES } from './editorState';
import styles from './SectionPicker.module.css';

const LABELS = SECTION_KEYS.map((key) => TREES[key].meta.label);

/** "Seção do site · N de 8", o seletor e a lista dos nomes abaixo (RF-02). */
export function SectionPicker({
  value,
  onChange,
}: {
  value: SectionKey;
  onChange: (section: SectionKey) => void;
}) {
  const id = useId();
  const position = SECTION_KEYS.indexOf(value) + 1;

  return (
    <div className={styles.picker}>
      <label className={styles.label} htmlFor={id}>
        {`Seção do site · ${position} de ${SECTION_KEYS.length}`}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as SectionKey)}
      >
        {SECTION_KEYS.map((key, index) => (
          <option key={key} value={key}>
            {LABELS[index]}
          </option>
        ))}
      </select>
      <p className={styles.names}>{LABELS.join(' · ')}</p>
    </div>
  );
}
