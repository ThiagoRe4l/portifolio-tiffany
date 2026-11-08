/**
 * Partes do header marcadas com `data-part` (para CSS de testes e E2E) e valores
 * técnicos do header. Ficam fora do JSX porque não são texto do conteúdo.
 */
export const HEADER_PART = {
  row: 'row',
  brand: 'brand',
  desktopNav: 'desktop-nav',
  cta: 'cta',
  menuButton: 'menu-button',
  menuPanel: 'menu-panel',
} as const;

export const MENU_PANEL_ID = 'menu-principal';

/** `data-nav="compact"`: a linha não cabe, então o header usa o botão de menu. */
export const NAV_COMPACT = 'compact';

/** Rolagem a partir da qual o header ganha fundo sólido e sombra (CLAUDE.md §8). */
export const SCROLL_THRESHOLD = 40;

/** Ordem dos itens do menu (a mesma das seções na página). */
export const MENU_KEYS = ['about', 'work', 'focus', 'howItWorks', 'space', 'contact'] as const;
