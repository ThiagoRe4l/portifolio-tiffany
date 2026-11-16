import type { SiteContent } from '@/content/types';
import { parseVariant, variantName, variantUrl, variantWidths } from '@/lib/image';

/**
 * Cópia das fotos para dentro do site publicado (spec 005, D6; decisão 1 do Gate 1).
 * O visitante baixa as fotos do próprio Cloudflare: continuam no ar mesmo com o
 * Supabase pausado e não gastam a banda gratuita dele.
 */

export const PHOTOS_DIR = 'fotos';
const BUCKET_PATH = '/storage/v1/object/public/site-photos/';
const TIMEOUT_MS = 15_000;

export type MirrorOptions = {
  supabaseUrl: string;
  fetch: typeof fetch;
  /** Produção (`REQUIRE_REMOTE_CONTENT=true`): foto que não baixa derruba o build. */
  required: boolean;
};

export type MirrorResult = {
  content: SiteContent;
  /** Caminho dentro do dist (`fotos/<arquivo>`) → bytes. */
  files: Record<string, Uint8Array>;
  warnings: string[];
};

type PhotoLike = { src: string; width: number; height: number; alt: string };

function isPhoto(value: unknown): value is PhotoLike {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.src === 'string' &&
    typeof record.width === 'number' &&
    typeof record.height === 'number' &&
    typeof record.alt === 'string'
  );
}

function collectSources(value: unknown, found: Set<string>): void {
  if (isPhoto(value)) {
    found.add(value.src);
  } else if (Array.isArray(value)) {
    for (const item of value) collectSources(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) collectSources(child, found);
  }
}

function replaceSources(value: unknown, mapping: ReadonlyMap<string, string>): unknown {
  if (isPhoto(value)) {
    const next = mapping.get(value.src);
    return next ? { ...value, src: next } : value;
  }
  if (Array.isArray(value)) return value.map((item) => replaceSources(item, mapping));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceSources(child, mapping)]),
    );
  }
  return value;
}

async function download(fetcher: typeof fetch, url: string): Promise<Uint8Array> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function mirrorPhotos(
  content: SiteContent,
  options: MirrorOptions,
): Promise<MirrorResult> {
  const base = options.supabaseUrl.trim().replace(/\/+$/, '');
  if (!base) return { content, files: {}, warnings: [] };
  const bucketPrefix = `${base}${BUCKET_PATH}`;

  const sources = new Set<string>();
  collectSources(content, sources);

  const files: Record<string, Uint8Array> = {};
  const mapping = new Map<string, string>();
  const warnings: string[] = [];

  for (const src of sources) {
    const variant = src.startsWith(bucketPrefix) ? parseVariant(src) : null;
    if (!variant) continue;
    const name = variantName(variant.code, variant.width, variant.ext);

    try {
      // Uma foto só entra no site com todas as versões que o srcset vai pedir.
      const downloaded = await Promise.all(
        variantWidths(variant.width).map(async (width) => ({
          path: `${PHOTOS_DIR}/${variantName(variant.code, width, variant.ext)}`,
          bytes: await download(options.fetch, variantUrl(src, width)),
        })),
      );
      for (const { path, bytes } of downloaded) files[path] = bytes;
      mapping.set(src, `/${PHOTOS_DIR}/${name}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `Falha ao copiar a foto ${name}: ${reason}`;
      if (options.required) throw new Error(message, { cause: error });
      warnings.push(`${message}. Mantido o endereço do Supabase.`);
    }
  }

  return { content: replaceSources(content, mapping) as SiteContent, files, warnings };
}
