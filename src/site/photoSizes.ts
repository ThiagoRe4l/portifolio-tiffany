/**
 * `sizes` de cada lugar com foto (spec 005, D7): a largura de foto que cada área
 * precisa, medida no CSS da seção. As fotos são recortadas para preencher a área
 * (object-fit: cover), então uma área mais alta que 4:3 pede uma foto mais larga que
 * ela, na proporção da altura (altura × 4/3). O E2E confere a escolha no navegador.
 * Mudou o layout de uma seção? Mude aqui também.
 */
export const PHOTO_SIZES = {
  /** Foto principal: 400 px de altura no celular e 560 no desktop. */
  hero: '(min-width: 1024px) 750px, 535px',
  /** Sobre mim: largura toda no celular; 480 px de altura no desktop. */
  about: '(min-width: 1024px) 640px, calc(100vw - 48px)',
  /** Galeria, a primeira: largura toda no celular; 320 px de altura no desktop. */
  galleryLarge: '(min-width: 1024px) 430px, calc(100vw - 48px)',
  /** Galeria, as outras: 150 px de altura no celular (200 px de largura nas telas estreitas). */
  gallerySmall: '(min-width: 1024px) 430px, (max-width: 459px) 200px, calc(50vw - 30px)',
} as const;
