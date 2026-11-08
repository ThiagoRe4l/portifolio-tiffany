import type { SiteContent } from '@/content/types';

/**
 * Ids técnicos das âncoras (spec 002, RF-02). Não aparecem como texto; ficam aqui,
 * fora do JSX, porque não são conteúdo editável.
 */
export const SECTION_IDS = {
  inicio: 'inicio',
  sobre: 'sobre',
  trabalho: 'trabalho',
  atuacao: 'atuacao',
  comoFunciona: 'como-funciona',
  espaco: 'espaco',
  contato: 'contato',
} as const;

/** Destino do link "pular para o conteúdo" (RF-03). */
export const MAIN_ID = 'conteudo';

type MenuKey = keyof SiteContent['geral']['menu'];

/** Para onde aponta cada item de `geral.menu`. */
export const MENU_TARGETS: Record<MenuKey, string> = {
  about: SECTION_IDS.sobre,
  work: SECTION_IDS.trabalho,
  focus: SECTION_IDS.atuacao,
  howItWorks: SECTION_IDS.comoFunciona,
  space: SECTION_IDS.espaco,
  contact: SECTION_IDS.contato,
};

/** `#id` para usar em `href`. */
export const hrefTo = (id: string) => `#${id}`;

/** Id do título da seção, para o `aria-labelledby` da `<section>`. */
export const headingIdFor = (sectionId: string) => `${sectionId}-titulo`;
