import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_WIDTH,
  parseVariant,
  srcSetFor,
  STANDARD_WIDTHS,
  variantName,
  variantUrl,
  variantWidths,
} from './image';

// Spec 005, T02 (D1). Regra das versões de cada foto: usada pelo admin, pelo build e pelo site.

const CODE = '3f6c2a1e-7b4d-4e2a-9c1f-0a1b2c3d4e5f';
const STORAGE = 'https://projeto.supabase.co/storage/v1/object/public/site-photos/fotos';

describe('larguras', () => {
  it('padrões e máximo da spec', () => {
    expect(STANDARD_WIDTHS).toEqual([480, 960, 1600]);
    expect(MAX_PHOTO_WIDTH).toBe(1600);
  });

  it.each([
    [1600, [480, 960, 1600]],
    [1200, [480, 960, 1200]],
    [960, [480, 960]],
    [961, [480, 960, 961]],
    [480, [480]],
    [300, [300]],
  ])('foto com %i px: versões %j, sem nunca ampliar', (width, expected) => {
    expect(variantWidths(width)).toEqual(expected);
  });

  it.each([0, -1, 1.5, Number.NaN])('largura inválida (%s) é erro de programação', (width) => {
    expect(() => variantWidths(width)).toThrow(/Largura inválida/);
  });
});

describe('nomes', () => {
  it('código, largura e extensão', () => {
    expect(variantName(CODE, 960, 'webp')).toBe(`${CODE}-960w.webp`);
    expect(variantName(CODE, 1200, 'jpg')).toBe(`${CODE}-1200w.jpg`);
  });

  it.each([
    [
      `${STORAGE}/${CODE}-1600w.webp`,
      { prefix: `${STORAGE}/`, code: CODE, width: 1600, ext: 'webp' },
    ],
    [`/fotos/${CODE}-1200w.jpg`, { prefix: '/fotos/', code: CODE, width: 1200, ext: 'jpg' }],
    [`${CODE}-480w.webp`, { prefix: '', code: CODE, width: 480, ext: 'webp' }],
  ])('lê %s', (src, expected) => {
    expect(parseVariant(src)).toEqual(expected);
  });

  it('ida e volta: o nome montado é lido igual', () => {
    expect(parseVariant(`/fotos/${variantName(CODE, 960, 'webp')}`)).toMatchObject({
      code: CODE,
      width: 960,
      ext: 'webp',
    });
  });

  it.each([
    'https://exemplo.com/foto.jpg',
    `/fotos/${CODE}-1600.webp`,
    `/fotos/${CODE}-1600w.png`,
    `/fotos/${CODE}-1600w.webp?v=2`,
    '',
  ])('endereço fora da regra (%j): não lê', (src) => {
    expect(parseVariant(src)).toBeNull();
  });
});

describe('variantUrl e srcSetFor', () => {
  const big = `${STORAGE}/${CODE}-1600w.webp`;

  it('troca só a largura do fim do endereço', () => {
    expect(variantUrl(big, 480)).toBe(`${STORAGE}/${CODE}-480w.webp`);
  });

  it('variantUrl com endereço fora da regra é erro de programação', () => {
    expect(() => variantUrl('https://exemplo.com/foto.jpg', 480)).toThrow(/fora da regra/);
  });

  it('srcset com as três versões', () => {
    expect(srcSetFor(`/fotos/${CODE}-1600w.webp`)).toBe(
      `/fotos/${CODE}-480w.webp 480w, /fotos/${CODE}-960w.webp 960w, /fotos/${CODE}-1600w.webp 1600w`,
    );
  });

  it('foto menor: só as versões que existem', () => {
    expect(srcSetFor(`/fotos/${CODE}-1200w.jpg`)).toBe(
      `/fotos/${CODE}-480w.jpg 480w, /fotos/${CODE}-960w.jpg 960w, /fotos/${CODE}-1200w.jpg 1200w`,
    );
    expect(srcSetFor(`/fotos/${CODE}-300w.webp`)).toBe(`/fotos/${CODE}-300w.webp 300w`);
  });

  it('endereço fora da regra ou vazio: srcset vazio', () => {
    expect(srcSetFor('https://exemplo.com/foto.jpg')).toBe('');
    expect(srcSetFor('')).toBe('');
  });
});
