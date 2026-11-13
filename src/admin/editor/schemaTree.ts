import { z } from 'zod';
import { getFieldMeta, type FieldKind, type FieldMeta } from '@/content/fields';

/**
 * Árvore de campos de uma seção (spec 004, D1). O formulário é desenhado a partir
 * dela, então um campo novo no schema aparece no admin sem mudar código.
 */
export type FieldNode = {
  /** Nome do campo no objeto; vazio na raiz e no modelo de item de lista. */
  key: string;
  kind: FieldKind;
  meta: FieldMeta;
  schema: z.ZodType;
  /** Grupos e fotos. Na foto, só o texto alternativo (endereço e tamanho vêm da 005). */
  children?: FieldNode[];
  /** Listas: o modelo de cada item. */
  item?: FieldNode;
};

const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

export function buildTree(schema: z.ZodType, key = '', where = key): FieldNode {
  const meta = getFieldMeta(schema);
  if (!meta) {
    throw new Error(
      `Campo "${where || '(raiz)'}" sem metadados: use os construtores de src/content/fields.ts`,
    );
  }

  const node: FieldNode = { key, kind: meta.kind, meta, schema };

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodType>;
    const keys = meta.kind === 'photo' ? ['alt'] : Object.keys(shape);
    node.children = keys.map((childKey) =>
      buildTree(shape[childKey] as z.ZodType, childKey, join(where, childKey)),
    );
  } else if (schema instanceof z.ZodArray) {
    node.item = buildTree(schema.element as z.ZodType, '', `${where}[]`);
  }

  return node;
}

export type Leaf = { path: string; node: FieldNode };

/** Campos editáveis, com caminho no formato `cards[].title` (o mesmo dos testes da 001). */
export function editableLeaves(root: FieldNode): Leaf[] {
  const leaves: Leaf[] = [];

  const visit = (node: FieldNode, path: string) => {
    if (node.children) {
      for (const child of node.children) visit(child, join(path, child.key));
    } else if (node.item) {
      visit(node.item, `${path}[]`);
    } else {
      leaves.push({ path, node });
    }
  };

  visit(root, '');
  return leaves;
}
