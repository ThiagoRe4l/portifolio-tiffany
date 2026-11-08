// @vitest-environment node
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../tests/setup/msw';
import { defaultContent } from './defaults';
import { loadContent, type LoadEnv } from './load';

// T06 — leitura do conteúdo no build (spec 001, RF-09 / RF-10; CA-09 e CA-10).
// O Supabase é simulado pelo MSW; nenhum teste acessa o banco real.

const SUPABASE_URL = 'https://projeto-teste.supabase.co';
const ENDPOINT = `${SUPABASE_URL}/rest/v1/site_content`;
const ENV: LoadEnv = { VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: 'chave-anon' };
const REQUIRED: LoadEnv = { ...ENV, REQUIRE_REMOTE_CONTENT: 'true' };
const NOW = new Date('2027-03-10T12:00:00Z');

type Row = { section: string; data: unknown };

function respondWith(rows: Row[]) {
  const requests: Request[] = [];
  server.use(
    http.get(ENDPOINT, ({ request }) => {
      requests.push(request.clone());
      return HttpResponse.json(rows);
    }),
  );
  return requests;
}

function failTimes(count: number, then: Row[] = []) {
  let calls = 0;
  server.use(
    http.get(ENDPOINT, () => {
      calls += 1;
      if (calls <= count) return new HttpResponse('erro', { status: 500 });
      return HttpResponse.json(then);
    }),
  );
  return () => calls;
}

const load = (env: LoadEnv) => loadContent({ env, now: NOW, retryDelayMs: 0 });

const sectionWithTitle = (title: string): Row => ({
  section: 'inicio',
  data: { ...defaultContent.inicio, title },
});

describe('sem Supabase configurado', () => {
  it('usa o conteúdo padrão e avisa', async () => {
    const result = await load({});

    expect(result.source).toBe('defaults');
    expect(result.content.inicio.title).toBe(defaultContent.inicio.title);
    expect(result.warnings).toContainEqual(expect.stringMatching(/Supabase não configurado/));
  });

  it('com REQUIRE_REMOTE_CONTENT=true, falha', async () => {
    await expect(load({ REQUIRE_REMOTE_CONTENT: 'true' })).rejects.toThrow(
      /REQUIRE_REMOTE_CONTENT.*VITE_SUPABASE_URL/s,
    );
  });

  it('com só uma das variáveis, falha (configuração pela metade)', async () => {
    await expect(load({ VITE_SUPABASE_URL: SUPABASE_URL })).rejects.toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    );
    await expect(load({ VITE_SUPABASE_ANON_KEY: 'chave' })).rejects.toThrow(/VITE_SUPABASE_URL/);
  });

  it('com URL inválida, falha', async () => {
    await expect(load({ ...ENV, VITE_SUPABASE_URL: 'projeto.supabase' })).rejects.toThrow(
      /VITE_SUPABASE_URL inválida/,
    );
  });
});

describe('com Supabase', () => {
  it('lê a tabela com a chave pública no header apikey', async () => {
    const requests = respondWith([]);

    await load(ENV);

    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe('/rest/v1/site_content');
    expect(url.searchParams.get('select')).toBe('section,data');
    expect(requests[0]!.headers.get('apikey')).toBe('chave-anon');
  });

  it('aceita URL com barra no fim', async () => {
    const requests = respondWith([]);

    await load({ ...ENV, VITE_SUPABASE_URL: `${SUPABASE_URL}/` });

    expect(requests).toHaveLength(1);
  });

  it('usa a seção do banco e o padrão nas outras', async () => {
    respondWith([sectionWithTitle('Título vindo do banco')]);

    const result = await load(ENV);

    expect(result.source).toBe('supabase');
    expect(result.content.inicio.title).toBe('Título vindo do banco');
    expect(result.content.contato).toEqual(defaultContent.contato);
  });

  it('seção sem linha no banco: sem aviso no dev, com aviso na hospedagem', async () => {
    respondWith([sectionWithTitle('x')]);
    expect((await load(ENV)).warnings).toEqual([]);

    respondWith([sectionWithTitle('x')]);
    const { warnings } = await load(REQUIRED);
    expect(warnings).toContainEqual(expect.stringMatching(/sem linha no banco.*geral/s));
    expect(warnings.join('\n')).not.toMatch(/sem linha no banco[^\n]*inicio/);
  });

  it('seção desconhecida no banco é ignorada com aviso', async () => {
    respondWith([{ section: 'depoimentos', data: {} }]);

    const { warnings } = await load(ENV);

    expect(warnings).toContainEqual(expect.stringMatching(/desconhecida.*depoimentos/s));
  });
});

describe('falhas de rede e de resposta', () => {
  it('erro 500 uma vez: tenta de novo e usa o banco', async () => {
    const calls = failTimes(1, [sectionWithTitle('Depois da nova tentativa')]);

    const result = await load(ENV);

    expect(calls()).toBe(2);
    expect(result.content.inicio.title).toBe('Depois da nova tentativa');
  });

  it('erro 500 duas vezes: usa o padrão com aviso', async () => {
    const calls = failTimes(2);

    const result = await load(ENV);

    expect(calls()).toBe(2);
    expect(result.source).toBe('defaults');
    expect(result.warnings).toContainEqual(expect.stringMatching(/500.*conteúdo padrão/s));
  });

  it('erro 500 duas vezes com REQUIRE_REMOTE_CONTENT=true: falha', async () => {
    failTimes(2);

    await expect(load(REQUIRED)).rejects.toThrow(/Supabase.*500/s);
  });

  it('erro de rede com REQUIRE_REMOTE_CONTENT=true: falha', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.error()));

    await expect(load(REQUIRED)).rejects.toThrow(/Supabase/);
  });

  it('demora além do limite conta como falha', async () => {
    server.use(
      http.get(ENDPOINT, async () => {
        await delay('infinite');
        return HttpResponse.json([]);
      }),
    );

    await expect(
      loadContent({ env: REQUIRED, now: NOW, retryDelayMs: 0, timeoutMs: 50 }),
    ).rejects.toThrow(/Supabase/);
  });

  it('resposta que não é lista: falha com REQUIRE_REMOTE_CONTENT=true', async () => {
    server.use(http.get(ENDPOINT, () => HttpResponse.json({ message: 'oops' })));

    await expect(load(REQUIRED)).rejects.toThrow(/resposta inesperada/);
  });
});

describe('validação (CA-10)', () => {
  it('seção inválida falha o build citando seção e campo', async () => {
    respondWith([
      {
        section: 'contato',
        data: {
          ...defaultContent.contato,
          whatsapp: { ...defaultContent.contato.whatsapp, number: '11999998888' },
        },
      },
    ]);

    await expect(load(ENV)).rejects.toThrow(
      /contato › whatsapp › number: Inclua 55 \+ DDD \(só números\)/,
    );
  });

  it('chave desconhecida dentro de uma seção falha (pega erro de digitação)', async () => {
    respondWith([{ section: 'inicio', data: { ...defaultContent.inicio, titel: 'x' } }]);

    await expect(load(ENV)).rejects.toThrow(/inicio/);
  });

  it('campo novo que ainda não está no banco recebe o padrão', async () => {
    const { badge: _badge, ...withoutBadge } = defaultContent.inicio;
    void _badge;
    respondWith([{ section: 'inicio', data: { ...withoutBadge, title: 'Do banco' } }]);

    const { content } = await load(ENV);

    expect(content.inicio.title).toBe('Do banco');
    expect(content.inicio.badge).toEqual(defaultContent.inicio.badge);
  });

  it('listas do banco não são mescladas com as do padrão', async () => {
    respondWith([
      {
        section: 'atuacao',
        data: { ...defaultContent.atuacao, focusTags: ['Só uma etiqueta'] },
      },
    ]);

    const { content } = await load(ENV);

    expect(content.atuacao.focusTags).toEqual(['Só uma etiqueta']);
  });
});

describe('ajustes finais', () => {
  it('{ano} vira o ano do build', async () => {
    const { content } = await load({});

    expect(content.geral.copyright).toBe('© 2027 · Todos os direitos reservados');
  });

  it('placeholders restantes: aviso na hospedagem, listando os campos', async () => {
    respondWith([]);

    const { warnings } = await load(REQUIRED);
    const warning = warnings.find((w) => /placeholder/i.test(w)) ?? '';

    expect(warning).toMatch(/geral\.name/);
    expect(warning).toMatch(/geral\.initials/);
    expect(warning).toMatch(/contato\.whatsapp\.number/);
    expect(warning).toMatch(/contato\.text/);
  });

  it('placeholders no dev não geram aviso', async () => {
    const { warnings } = await load({});

    expect(warnings.some((w) => /placeholder/i.test(w))).toBe(false);
  });

  it('não altera o conteúdo padrão', async () => {
    respondWith([sectionWithTitle('Outro')]);

    await load(ENV);

    expect(defaultContent.inicio.title).toBe(
      'Cada criança no seu tempo, com acolhimento e ciência.',
    );
    expect(defaultContent.geral.copyright).toBe('© {ano} · Todos os direitos reservados');
  });
});
