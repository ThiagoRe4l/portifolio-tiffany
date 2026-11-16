import { describe, expect, it } from 'vitest';
import { PHOTO_SIZES } from './photoSizes';

// Spec 005, T06 e T08 (D7). Largura que cada foto precisa, medida no CSS de cada seção.
// As fotos são recortadas para preencher a área (object-fit: cover): numa área mais alta
// que 4:3, a foto precisa ser mais larga que a área, na proporção da altura (× 4/3).
// O E2E (admin-photos.spec.ts) confere no navegador que a versão escolhida cobre a área.

describe('PHOTO_SIZES', () => {
  it('valores de cada lugar', () => {
    expect(PHOTO_SIZES).toEqual({
      hero: '(min-width: 1024px) 750px, 535px',
      about: '(min-width: 1024px) 640px, calc(100vw - 48px)',
      galleryLarge: '(min-width: 1024px) 430px, calc(100vw - 48px)',
      gallerySmall: '(min-width: 1024px) 430px, (max-width: 459px) 200px, calc(50vw - 30px)',
    });
  });
});
