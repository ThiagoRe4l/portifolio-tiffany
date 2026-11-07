import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { renderAdminHead, renderSiteHead } from './head';

// T07 — tags do <head> (spec 001, RF-15 / CA-15) e noindex do admin (RF-16 / CA-16).

const SITE_URL = 'https://psicologa-exemplo.com.br';

function parseHead(head: string): Document {
  return new DOMParser().parseFromString(
    `<html><head>${head}</head><body></body></html>`,
    'text/html',
  );
}

const meta = (doc: Document, selector: string) =>
  doc.querySelector(`meta[${selector}]`)?.getAttribute('content');

describe('renderSiteHead com SITE_URL', () => {
  const content = makeUniqueContent();
  const doc = parseHead(renderSiteHead(content, SITE_URL));
  const { seoTitle, seoDescription, shareImage } = content.geral;

  it('título e descrição vêm do conteúdo', () => {
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title).toBe(seoTitle);
    expect(meta(doc, 'name="description"')).toBe(seoDescription);
  });

  it('Open Graph completo', () => {
    expect(meta(doc, 'property="og:type"')).toBe('website');
    expect(meta(doc, 'property="og:locale"')).toBe('pt_BR');
    expect(meta(doc, 'property="og:title"')).toBe(seoTitle);
    expect(meta(doc, 'property="og:description"')).toBe(seoDescription);
    expect(meta(doc, 'property="og:url"')).toBe(`${SITE_URL}/`);
    expect(meta(doc, 'property="og:image"')).toBe(shareImage.src);
    expect(meta(doc, 'property="og:image:width"')).toBe(String(shareImage.width));
    expect(meta(doc, 'property="og:image:height"')).toBe(String(shareImage.height));
    expect(meta(doc, 'property="og:image:alt"')).toBe(shareImage.alt);
  });

  it('cartão do Twitter com imagem grande', () => {
    expect(meta(doc, 'name="twitter:card"')).toBe('summary_large_image');
    expect(meta(doc, 'name="twitter:title"')).toBe(seoTitle);
    expect(meta(doc, 'name="twitter:description"')).toBe(seoDescription);
  });

  it('canonical aponta para a raiz do site', () => {
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/`);
  });

  it('barra final do SITE_URL é normalizada', () => {
    const withSlash = parseHead(renderSiteHead(content, `${SITE_URL}/`));

    expect(withSlash.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE_URL}/`,
    );
  });

  it('SITE_URL inválida falha', () => {
    expect(() => renderSiteHead(content, 'psicologa-exemplo.com.br')).toThrow(/SITE_URL/);
    expect(() => renderSiteHead(content, 'ftp://psicologa-exemplo.com.br')).toThrow(/SITE_URL/);
  });
});

describe('renderSiteHead sem SITE_URL', () => {
  const content = makeUniqueContent();
  const doc = parseHead(renderSiteHead(content));

  it('omite url e canonical e mantém o resto', () => {
    expect(meta(doc, 'property="og:url"')).toBeUndefined();
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.title).toBe(content.geral.seoTitle);
    expect(meta(doc, 'property="og:title"')).toBe(content.geral.seoTitle);
    expect(meta(doc, 'property="og:image"')).toBe(content.geral.shareImage.src);
  });
});

describe('imagem de compartilhamento ausente', () => {
  it('omite as tags de imagem e usa o cartão simples', () => {
    const doc = parseHead(renderSiteHead(defaultContent, SITE_URL));

    expect(doc.querySelector('meta[property^="og:image"]')).toBeNull();
    expect(meta(doc, 'name="twitter:card"')).toBe('summary');
  });
});

describe('escape', () => {
  it('aspas, < e & no conteúdo não quebram as tags', () => {
    const content = makeUniqueContent();
    content.geral.seoTitle = 'Ana "A" <b>&</b> cia';
    content.geral.seoDescription = '"><script>alert(1)</script>';
    const head = renderSiteHead(content, SITE_URL);
    const doc = parseHead(head);

    expect(head).not.toContain('<b>');
    expect(head).not.toContain('<script>');
    expect(doc.title).toBe('Ana "A" <b>&</b> cia');
    expect(meta(doc, 'name="description"')).toBe('"><script>alert(1)</script>');
    expect(doc.querySelectorAll('script')).toHaveLength(0);
  });
});

describe('renderAdminHead', () => {
  it('tem noindex, nofollow e título próprio, sem nada do conteúdo', () => {
    const doc = parseHead(renderAdminHead());

    expect(meta(doc, 'name="robots"')).toBe('noindex, nofollow');
    expect(doc.title).toBe('Área administrativa · Editar site');
    expect(doc.querySelector('meta[property^="og:"]')).toBeNull();
  });

  it('o site público não tem noindex', () => {
    const doc = parseHead(renderSiteHead(makeUniqueContent(), SITE_URL));

    expect(meta(doc, 'name="robots"')).toBeUndefined();
  });
});
