import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { group, list, longText, photo, text, toggle } from '@/content/fields';
import { SECTION_KEYS, sectionSchemas } from '@/content/schema';
import { walkSchema } from '../../../tests/support/walkSchema';
import { buildTree, editableLeaves, type FieldNode } from './schemaTree';

// Spec 004, T02 (D1). A árvore que o formulário percorre.

describe('buildTree', () => {
  it('a raiz é o grupo da seção, com os campos na ordem do schema', () => {
    const tree = buildTree(sectionSchemas.inicio);

    expect(tree.kind).toBe('group');
    expect(tree.meta.label).toBe('Início');
    expect(tree.children?.map((child) => child.key)).toEqual([
      'eyebrow',
      'title',
      'text',
      'primaryCta',
      'secondaryCta',
      'photo',
      'badge',
    ]);
  });

  it('cada nó leva o tipo e o rótulo do schema', () => {
    const tree = buildTree(sectionSchemas.inicio);
    const title = tree.children?.find((child) => child.key === 'title');

    expect(title).toMatchObject({ kind: 'text', meta: { label: 'Título principal', max: 90 } });
  });

  it('grupos têm filhos; listas têm o modelo do item', () => {
    const tree = buildTree(sectionSchemas.trabalho);
    const cards = tree.children?.find((child) => child.key === 'cards') as FieldNode;

    expect(cards.kind).toBe('list');
    expect(cards.meta).toMatchObject({ min: 1, max: 8 });
    expect(cards.item?.kind).toBe('group');
    expect(cards.item?.children?.map((child) => child.kind)).toEqual(['icon', 'text', 'longText']);
  });

  it('na foto, só o texto alternativo vira campo (endereço e tamanho vêm da 005)', () => {
    const tree = buildTree(sectionSchemas.sobre);
    const node = tree.children?.find((child) => child.key === 'photo') as FieldNode;

    expect(node.kind).toBe('photo');
    expect(node.children?.map((child) => child.key)).toEqual(['alt']);
  });

  it('schema sem metadados é erro de programação, com mensagem clara', () => {
    const schema = group('Teste', { solto: z.string() });

    expect(() => buildTree(schema)).toThrow(/solto.*sem metadados/);
  });
});

describe('editableLeaves', () => {
  it.each(SECTION_KEYS)('%s: as mesmas folhas que o walkSchema, sem as internas da foto', (key) => {
    const fromTree = editableLeaves(buildTree(sectionSchemas[key])).map((leaf) => leaf.path);
    const entries = walkSchema(sectionSchemas[key], { intoPhotos: true });
    // Endereço e tamanho de cada foto são preenchidos pelo envio (005), não pelo formulário.
    const managedByUpload = new Set(
      entries
        .filter((entry) => entry.meta?.kind === 'photo')
        .flatMap((entry) => ['src', 'width', 'height'].map((field) => `${entry.path}.${field}`)),
    );
    const independent = entries
      .filter((entry) => !['group', 'list', 'photo'].includes(entry.meta?.kind ?? ''))
      .map((entry) => entry.path)
      .filter((path) => !managedByUpload.has(path));

    expect(fromTree.sort()).toEqual(independent.sort());
  });

  it('um campo novo no schema aparece sem mudar nada no admin', () => {
    const schema = group('Seção de teste', {
      existing: text('Existente', { max: 10 }),
      brandNew: longText('Campo novo', { max: 20 }),
      items: list('Itens', group('Item', { on: toggle('Ligado'), pic: photo('Foto') }), {
        min: 0,
        max: 3,
      }),
    });

    expect(editableLeaves(buildTree(schema)).map((leaf) => leaf.path)).toEqual([
      'existing',
      'brandNew',
      'items[].on',
      'items[].pic.alt',
    ]);
  });
});
