import { ICONS, type IconId } from '@/content/icons';
import { Icon } from '@/site/components/Icon';
import { FieldShell } from '../../components/FieldShell';
import { pathKey } from '../validation';
import styles from './fields.module.css';
import { asText, type FieldProps } from './types';

/** Seletor de ícone (RF-08): o nome em português e, ao lado, o desenho do site. */
export function IconField({ node, path, value, onChange, error }: FieldProps) {
  const current = asText(value);
  const known = ICONS.some((item) => item.id === current);

  return (
    <FieldShell label={node.meta.label} hint={node.meta.hint} error={error}>
      {(control) => (
        <div className={styles.iconRow}>
          <span className={styles.iconPreview}>
            {known ? <Icon name={current as IconId} size={24} /> : null}
          </span>
          <select
            {...control}
            className={styles.select}
            value={current}
            onChange={(event) => onChange(event.target.value)}
            data-field-path={pathKey(path)}
          >
            {ICONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </FieldShell>
  );
}
