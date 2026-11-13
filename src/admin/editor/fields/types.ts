import type { Path } from '../draft';
import type { FieldNode } from '../schemaTree';

/** O que todo campo do editor recebe (spec 004, D5). */
export type FieldProps<V = unknown> = {
  node: FieldNode;
  /** Caminho dentro da seção; vira o `data-field-path` do controle. */
  path: Path;
  value: V;
  onChange: (value: unknown) => void;
  error?: string | undefined;
  /** O valor ainda é texto provisório (`[...]`). */
  provisional?: boolean | undefined;
};

export const PROVISIONAL_WARNING = 'Texto provisório: troque antes de divulgar o site.';

export const asText = (value: unknown): string => (typeof value === 'string' ? value : '');
