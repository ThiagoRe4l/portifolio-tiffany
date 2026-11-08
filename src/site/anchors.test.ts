import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { headingIdFor, MAIN_ID, MENU_TARGETS, SECTION_IDS } from './anchors';

// Spec 002, RF-02 / RF-03 — ids técnicos das âncoras (não aparecem como texto).

describe('âncoras', () => {
  it('cada seção tem o id do design', () => {
    expect(SECTION_IDS).toEqual({
      inicio: 'inicio',
      sobre: 'sobre',
      trabalho: 'trabalho',
      atuacao: 'atuacao',
      comoFunciona: 'como-funciona',
      espaco: 'espaco',
      contato: 'contato',
    });
  });

  it('o main tem um id próprio para o link "pular para o conteúdo"', () => {
    expect(MAIN_ID).toBe('conteudo');
  });

  it('todos os ids são únicos e válidos em URL', () => {
    const ids = [...Object.values(SECTION_IDS), MAIN_ID];

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
  });

  it('cada item do menu (geral.menu) aponta para a seção certa', () => {
    expect(Object.keys(MENU_TARGETS).sort()).toEqual(Object.keys(defaultContent.geral.menu).sort());
    expect(MENU_TARGETS).toEqual({
      about: 'sobre',
      work: 'trabalho',
      focus: 'atuacao',
      howItWorks: 'como-funciona',
      space: 'espaco',
      contact: 'contato',
    });
  });

  it('o id do título de cada seção é único e diferente dos ids das seções', () => {
    const sectionIds = Object.values(SECTION_IDS);
    const headingIds = sectionIds.map(headingIdFor);

    expect(headingIdFor(SECTION_IDS.sobre)).toBe('sobre-titulo');
    expect(new Set([...sectionIds, ...headingIds, MAIN_ID]).size).toBe(sectionIds.length * 2 + 1);
  });
});
