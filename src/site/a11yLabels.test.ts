import { describe, expect, it } from 'vitest';
import { a11yLabels } from './a11yLabels';

// Spec 002, T02 — única exceção à regra "nenhum texto fixo" (CLAUDE.md §6.7):
// exatamente os 5 rótulos aprovados no Gate 1 (2026-11-07). Um rótulo novo exige
// aprovação e entra primeiro aqui.

describe('a11yLabels', () => {
  it('tem exatamente os 5 rótulos aprovados', () => {
    expect(a11yLabels).toEqual({
      openMenu: 'Abrir menu',
      closeMenu: 'Fechar menu',
      menu: 'Menu',
      skipToContent: 'Pular para o conteúdo',
      newTab: '(abre em nova aba)',
    });
  });

  it('não pode ser alterado em tempo de execução', () => {
    expect(Object.isFrozen(a11yLabels)).toBe(true);
  });
});
