/**
 * Arquivos gerados no build para robôs e para a hospedagem (spec 001, RF-16).
 */

/** `SITE_URL` sem barra final; aceita só http(s). */
export function normalizeSiteUrl(siteUrl: string): string {
  const trimmed = siteUrl.trim();
  const valid = URL.canParse(trimmed) && ['http:', 'https:'].includes(new URL(trimmed).protocol);
  if (!valid) throw new Error(`SITE_URL inválida: ${JSON.stringify(siteUrl)}`);
  return trimmed.replace(/\/+$/, '');
}

export function robotsTxt(siteUrl?: string): string {
  const lines = ['User-agent: *', 'Disallow: /admin'];
  if (siteUrl) lines.push('', `Sitemap: ${normalizeSiteUrl(siteUrl)}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function sitemapXml(siteUrl: string): string {
  const home = `${normalizeSiteUrl(siteUrl)}/`.replace(/&/g, '&amp;');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${home}</loc></url>`,
    '</urlset>',
    '',
  ].join('\n');
}

/** `_redirects` do Cloudflare Pages: qualquer rota do admin serve o `admin.html`. */
export const REDIRECTS = '/admin/* /admin.html 200\n';
