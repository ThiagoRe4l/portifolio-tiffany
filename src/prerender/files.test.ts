import { describe, expect, it } from 'vitest';
import { normalizeSiteUrl, REDIRECTS, robotsTxt, sitemapXml } from './files';
import { escapeHtml } from './html';

// T07 — arquivos para robôs e hospedagem (spec 001, RF-16 / CA-16) e utilitários.

const SITE_URL = 'https://psicologa-exemplo.com.br';

describe('normalizeSiteUrl', () => {
  it('remove a barra final e aceita só http(s)', () => {
    expect(normalizeSiteUrl(`${SITE_URL}/`)).toBe(SITE_URL);
    expect(normalizeSiteUrl(`  ${SITE_URL}  `)).toBe(SITE_URL);
    expect(normalizeSiteUrl('http://localhost:4173')).toBe('http://localhost:4173');
    expect(() => normalizeSiteUrl('psicologa.com')).toThrow(/SITE_URL inválida/);
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow(/SITE_URL inválida/);
  });
});

describe('robotsTxt', () => {
  it('bloqueia /admin para todos os robôs', () => {
    expect(robotsTxt().split('\n')).toEqual(['User-agent: *', 'Disallow: /admin', '']);
  });

  it('com SITE_URL, aponta o sitemap', () => {
    expect(robotsTxt(SITE_URL)).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(robotsTxt(`${SITE_URL}/`)).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('sitemapXml', () => {
  it('é XML válido com a página inicial', () => {
    const xml = sitemapXml(SITE_URL);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect([...doc.getElementsByTagName('loc')].map((loc) => loc.textContent)).toEqual([
      `${SITE_URL}/`,
    ]);
  });
});

describe('REDIRECTS (_redirects do Cloudflare)', () => {
  it('serve o admin para qualquer rota /admin/*', () => {
    expect(REDIRECTS).toBe('/admin/* /admin.html 200\n');
  });
});

describe('escapeHtml', () => {
  it('escapa os caracteres especiais de HTML e atributos', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
  });

  it('texto comum sai igual', () => {
    expect(escapeHtml('Olá, eu sou a Ana · CRP 06/123')).toBe('Olá, eu sou a Ana · CRP 06/123');
  });
});
