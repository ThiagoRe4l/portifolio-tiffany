import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { EMBEDDED_CONTENT_ID } from '@/content/embedded';
import { renderSite } from '@/app/renderSite';
import { fromRoot } from '../../tests/support/paths';
import { injectIntoTemplate } from './html';
import { prerender, type PrerenderEnv } from './prerender';

// T08 — pré-renderização em memória (spec 001, RF-11, RF-15, RF-16; CA-11, CA-15, CA-16).
// Usa o index.html real como template. O Supabase é simulado por um `fetch` injetado
// (no ambiente jsdom, o AbortSignal do jsdom não é aceito pelo fetch do Node).

const TEMPLATE = readFileSync(fromRoot('index.html'), 'utf8');
const SITE_URL = 'https://psicologa-exemplo.com.br';
const NOW = new Date('2027-05-01T12:00:00Z');
const SUPABASE: PrerenderEnv = {
  VITE_SUPABASE_URL: 'https://projeto-teste.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-anon',
};

function fakeFetch(respond: () => Response): typeof fetch {
  return (async () => respond()) as typeof fetch;
}

const run = (env: PrerenderEnv, fetcher?: typeof globalThis.fetch) =>
  prerender({ env, template: TEMPLATE, now: NOW, retryDelayMs: 0, fetch: fetcher });

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('index.html do template', () => {
  it('tem os três marcadores e nenhum <title> fixo', () => {
    expect(TEMPLATE).toContain('<!--app-head-->');
    expect(TEMPLATE).toMatch(/<div id="root"><!--app-html--><\/div>/);
    expect(TEMPLATE).toContain('<!--app-data-->');
    expect(TEMPLATE).not.toMatch(/<title>/);
  });
});

describe('injectIntoTemplate', () => {
  const template =
    '<head><!--app-head--></head><div id="root"><!--app-html--></div><!--app-data-->';

  it('troca os três marcadores', () => {
    expect(injectIntoTemplate(template, { head: 'H', html: 'B', data: 'D' })).toBe(
      '<head>H</head><div id="root">B</div>D',
    );
  });

  it('não interpreta $& e $1 no conteúdo como padrões de substituição', () => {
    expect(injectIntoTemplate(template, { head: '$&', html: '$1', data: "$'" })).toBe(
      '<head>$&</head><div id="root">$1</div>$\'',
    );
  });

  it('falha se faltar um marcador', () => {
    expect(() =>
      injectIntoTemplate('<div id="root"><!--app-html--></div><!--app-data-->', {
        head: '',
        html: '',
        data: '',
      }),
    ).toThrow(/<!--app-head-->/);
  });
});

describe('renderSite', () => {
  it('renderiza o site a partir do conteúdo', () => {
    expect(renderSite(defaultContent)).toContain('<main');
  });
});

describe('prerender sem Supabase', () => {
  it('gera index, admin, robots e _redirects; sitemap só com SITE_URL', async () => {
    const withoutUrl = await run({});
    const withUrl = await run({ SITE_URL });

    expect(Object.keys(withoutUrl.files).sort()).toEqual(
      ['_redirects', 'admin.html', 'index.html', 'robots.txt'].sort(),
    );
    expect(Object.keys(withUrl.files).sort()).toEqual(
      ['_redirects', 'admin.html', 'index.html', 'robots.txt', 'sitemap.xml'].sort(),
    );
    expect(withUrl.files['robots.txt']).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(withUrl.files['_redirects']).toBe('/admin/* /admin.html 200\n');
  });

  it('repassa os avisos da leitura do conteúdo', async () => {
    const { warnings, source } = await run({});

    expect(source).toBe('defaults');
    expect(warnings).toContainEqual(expect.stringMatching(/Supabase não configurado/));
  });
});

describe('index.html gerado', async () => {
  const { files } = await run({ SITE_URL });
  const html = files['index.html'] ?? '';
  const doc = parse(html);

  it('não sobra nenhum marcador', () => {
    expect(html).not.toContain('<!--app-');
  });

  it('tem um único <title>, a descrição e o canonical', () => {
    expect(doc.querySelectorAll('title')).toHaveLength(1);
    expect(doc.title).toBe(defaultContent.geral.seoTitle);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      defaultContent.geral.seoDescription,
    );
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/`);
  });

  it('tem o JSON-LD e o conteúdo embutido, com {ano} resolvido', () => {
    const jsonLd = doc.querySelector('script[type="application/ld+json"]');
    const embedded = doc.getElementById(EMBEDDED_CONTENT_ID);

    expect(JSON.parse(jsonLd?.textContent ?? '')['@type']).toBe('Psychologist');
    expect(embedded?.getAttribute('type')).toBe('application/json');
    const content = JSON.parse(embedded?.textContent ?? '');
    expect(content.geral.copyright).toBe('© 2027 · Todos os direitos reservados');
    expect(content.inicio).toEqual(defaultContent.inicio);
  });

  it('o #root traz o HTML do site', () => {
    expect(doc.getElementById('root')?.innerHTML).toBe(
      renderSite(JSON.parse(doc.getElementById(EMBEDDED_CONTENT_ID)?.textContent ?? '')),
    );
    expect(doc.querySelector('#root > main')).not.toBeNull();
  });

  it('mantém o que vinha do template (idioma, preload, script do app)', () => {
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(doc.querySelectorAll('link[rel="preload"][as="font"]')).toHaveLength(2);
    expect(doc.querySelector('script[type="module"][src="/src/app/main.tsx"]')).not.toBeNull();
    expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
  });
});

describe('admin.html gerado', async () => {
  const { files } = await run({ SITE_URL });
  const html = files['admin.html'] ?? '';
  const doc = parse(html);

  it('tem noindex e título do admin, sem marcadores', () => {
    expect(html).not.toContain('<!--app-');
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    expect(doc.title).toBe('Área administrativa · Editar site');
  });

  it('não traz conteúdo do site, JSON-LD nem HTML no #root', () => {
    expect(doc.getElementById(EMBEDDED_CONTENT_ID)).toBeNull();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(doc.getElementById('root')?.innerHTML).toBe('');
    expect(html).not.toContain(defaultContent.geral.seoDescription);
  });

  it('mantém o script do app (que carrega o admin sob demanda)', () => {
    expect(doc.querySelector('script[type="module"][src="/src/app/main.tsx"]')).not.toBeNull();
  });
});

describe('prerender com Supabase', () => {
  it('o conteúdo do banco chega ao index.html', async () => {
    const rows = [
      { section: 'geral', data: { ...defaultContent.geral, seoTitle: 'Título do banco' } },
      { section: 'inicio', data: { ...defaultContent.inicio, title: 'Hero do banco' } },
    ];
    const { files, source } = await run(
      SUPABASE,
      fakeFetch(() => Response.json(rows)),
    );
    const doc = parse(files['index.html'] ?? '');
    const embedded = JSON.parse(doc.getElementById(EMBEDDED_CONTENT_ID)?.textContent ?? '');

    expect(source).toBe('supabase');
    expect(doc.title).toBe('Título do banco');
    expect(embedded.inicio.title).toBe('Hero do banco');
  });

  it('erro com REQUIRE_REMOTE_CONTENT=true rejeita sem devolver arquivos', async () => {
    const failing = fakeFetch(() => new Response('erro', { status: 503 }));

    await expect(run({ ...SUPABASE, REQUIRE_REMOTE_CONTENT: 'true' }, failing)).rejects.toThrow(
      /Supabase.*503/s,
    );
  });

  it('SITE_URL inválida rejeita', async () => {
    await expect(run({ SITE_URL: 'psicologa.com' })).rejects.toThrow(/SITE_URL inválida/);
  });
});
