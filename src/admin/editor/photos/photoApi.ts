import { variantName } from '@/lib/image';
import { getSupabase } from '@/lib/supabase';
import type { PreparedPhoto } from './preparePhoto';

/**
 * Envio das fotos preparadas para o Storage (spec 005, D3). Nomes gerados, nunca o
 * original; cada versão com cache longo, porque o nome não se repete.
 */

export const PHOTO_BUCKET = 'site-photos';
export const PHOTO_FOLDER = 'fotos';
const ONE_YEAR_SECONDS = '31536000';

export type UploadErrorKind =
  'network' | 'sessionExpired' | 'forbidden' | 'rejected' | 'unavailable' | 'unknown';

export type UploadResult =
  { ok: true; src: string; width: number; height: number } | { ok: false; kind: UploadErrorKind };

/** Marca que o SDK do Storage põe nos próprios erros (sem importar o pacote interno dele). */
const isStorageError = (error: unknown): error is Error =>
  typeof error === 'object' && error !== null && '__isStorageError' in error;

type StorageFailure = { status?: number; statusCode?: string; message?: string };

/** Só o tipo do erro sai daqui: nenhum texto do servidor chega à tela. */
function classify(error: unknown): UploadErrorKind {
  if (!isStorageError(error)) return 'unknown';
  if (error.name === 'StorageUnknownError') return 'network';
  // O SDK não guarda o campo `error` da resposta (ex.: "InvalidJWT"): o token vencido
  // aparece na mensagem, lida só aqui, sem chegar à tela.
  const { status = 0, statusCode = '', message = '' } = error as StorageFailure;
  if (status === 401 || statusCode === '401' || /jwt|"exp" claim/i.test(message)) {
    return 'sessionExpired';
  }
  if (statusCode === '403' || status === 403) return 'forbidden';
  if (['413', '415'].includes(statusCode) || status === 413 || status === 415) return 'rejected';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

export async function uploadPhoto(
  photo: PreparedPhoto,
  newCode: () => string = () => crypto.randomUUID(),
): Promise<UploadResult> {
  try {
    const storage = getSupabase().storage.from(PHOTO_BUCKET);
    const code = newCode();
    const contentType = photo.ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const pathFor = (width: number) => `${PHOTO_FOLDER}/${variantName(code, width, photo.ext)}`;

    // Os bytes direto, com tipo e cache nos cabeçalhos (sem formulário multipart).
    const results = await Promise.all(
      photo.variants.map(async (variant) =>
        storage.upload(pathFor(variant.width), await variant.blob.arrayBuffer(), {
          contentType,
          cacheControl: ONE_YEAR_SECONDS,
          upsert: false,
        }),
      ),
    );

    // Uma versão que falha derruba o envio todo; as que subiram ficam sem uso (decisão 3).
    const failed = results.find((result) => result.error);
    if (failed?.error) return { ok: false, kind: classify(failed.error) };

    const { publicUrl } = storage.getPublicUrl(pathFor(photo.width)).data;
    return { ok: true, src: publicUrl, width: photo.width, height: photo.height };
  } catch (error) {
    return { ok: false, kind: classify(error) };
  }
}
