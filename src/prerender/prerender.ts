import { renderSite } from '@/app/renderSite';
import { serializeEmbeddedContent, EMBEDDED_CONTENT_ID } from '@/content/embedded';
import { loadContent, type LoadEnv, type LoadResult } from '@/content/load';
import { REDIRECTS, robotsTxt, sitemapXml } from './files';
import { renderAdminHead, renderSiteHead } from './head';
import { injectIntoTemplate } from './html';
import { renderJsonLdScript } from './jsonLd';
import { mirrorPhotos } from './photos';

/**
 * Pré-renderização em memória (spec 001, RF-11 / RF-15 / RF-16 / RF-20): lê o
 * conteúdo e devolve os arquivos do build, sem acessar o disco. Quem grava é o
 * scripts/prerender.ts.
 */

export type PrerenderEnv = LoadEnv & { SITE_URL?: string };

export type PrerenderOptions = {
  env: PrerenderEnv;
  template: string;
  now?: Date;
  fetch?: typeof fetch;
  retryDelayMs?: number;
};

export type PrerenderResult = {
  files: Record<string, string>;
  /** Fotos copiadas do Supabase (spec 005): `fotos/<arquivo>` → bytes. */
  binaryFiles: Record<string, Uint8Array>;
  warnings: string[];
  source: LoadResult['source'];
};

export async function prerender(options: PrerenderOptions): Promise<PrerenderResult> {
  const { env, template } = options;
  const siteUrl = env.SITE_URL?.trim() || undefined;

  const loaded = await loadContent({
    env,
    now: options.now,
    fetch: options.fetch,
    retryDelayMs: options.retryDelayMs,
  });

  // Spec 005: as fotos do bucket passam a ser servidas pelo próprio site.
  const mirrored = await mirrorPhotos(loaded.content, {
    supabaseUrl: env.VITE_SUPABASE_URL ?? '',
    fetch: options.fetch ?? globalThis.fetch,
    required: env.REQUIRE_REMOTE_CONTENT === 'true',
  });
  const { content } = mirrored;
  const { source } = loaded;
  const warnings = [...loaded.warnings, ...mirrored.warnings];

  const embedded = `<script id="${EMBEDDED_CONTENT_ID}" type="application/json">${serializeEmbeddedContent(content)}</script>`;

  const files: Record<string, string> = {
    'index.html': injectIntoTemplate(template, {
      head: `${renderSiteHead(content, siteUrl)}\n    ${renderJsonLdScript(content, siteUrl)}`,
      html: renderSite(content),
      data: embedded,
    }),
    'admin.html': injectIntoTemplate(template, { head: renderAdminHead(), html: '', data: '' }),
    'robots.txt': robotsTxt(siteUrl),
    _redirects: REDIRECTS,
  };
  if (siteUrl) files['sitemap.xml'] = sitemapXml(siteUrl);

  return { files, binaryFiles: mirrored.files, warnings, source };
}
