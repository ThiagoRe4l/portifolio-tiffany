import { MAX_PHOTO_WIDTH, variantWidths, type PhotoExt } from '@/lib/image';

/**
 * Preparação da foto no aparelho, antes do envio (spec 005, D2; RF-02 a RF-04).
 * A foto é redesenhada do zero, então EXIF e localização não passam para o arquivo novo.
 */

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Fundo das fotos com transparência (PNG): o creme do site. */
const BACKGROUND = '#FAF6F0';
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

export type PhotoCheck = { ok: true } | { ok: false; kind: 'type' | 'tooLarge' };

export type PreparedVariant = { width: number; height: number; blob: Blob };
export type PreparedPhoto = {
  width: number;
  height: number;
  ext: PhotoExt;
  /** Da menor para a maior. */
  variants: PreparedVariant[];
};
export type PrepareResult =
  { ok: true; photo: PreparedPhoto } | { ok: false; kind: 'type' | 'tooLarge' | 'unreadable' };

type Context2D = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  drawImage: (image: never, x: number, y: number, width: number, height: number) => void;
};

export type CanvasLike = {
  getContext: (kind: '2d') => Context2D | null;
  toBlob: (type: string, quality: number) => Promise<Blob>;
};

type Bitmap = { width: number; height: number; close: () => void };

/** O que vem do navegador; os testes trocam por versões simuladas. */
export type PhotoDeps = {
  decode: (file: File) => Promise<Bitmap>;
  createCanvas: (width: number, height: number) => CanvasLike;
};

export const browserDeps: PhotoDeps = {
  // Aplica a orientação gravada pela câmera (foto de celular "deitada").
  decode: (file) => createImageBitmap(file, { imageOrientation: 'from-image' }),
  createCanvas: (width, height) => {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(width, height);
      return {
        getContext: () => canvas.getContext('2d') as Context2D | null,
        toBlob: (type, quality) => canvas.convertToBlob({ type, quality }),
      };
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return {
      getContext: () => canvas.getContext('2d') as Context2D | null,
      toBlob: (type, quality) =>
        new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('toBlob sem resultado'))),
            type,
            quality,
          );
        }),
    };
  },
};

export function checkPhotoFile(file: File): PhotoCheck {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type))
    return { ok: false, kind: 'type' };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, kind: 'tooLarge' };
  return { ok: true };
}

async function render(
  deps: PhotoDeps,
  bitmap: Bitmap,
  width: number,
  height: number,
  ext: PhotoExt,
): Promise<Blob> {
  const canvas = deps.createCanvas(width, height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D indisponível');
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap as never, 0, 0, width, height);
  return ext === 'webp'
    ? canvas.toBlob('image/webp', WEBP_QUALITY)
    : canvas.toBlob('image/jpeg', JPEG_QUALITY);
}

export async function preparePhoto(
  file: File,
  deps: PhotoDeps = browserDeps,
): Promise<PrepareResult> {
  const check = checkPhotoFile(file);
  if (!check.ok) return check;

  let bitmap: Bitmap;
  try {
    bitmap = await deps.decode(file);
  } catch {
    return { ok: false, kind: 'unreadable' };
  }

  try {
    // Lado maior com até 1600 px, sem nunca ampliar.
    const scale = Math.min(1, MAX_PHOTO_WIDTH / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const sizes = variantWidths(width)
      .reverse()
      .map((variantWidth) => ({
        width: variantWidth,
        height: Math.max(1, Math.round((height * variantWidth) / width)),
      }));

    // A maior primeiro: ela decide se o navegador gera WebP; senão, tudo em JPG.
    let ext: PhotoExt = 'webp';
    const variants: PreparedVariant[] = [];
    for (const size of sizes) {
      let blob = await render(deps, bitmap, size.width, size.height, ext);
      if (ext === 'webp' && blob.type !== 'image/webp') {
        ext = 'jpg';
        blob = await render(deps, bitmap, size.width, size.height, ext);
      }
      variants.unshift({ ...size, blob });
    }

    return { ok: true, photo: { width, height, ext, variants } };
  } catch {
    return { ok: false, kind: 'unreadable' };
  } finally {
    bitmap.close();
  }
}
