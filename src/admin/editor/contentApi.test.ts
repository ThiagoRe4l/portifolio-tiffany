import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { SECTION_KEYS } from '@/content/schema';
import { server } from '../../../tests/setup/msw';
import { REST_URL } from '../../../tests/support/supabaseAuth';
import { loadSections, saveSection, type SaveErrorKind } from './contentApi';

// Spec 004, T03 (D4; RF-14, RF-17, RF-21). SDK de verdade; só a rede é simulada.

const URL_ = `${REST_URL}/site_content`;
const STAMP = '2026-11-10T14:32:05.123456+00:00';
const NEW_STAMP = '2026-11-10T15:00:00.654321+00:00';

let requests: Request[] = [];
let bodies: unknown[] = [];

function respond(method: 'get' | 'patch' | 'post', response: () => Response) {
  server.use(
    http[method](URL_, async ({ request }) => {
      requests.push(request.clone());
      bodies.push(method === 'get' ? null : await request.clone().json());
      return response();
    }),
  );
}

const pgError = (status: number, code: string) =>
  HttpResponse.json(
    { code, message: `server text ${code}`, details: null, hint: null },
    { status },
  );

beforeEach(() => {
  requests = [];
  bodies = [];
});

describe('loadSections', () => {
  it('lê só as colunas necessárias e devolve as 8 seções', async () => {
    respond('get', () =>
      HttpResponse.json([{ section: 'inicio', data: defaultContent.inicio, updated_at: STAMP }]),
    );

    const result = await loadSections();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.sections).sort()).toEqual([...SECTION_KEYS].sort());
    expect(new URL(requests[0]?.url ?? '').searchParams.get('select')).toBe(
      'section,data,updated_at',
    );
  });

  it('seção com linha: o conteúdo e a data; sem linha: o padrão e data vazia', async () => {
    const custom = { ...defaultContent.inicio, title: 'Título salvo' };
    respond('get', () =>
      HttpResponse.json([{ section: 'inicio', data: custom, updated_at: STAMP }]),
    );

    const result = await loadSections();

    if (!result.ok) throw new Error('esperava sucesso');
    expect(result.sections.inicio).toEqual({ data: custom, updatedAt: STAMP });
    expect(result.sections.contato).toEqual({ data: defaultContent.contato, updatedAt: null });
  });

  it('formato antigo (campo novo no schema): completa com o padrão', async () => {
    const old: Record<string, unknown> = { ...defaultContent.inicio };
    delete old.badge;
    respond('get', () => HttpResponse.json([{ section: 'inicio', data: old, updated_at: STAMP }]));

    const result = await loadSections();

    if (!result.ok) throw new Error('esperava sucesso');
    expect(result.sections.inicio.data).toEqual(defaultContent.inicio);
  });

  it('linha de uma seção que não existe mais é ignorada', async () => {
    respond('get', () => HttpResponse.json([{ section: 'antiga', data: {}, updated_at: STAMP }]));

    const result = await loadSections();

    expect(result.ok && 'antiga' in result.sections).toBe(false);
  });

  it.each<[string, () => Response, SaveErrorKind]>([
    ['erro 500', () => pgError(500, 'XX000'), 'unavailable'],
    ['serviço iniciando (503)', () => pgError(503, 'PGRST002'), 'unavailable'],
    ['sem rede', () => HttpResponse.error(), 'network'],
  ])('%s: falha, sem repetir sozinho', async (_name, response, kind) => {
    respond('get', response);

    expect(await loadSections()).toEqual({ ok: false, kind });
    expect(requests).toHaveLength(1);
  });
});

describe('saveSection: seção que já tem linha', () => {
  it('atualiza só se a data for a mesma que ela abriu, e devolve a nova', async () => {
    respond('patch', () => HttpResponse.json([{ updated_at: NEW_STAMP }]));

    const result = await saveSection('inicio', defaultContent.inicio, STAMP);

    expect(result).toEqual({ ok: true, updatedAt: NEW_STAMP });
    const url = new URL(requests[0]?.url ?? '');
    expect(url.searchParams.get('section')).toBe('eq.inicio');
    expect(url.searchParams.get('updated_at')).toBe(`eq.${STAMP}`);
    expect(url.searchParams.get('select')).toBe('updated_at');
    expect(bodies[0]).toEqual({ data: defaultContent.inicio });
  });

  it('nenhuma linha atualizada: a seção mudou em outro lugar (conflito)', async () => {
    respond('patch', () => HttpResponse.json([]));

    expect(await saveSection('inicio', defaultContent.inicio, STAMP)).toEqual({
      ok: false,
      kind: 'conflict',
    });
  });
});

describe('saveSection: seção sem linha', () => {
  it('insere a seção, sem mandar data nem autor (o banco preenche)', async () => {
    respond('post', () => HttpResponse.json([{ updated_at: NEW_STAMP }], { status: 201 }));

    const result = await saveSection('contato', defaultContent.contato, null);

    expect(result).toEqual({ ok: true, updatedAt: NEW_STAMP });
    expect(bodies[0]).toEqual({ section: 'contato', data: defaultContent.contato });
    // Insert puro: um upsert sobrescreveria em silêncio a linha criada em outro aparelho.
    expect(requests[0]?.headers.get('prefer') ?? '').not.toMatch(/resolution=/);
    expect(new URL(requests[0]?.url ?? '').searchParams.has('on_conflict')).toBe(false);
  });

  it('outro aparelho criou a linha antes: conflito', async () => {
    respond('post', () => pgError(409, '23505'));

    expect(await saveSection('contato', defaultContent.contato, null)).toEqual({
      ok: false,
      kind: 'conflict',
    });
  });
});

describe('saveSection: falhas', () => {
  it.each<[string, () => Response, SaveErrorKind]>([
    ['sessão vencida', () => pgError(401, 'PGRST303'), 'sessionExpired'],
    ['token recusado', () => pgError(401, 'PGRST301'), 'sessionExpired'],
    [
      '401 sem código',
      () => HttpResponse.json({ message: 'x' }, { status: 401 }),
      'sessionExpired',
    ],
    ['conta sem permissão (RLS)', () => pgError(403, '42501'), 'forbidden'],
    ['erro 500', () => pgError(500, 'XX000'), 'unavailable'],
    ['sem rede', () => HttpResponse.error(), 'network'],
    ['outro erro', () => pgError(400, '22P02'), 'unknown'],
  ])('%s: classificado, sem texto do servidor', async (_name, response, kind) => {
    respond('patch', response);

    // toEqual exato: nenhum texto do servidor acompanha o resultado.
    expect(await saveSection('inicio', defaultContent.inicio, STAMP)).toEqual({ ok: false, kind });
    expect(requests).toHaveLength(1);
  });

  it('o corpo nunca leva updated_at nem updated_by', async () => {
    respond('patch', () => HttpResponse.json([{ updated_at: NEW_STAMP }]));
    respond('post', () => HttpResponse.json([{ updated_at: NEW_STAMP }], { status: 201 }));

    await saveSection('inicio', defaultContent.inicio, STAMP);
    await saveSection('contato', defaultContent.contato, null);

    for (const body of bodies) {
      expect(body).not.toHaveProperty('updated_at');
      expect(body).not.toHaveProperty('updated_by');
    }
  });
});
