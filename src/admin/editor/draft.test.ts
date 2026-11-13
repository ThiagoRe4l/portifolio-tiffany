import { describe, expect, it } from 'vitest';
import { ICON_IDS } from '@/content/icons';
import { sectionSchemas } from '@/content/schema';
import {
  addItem,
  canAddItem,
  canRemoveItem,
  getAt,
  isDirty,
  moveItem,
  newValueFor,
  removeItem,
  setAt,
} from './draft';
import { buildTree, type FieldNode } from './schemaTree';

// Spec 004, T02 (D2). Rascunho imutável, editado por caminho.

const sample = {
  title: 'Título',
  cards: [
    { title: 'A', tags: ['x'] },
    { title: 'B', tags: [] },
    { title: 'C', tags: [] },
  ],
};

describe('getAt e setAt', () => {
  it('lê por caminho, inclusive dentro de listas', () => {
    expect(getAt(sample, ['cards', 1, 'title'])).toBe('B');
    expect(getAt(sample, ['cards', 0, 'tags', 0])).toBe('x');
  });

  it('escreve sem alterar o original e reaproveita o que não mudou', () => {
    const next = setAt(sample, ['cards', 1, 'title'], 'Novo');

    expect(getAt(next, ['cards', 1, 'title'])).toBe('Novo');
    expect(sample.cards[1]?.title).toBe('B');
    expect(next.cards[0]).toBe(sample.cards[0]);
    expect(next).not.toBe(sample);
  });

  it('caminho vazio troca o valor inteiro', () => {
    expect(setAt(sample, [], { title: 'x' })).toEqual({ title: 'x' });
  });
});

describe('operações de lista', () => {
  const limits = { min: 1, max: 4 };

  it('move um item para cima e para baixo', () => {
    const up = moveItem(sample, ['cards'], 2, 1);
    const down = moveItem(sample, ['cards'], 0, 1);

    expect(up.cards.map((card) => card.title)).toEqual(['A', 'C', 'B']);
    expect(down.cards.map((card) => card.title)).toEqual(['B', 'A', 'C']);
  });

  it('mover para fora da lista não muda nada', () => {
    expect(moveItem(sample, ['cards'], 0, -1)).toBe(sample);
    expect(moveItem(sample, ['cards'], 2, 3)).toBe(sample);
  });

  it('remove e adiciona no fim', () => {
    const removed = removeItem(sample, ['cards'], 1, limits);
    const added = addItem(sample, ['cards'], { title: 'D', tags: [] }, limits);

    expect(removed.cards.map((card) => card.title)).toEqual(['A', 'C']);
    expect(added.cards.map((card) => card.title)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('respeita o mínimo e o máximo', () => {
    const one = { cards: [{ title: 'só' }] };
    const full = { cards: [1, 2, 3, 4] };

    expect(canRemoveItem(one.cards, limits)).toBe(false);
    expect(removeItem(one, ['cards'], 0, limits)).toBe(one);
    expect(canAddItem(full.cards, limits)).toBe(false);
    expect(addItem(full, ['cards'], 5, limits)).toBe(full);
    expect(canAddItem(sample.cards, limits)).toBe(true);
    expect(canRemoveItem(sample.cards, limits)).toBe(true);
  });
});

describe('newValueFor', () => {
  const nodeOf = (section: keyof typeof sectionSchemas, key: string) =>
    buildTree(sectionSchemas[section]).children?.find((child) => child.key === key) as FieldNode;

  it('card novo: ícone padrão e textos vazios', () => {
    const cards = nodeOf('trabalho', 'cards');

    expect(newValueFor(cards.item as FieldNode)).toEqual({
      icon: ICON_IDS[0],
      title: '',
      text: '',
    });
  });

  it('foto nova na galeria: sem endereço, tamanho mínimo e texto alternativo vazio', () => {
    const photos = nodeOf('espaco', 'photos');

    expect(newValueFor(photos.item as FieldNode)).toEqual({
      photo: { src: '', width: 1, height: 1, alt: '' },
      caption: '',
    });
  });

  it('o item novo tem o formato do schema: os únicos erros são campos obrigatórios vazios', () => {
    const cards = nodeOf('trabalho', 'cards');
    const result = (cards.item as FieldNode).schema.safeParse(newValueFor(cards.item as FieldNode));

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Campo obrigatório',
      'Campo obrigatório',
    ]);
  });

  it('interruptor novo começa desligado', () => {
    const floating = buildTree(sectionSchemas.contato).children?.find(
      (child) => child.key === 'floatingButton',
    ) as FieldNode;

    expect(newValueFor(floating)).toEqual({ enabled: false, text: '' });
  });
});

describe('isDirty', () => {
  it('compara a estrutura, não a referência', () => {
    expect(isDirty(sample, structuredClone(sample))).toBe(false);
    expect(isDirty(sample, setAt(sample, ['cards', 0, 'tags', 0], 'y'))).toBe(true);
    expect(isDirty(sample, moveItem(sample, ['cards'], 0, 1))).toBe(true);
    expect(isDirty({ a: [] }, { a: [''] })).toBe(true);
  });
});
