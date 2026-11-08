// @vitest-environment node
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { http, HttpResponse } from 'msw';
import { createServer, createLogger, type Logger, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { contentDevPlugin, rewriteAdminPath } from '../../scripts/content-dev-plugin.ts';
import { server as msw } from '../setup/msw';
import { fromRoot } from '../support/paths';

// T10 — conteúdo no `npm run dev` e reescrita do admin no `vite preview` (spec 001).
// O servidor Vite é criado no próprio teste, com env explícito: nunca lê o .env
// (que pode ter o Supabase real). Requisições sem handler são barradas pelo MSW.

const TEMPLATE = readFileSync(fromRoot('index.html'), 'utf8');
const SUPABASE_URL = 'https://projeto-dev.supabase.co';

const servers: ViteDevServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

function captureLogger(): { logger: Logger; warnings: string[] } {
  const warnings: string[] = [];
  const logger = createLogger('silent');
  logger.warn = (message) => {
    warnings.push(message);
  };
  return { logger, warnings };
}

async function devServer(env: Record<string, string> = {}, logger = createLogger('silent')) {
  const server = await createServer({
    configFile: false,
    root: fromRoot(),
    logLevel: 'silent',
    customLogger: logger,
    resolve: { alias: { '@': fromRoot('src') } },
    plugins: [react(), contentDevPlugin({ env })],
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  });
  servers.push(server);
  return server;
}

const parse = (html: string) => {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
  const root = /<div id="root">([\s\S]*?)<\/div>\s*<script id="site-content"/.exec(html)?.[1];
  return { title, root };
};

describe('rewriteAdminPath (preview, igual ao _redirects do Cloudflare)', () => {
  it.each(['/admin', '/admin/', '/admin/login', '/admin/login?x=1', '/admin/a/b'])(
    '%s → /admin.html',
    (url) => {
      expect(rewriteAdminPath(url)).toBe('/admin.html');
    },
  );

  it.each([
    '/',
    '/administrador',
    '/admin.html',
    '/assets/AdminApp-x.js',
    '/robots.txt',
    '/fonts/a.woff2',
  ])('%s fica intocado', (url) => {
    expect(rewriteAdminPath(url)).toBeUndefined();
  });
});

describe('npm run dev: HTML do site', () => {
  it('sem Supabase, injeta head, HTML e conteúdo padrão, sem sobrar marcadores', async () => {
    const server = await devServer();

    const html = await server.transformIndexHtml('/', TEMPLATE);
    const { title, root } = parse(html);

    expect(html).not.toContain('<!--app-');
    expect(title).toBe(defaultContent.geral.seoTitle);
    expect(html).toContain('<script id="site-content" type="application/json">');
    expect(html).toContain('<script type="application/ld+json">');
    expect(root).toMatch(/^<a [^>]*href="#conteudo"/);
    expect(root).toContain('<header');
    expect(root).toContain('<main');
    expect(html).toContain('/@vite/client');
  }, 30_000);

  it('com Supabase (simulado), mostra o conteúdo do banco', async () => {
    msw.use(
      http.get(`${SUPABASE_URL}/rest/v1/site_content`, () =>
        HttpResponse.json([
          {
            section: 'geral',
            data: { ...defaultContent.geral, seoTitle: 'Título do banco (dev)' },
          },
        ]),
      ),
    );
    const server = await devServer({
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: 'chave-anon',
    });

    const { title } = parse(await server.transformIndexHtml('/', TEMPLATE));

    expect(title).toBe('Título do banco (dev)');
  }, 30_000);

  it('conteúdo inválido no banco aparece como erro (overlay do Vite)', async () => {
    msw.use(
      http.get(`${SUPABASE_URL}/rest/v1/site_content`, () =>
        HttpResponse.json([{ section: 'geral', data: { ...defaultContent.geral, name: '' } }]),
      ),
    );
    const server = await devServer({
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: 'chave-anon',
    });

    await expect(server.transformIndexHtml('/', TEMPLATE)).rejects.toThrow(
      /geral › name: Campo obrigatório/,
    );
  }, 30_000);

  it('avisos aparecem no terminal uma vez, não a cada recarga', async () => {
    const { logger, warnings } = captureLogger();
    const server = await devServer({}, logger);

    await server.transformIndexHtml('/', TEMPLATE);
    await server.transformIndexHtml('/', TEMPLATE);

    expect(warnings.filter((w) => /Supabase não configurado/.test(w))).toHaveLength(1);
  }, 30_000);
});

describe('npm run dev: HTML do admin', () => {
  it.each(['/admin', '/admin/login'])(
    '%s tem noindex e nada do conteúdo do site',
    async (url) => {
      const server = await devServer();

      const html = await server.transformIndexHtml(url, TEMPLATE);

      expect(html).not.toContain('<!--app-');
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(html).not.toContain('id="site-content"');
      expect(html).toMatch(/<div id="root"><\/div>/);
    },
    30_000,
  );
});

describe('fora do dev', () => {
  it('no build, o plugin não mexe no HTML (quem preenche é a pré-renderização)', async () => {
    const plugin = contentDevPlugin({ env: {} });
    const hook = plugin.transformIndexHtml as unknown as {
      handler: (html: string, ctx: Record<string, unknown>) => unknown;
    };

    const result = await hook.handler(TEMPLATE, { path: '/index.html', filename: 'index.html' });

    expect(result ?? TEMPLATE).toBe(TEMPLATE);
  });
});
