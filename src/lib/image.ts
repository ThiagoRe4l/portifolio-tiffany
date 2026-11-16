/**
 * Regra das versões de cada foto (spec 005, D1). O admin envia as versões com estes
 * nomes, o build as copia e o site monta o `srcset` a partir do endereço da maior.
 * O conteúdo guarda só esse endereço, então o contrato da 001 não muda.
 */

export const STANDARD_WIDTHS = [480, 960, 1600] as const;
export const MAX_PHOTO_WIDTH = 1600;

export type PhotoExt = 'webp' | 'jpg';

export type Variant = { prefix: string; code: string; width: number; ext: PhotoExt };

/** `<código>-<largura>w.<webp|jpg>` no fim do endereço; nada depois (sem `?`). */
const VARIANT = /^(.*\/)?([^/]+)-(\d+)w\.(webp|jpg)$/;

/** Larguras padrão menores que a foto, mais a da própria foto: nunca amplia. */
export function variantWidths(width: number): number[] {
  if (!Number.isInteger(width) || width < 1) throw new Error(`Largura inválida: ${width}`);
  return [...STANDARD_WIDTHS.filter((standard) => standard < width), width];
}

export const variantName = (code: string, width: number, ext: PhotoExt): string =>
  `${code}-${width}w.${ext}`;

export function parseVariant(src: string): Variant | null {
  const match = VARIANT.exec(src);
  if (!match) return null;
  const [, prefix = '', code = '', width = '', ext] = match;
  return { prefix, code, width: Number(width), ext: ext as PhotoExt };
}

export function variantUrl(src: string, width: number): string {
  const variant = parseVariant(src);
  if (!variant) throw new Error(`Endereço fora da regra das versões: ${src}`);
  return `${variant.prefix}${variantName(variant.code, width, variant.ext)}`;
}

/** `srcset` com as versões da foto; vazio quando o endereço não segue a regra. */
export function srcSetFor(src: string): string {
  const variant = parseVariant(src);
  if (!variant) return '';
  return variantWidths(variant.width)
    .map((width) => `${variantUrl(src, width)} ${width}w`)
    .join(', ');
}
