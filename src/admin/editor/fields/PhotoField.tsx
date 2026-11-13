import { useId } from 'react';
import type { Photo } from '@/content/types';
import type { FieldNode } from '../schemaTree';
import styles from './fields.module.css';
import { TextInputField } from './TextInputField';
import type { FieldProps } from './types';

type PhotoFieldProps = Omit<FieldProps<Photo>, 'error' | 'provisional'> & {
  altError?: string | undefined;
  altProvisional?: boolean | undefined;
};

/**
 * Foto (RF-11): miniatura e texto alternativo. Endereço e tamanho são preenchidos
 * pelo envio da foto, na spec 005.
 */
export function PhotoField({
  node,
  path,
  value,
  onChange,
  altError,
  altProvisional,
}: PhotoFieldProps) {
  const hintId = useId();
  const altNode = node.children?.find((child) => child.key === 'alt') as FieldNode;

  return (
    <fieldset className={styles.group} aria-describedby={node.meta.hint ? hintId : undefined}>
      <legend className={styles.legend}>{node.meta.label}</legend>
      {node.meta.hint ? (
        <p id={hintId} className={styles.hint}>
          {node.meta.hint}
        </p>
      ) : null}
      <div className={styles.photo}>
        {value.src ? (
          // Decorativa: o texto alternativo está no campo ao lado.
          <img
            className={styles.thumbnail}
            src={value.src}
            alt=""
            width={value.width}
            height={value.height}
            loading="lazy"
          />
        ) : (
          <span className={styles.thumbnail} data-part="photo-placeholder" />
        )}
        <TextInputField
          node={altNode}
          path={[...path, 'alt']}
          value={value.alt}
          onChange={(alt) => onChange({ ...value, alt })}
          error={altError}
          provisional={altProvisional}
        />
      </div>
    </fieldset>
  );
}
