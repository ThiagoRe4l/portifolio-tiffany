/**
 * Única exceção à regra "nenhum texto fixo no site" (CLAUDE.md §6.7): rótulos de
 * interface, sem nada sobre a psicóloga. Aprovados no Gate 1 da spec 002 (2026-11-07).
 * Um rótulo novo precisa de aprovação.
 */
export const a11yLabels = Object.freeze({
  openMenu: 'Abrir menu',
  closeMenu: 'Fechar menu',
  menu: 'Menu',
  skipToContent: 'Pular para o conteúdo',
  newTab: '(abre em nova aba)',
} as const);
