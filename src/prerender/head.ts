import type { SiteContent } from '@/content/types';
import { normalizeSiteUrl } from './files';
import { escapeHtml } from './html';

/**
 * Tags do <head> geradas no build (spec 001, RF-15 / RF-16). Tudo vem de `geral`;
 * o que depende do domínio (url, canonical) só existe com `SITE_URL`.
 */

const metaName = (name: string, content: string) =>
  `<meta name="${name}" content="${escapeHtml(content)}" />`;
const metaProperty = (property: string, content: string) =>
  `<meta property="${property}" content="${escapeHtml(content)}" />`;

export function renderSiteHead(content: SiteContent, siteUrl?: string): string {
  const { seoTitle, seoDescription, shareImage } = content.geral;
  const home = siteUrl ? `${normalizeSiteUrl(siteUrl)}/` : undefined;
  const hasImage = shareImage.src !== '';

  const tags = [
    `<title>${escapeHtml(seoTitle)}</title>`,
    metaName('description', seoDescription),
    metaProperty('og:type', 'website'),
    metaProperty('og:locale', 'pt_BR'),
    metaProperty('og:title', seoTitle),
    metaProperty('og:description', seoDescription),
  ];
  if (home) tags.push(metaProperty('og:url', home));
  if (hasImage) {
    tags.push(
      metaProperty('og:image', shareImage.src),
      metaProperty('og:image:width', String(shareImage.width)),
      metaProperty('og:image:height', String(shareImage.height)),
      metaProperty('og:image:alt', shareImage.alt),
    );
  }
  tags.push(
    metaName('twitter:card', hasImage ? 'summary_large_image' : 'summary'),
    metaName('twitter:title', seoTitle),
    metaName('twitter:description', seoDescription),
  );
  if (home) tags.push(`<link rel="canonical" href="${escapeHtml(home)}" />`);

  return tags.join('\n    ');
}

/** Head das páginas do admin: título próprio e fora dos buscadores. */
export function renderAdminHead(): string {
  return [
    '<title>Área administrativa · Editar site</title>',
    metaName('robots', 'noindex, nofollow'),
  ].join('\n    ');
}
