import { GroupChildren, type RenderContext } from './FieldRenderer';
import type { FieldNode } from './schemaTree';
import styles from './SectionForm.module.css';

type SectionFormProps = RenderContext & {
  /** Árvore do schema da seção (spec 004, D1); o formulário não conhece as seções. */
  tree: FieldNode;
  value: unknown;
};

/**
 * Formulário de uma seção, gerado a partir do schema (RF-03). A raiz não vira bloco:
 * o nome da seção já aparece no seletor.
 */
export function SectionForm({ tree, value, ...context }: SectionFormProps) {
  return (
    <div className={styles.form}>
      <GroupChildren {...context} node={tree} path={[]} value={value} />
    </div>
  );
}
