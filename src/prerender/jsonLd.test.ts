import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { buildJsonLd, renderJsonLdScript } from './jsonLd';

// T07 — dados estruturados (spec 001, RF-20 / CA-20): só dados que já aparecem no site.

const SITE_URL = 'https://psicologa-exemplo.com.br';

describe('buildJsonLd', () => {
  it('monta o tipo Psychologist com os valores do conteúdo', () => {
    const content = makeUniqueContent();
    const { geral, contato } = content;

    expect(buildJsonLd(content, SITE_URL)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Psychologist',
      name: geral.name,
      description: geral.seoDescription,
      identifier: geral.crp,
      url: `${SITE_URL}/`,
      image: geral.shareImage.src,
      telephone: `+${contato.phone.number}`,
      email: contato.email.address,
      sameAs: [`https://www.instagram.com/${contato.instagram.handle}`],
      address: { '@type': 'PostalAddress', streetAddress: contato.address.text },
      openingHours: contato.hours.text,
    });
  });

  it('campos vazios ficam de fora; url só com SITE_URL', () => {
    const data = buildJsonLd(defaultContent);

    for (const key of ['url', 'image', 'telephone', 'email', 'sameAs']) {
      expect(data).not.toHaveProperty(key);
    }
    expect(data).toMatchObject({ '@type': 'Psychologist', name: defaultContent.geral.name });
  });

  it('não expõe o número do WhatsApp (ele não aparece como texto no site)', () => {
    const content = makeUniqueContent();

    expect(JSON.stringify(buildJsonLd(content, SITE_URL))).not.toContain(
      content.contato.whatsapp.number,
    );
  });
});

describe('renderJsonLdScript', () => {
  it('gera um <script type="application/ld+json"> com JSON válido', () => {
    const content = makeUniqueContent();
    const doc = new DOMParser().parseFromString(
      `<html><head>${renderJsonLdScript(content, SITE_URL)}</head></html>`,
      'text/html',
    );
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]?.textContent ?? '')).toEqual(buildJsonLd(content, SITE_URL));
  });

  it('um texto com </script> não fecha a tag', () => {
    const content = makeUniqueContent();
    content.geral.name = '</script><script>alert(1)</script>';
    const html = renderJsonLdScript(content, SITE_URL);
    const doc = new DOMParser().parseFromString(`<html><head>${html}</head></html>`, 'text/html');

    expect(doc.querySelectorAll('script')).toHaveLength(1);
    expect(JSON.parse(doc.querySelector('script')?.textContent ?? '').name).toBe(
      content.geral.name,
    );
  });
});
