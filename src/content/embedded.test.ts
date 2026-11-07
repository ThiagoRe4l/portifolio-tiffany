import { describe, expect, it } from 'vitest';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { EMBEDDED_CONTENT_ID, readEmbeddedContent, serializeEmbeddedContent } from './embedded';

// T05 — conteúdo embutido no HTML (spec 001, RF-12 e RNF de segurança).
// O teste passa o HTML pelo parser de verdade (DOMParser), que é onde um
// `</script>` no texto poderia fechar a tag antes da hora.

function pageWith(scriptBody: string, extra = ''): Document {
  const html = `<!doctype html><html><body><div id="root"></div>${extra}<script id="${EMBEDDED_CONTENT_ID}" type="application/json">${scriptBody}</script></body></html>`;
  return new DOMParser().parseFromString(html, 'text/html');
}

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
/** Caracteres que nunca podem sair crus dentro do <script>. */
const UNSAFE_IN_SCRIPT = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`);

const MALICIOUS = {
  closeScript: '</script><script>alert(1)</script>',
  comment: '<!-- <script> -->',
  entities: '&amp; &lt;b&gt; & "aspas" \'simples\'',
  separators: `linha${LINE_SEPARATOR}parágrafo${PARAGRAPH_SEPARATOR}fim`,
  html: '<img src=x onerror=alert(1)>',
};

describe('conteúdo embutido', () => {
  it('usa o id site-content', () => {
    expect(EMBEDDED_CONTENT_ID).toBe('site-content');
  });

  it('ida e volta pelo HTML devolve o mesmo conteúdo', () => {
    const content = makeUniqueContent();
    const doc = pageWith(serializeEmbeddedContent(content));

    expect(readEmbeddedContent(doc)).toEqual(content);
  });

  it('texto malicioso não aparece cru e volta idêntico', () => {
    const content = makeUniqueContent();
    content.inicio.title = MALICIOUS.closeScript;
    content.inicio.text = MALICIOUS.comment;
    content.sobre.text = MALICIOUS.entities;
    content.sobre.secondaryText = MALICIOUS.separators;
    content.contato.text = MALICIOUS.html;

    const serialized = serializeEmbeddedContent(content);

    expect(serialized).not.toMatch(UNSAFE_IN_SCRIPT);

    const doc = pageWith(serialized);
    expect(doc.querySelectorAll('script')).toHaveLength(1);
    expect(doc.querySelector('img')).toBeNull();
    expect(readEmbeddedContent(doc)).toEqual(content);
  });

  it('lê o documento global por padrão', () => {
    const content = makeUniqueContent();
    const script = document.createElement('script');
    script.id = EMBEDDED_CONTENT_ID;
    script.type = 'application/json';
    script.textContent = serializeEmbeddedContent(content);
    document.body.append(script);

    expect(readEmbeddedContent()).toEqual(content);
  });

  it('sem o bloco de conteúdo, falha com mensagem clara', () => {
    const doc = new DOMParser().parseFromString('<html><body></body></html>', 'text/html');

    expect(() => readEmbeddedContent(doc)).toThrow(/#site-content/);
  });

  it('com JSON corrompido, falha com mensagem clara', () => {
    expect(() => readEmbeddedContent(pageWith('{"geral": '))).toThrow(/Conteúdo embutido inválido/);
  });

  it('ignora outros scripts JSON da página (ex.: JSON-LD)', () => {
    const content = makeUniqueContent();
    const doc = pageWith(
      serializeEmbeddedContent(content),
      '<script type="application/ld+json">{"@type":"Psychologist"}</script>',
    );

    expect(readEmbeddedContent(doc)).toEqual(content);
  });
});
