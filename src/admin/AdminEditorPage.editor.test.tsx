import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';

// Spec 004, T06 (RF-01, RF-02, RF-04, RF-13 a RF-17, RF-21; CA-01, CA-02, CA-08, CA-10,
// CA-11, CA-15). Tela real, SDK real; só a rede é simulada.

const CONTENT_URL = `${REST_URL}/site_content`;
const STAMP = '2026-11-10T14:32:05.123456+00:00';
const NEW_STAMP = '2026-11-10T15:00:00.654321+00:00';

let rows: { section: string; data: unknown; updated_at: string }[] = [];
let writes: { method: string; url: URL; body: Record<string, unknown> }[] = [];

function respondWrite(response: () => Response | Promise<Response>) {
  const handler = async ({ request }: { request: Request }) => {
    writes.push({
      method: request.method,
      url: new URL(request.url),
      body: (await request.clone().json()) as Record<string, unknown>,
    });
    return response();
  };
  server.use(http.patch(CONTENT_URL, handler), http.post(CONTENT_URL, handler));
}

function renderEditor(path = '/admin') {
  const router = createMemoryRouter(adminRoutes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const field = (path: string) =>
  waitFor(() => {
    const element = document.querySelector<HTMLElement>(`[data-field-path="${path}"]`);
    if (!element) throw new Error(`campo ${path} não apareceu`);
    return element;
  });
const saveButton = () => screen.getByRole('button', { name: 'Salvar e publicar' });
const discardButton = () => screen.getByRole('button', { name: 'Descartar' });
const status = () =>
  screen.getByRole('banner').querySelector<HTMLElement>('[data-part="status"]') as HTMLElement;

beforeEach(() => {
  rows = [
    { section: 'geral', data: defaultContent.geral, updated_at: STAMP },
    { section: 'contato', data: defaultContent.contato, updated_at: STAMP },
  ];
  writes = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
  server.use(
    http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.get(CONTENT_URL, () => HttpResponse.json(rows)),
    http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })),
  );
  respondWrite(() => HttpResponse.json([{ updated_at: NEW_STAMP }]));
});

afterEach(() => {
  localStorage.clear();
});

describe('carregamento (RF-21, CA-15)', () => {
  it('abre a seção Geral com o conteúdo do banco', async () => {
    rows[0] = { ...rows[0]!, data: { ...defaultContent.geral, name: 'Ana Souza' } };
    renderEditor();

    expect(await field('name')).toHaveValue('Ana Souza');
    expect(screen.getByRole('combobox', { name: /Seção do site · 1 de 8/ })).toHaveValue('geral');
  });

  it('enquanto carrega: aviso neutro, sem formulário', async () => {
    server.use(
      http.get(CONTENT_URL, async () => {
        await delay('infinite');
        return HttpResponse.json([]);
      }),
    );
    renderEditor();

    expect(await screen.findByText('Carregando o conteúdo…')).toBeVisible();
    expect(document.querySelector('[data-field-path]')).toBeNull();
  });

  it('falha ao ler: mensagem e "Tentar novamente", sem formulário que possa ser salvo', async () => {
    const user = userEvent.setup();
    server.use(http.get(CONTENT_URL, () => HttpResponse.error()));
    renderEditor();

    expect(await screen.findByText('Não foi possível carregar o conteúdo.')).toBeVisible();
    expect(document.querySelector('[data-field-path]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Salvar e publicar' })).toBeNull();

    server.use(http.get(CONTENT_URL, () => HttpResponse.json(rows)));
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await field('name')).toBeVisible();
  });
});

describe('seletor de seção (RF-02, CA-02)', () => {
  it('a seção do endereço abre direto', async () => {
    renderEditor('/admin?secao=contato');

    expect(await field('whatsapp.number')).toBeVisible();
    expect(screen.getByRole('combobox', { name: /Seção do site · 8 de 8/ })).toHaveValue('contato');
  });

  it('escolher outra seção troca o formulário e o endereço', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    await field('name');

    await user.selectOptions(screen.getByRole('combobox', { name: /Seção do site/ }), 'sobre');

    expect(await field('education')).toBeVisible();
    expect(router.state.location.search).toBe('?secao=sobre');
  });

  it('seção inválida no endereço: abre Geral, trocando o histórico', async () => {
    const router = renderEditor('/admin?secao=inexistente');

    expect(await field('name')).toBeVisible();
    expect(router.state.location.search).toBe('?secao=geral');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('as oito seções aparecem pelo nome, no seletor e na lista abaixo dele', async () => {
    renderEditor();
    await field('name');

    const names = [
      'Geral',
      'Início',
      'Sobre mim',
      'Meu trabalho',
      'Área de atuação',
      'Como funciona',
      'O espaço',
      'Contato',
    ];
    const select = screen.getByRole('combobox', { name: /Seção do site/ });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(names);
    expect(screen.getByText(names.join(' · '))).toBeVisible();
  });
});

describe('status e barra de ações (RF-01, RF-04, CA-01)', () => {
  it('sem alteração: última publicação e botões desabilitados', async () => {
    renderEditor();
    await field('name');

    expect(status()).toHaveTextContent(/^Última publicação: \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/);
    expect(saveButton()).toBeDisabled();
    expect(discardButton()).toBeDisabled();
  });

  it('nada publicado ainda', async () => {
    rows = [];
    renderEditor();
    await field('name');

    expect(status()).toHaveTextContent('Ainda não publicado');
  });

  it('com alteração: "Alterações não salvas" e botões habilitados', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(await field('name'), '!');

    expect(status()).toHaveTextContent('Alterações não salvas');
    expect(saveButton()).toBeEnabled();
    expect(discardButton()).toBeEnabled();
  });

  it('desfazer a alteração à mão volta ao estado salvo', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.type(await field('name'), '!');
    await user.keyboard('{Backspace}');

    expect(saveButton()).toBeDisabled();
  });

  it('no Contato, o telefone formatado na tela não conta como alteração', async () => {
    const user = userEvent.setup();
    renderEditor('/admin?secao=contato');

    await user.type(await field('title'), '!');
    await user.keyboard('{Backspace}');

    expect(status()).not.toHaveTextContent('Alterações não salvas');
    expect(saveButton()).toBeDisabled();
  });

  it('"Descartar" volta aos valores salvos', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await field('name');
    await user.clear(name);
    await user.type(name, 'Outro nome');

    await user.click(discardButton());
    // Desde a T07, descartar pede confirmação.
    const confirm = screen.getByRole('dialog', { name: 'Descartar alterações?' });
    await user.click(within(confirm).getByRole('button', { name: 'Descartar' }));

    expect(await field('name')).toHaveValue(defaultContent.geral.name);
    expect(saveButton()).toBeDisabled();
  });
});

describe('salvar e publicar (RF-13 a RF-16; CA-08, CA-10)', () => {
  it('grava a seção, avisa e passa a "Última publicação: agora"', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await field('name');
    await user.clear(name);
    await user.type(name, '  Ana Souza  ');

    await user.click(saveButton());

    expect(await screen.findByText('Publicado. O site atualiza em alguns minutos.')).toBeVisible();
    expect(status()).toHaveTextContent('Última publicação: agora');
    expect(saveButton()).toBeDisabled();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.method).toBe('PATCH');
    expect(writes[0]?.url.searchParams.get('updated_at')).toBe(`eq.${STAMP}`);
    expect((writes[0]?.body.data as { name: string }).name).toBe('Ana Souza');
  });

  it('salvar de novo usa a data devolvida pela gravação anterior', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await field('name');
    await user.type(name, '!');
    await user.click(saveButton());
    await screen.findByText('Publicado. O site atualiza em alguns minutos.');

    await user.type(name, '?');
    await user.click(saveButton());

    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes[1]?.url.searchParams.get('updated_at')).toBe(`eq.${NEW_STAMP}`);
  });

  it('telefone digitado do jeito dela é gravado só com dígitos', async () => {
    const user = userEvent.setup();
    renderEditor('/admin?secao=contato');
    const number = await field('whatsapp.number');
    expect(number).toHaveValue('+55 (00) 00000-0000');

    await user.clear(number);
    await user.type(number, '(11) 99999-8888');
    await user.click(saveButton());

    await waitFor(() => expect(writes).toHaveLength(1));
    expect((writes[0]?.body.data as typeof defaultContent.contato).whatsapp.number).toBe(
      '5511999998888',
    );
    expect(await field('whatsapp.number')).toHaveValue('+55 (11) 99999-8888');
  });

  it('seção sem linha no banco: insere', async () => {
    const user = userEvent.setup();
    renderEditor('/admin?secao=inicio');

    await user.type(await field('title'), '!');
    await user.click(saveButton());

    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.method).toBe('POST');
    expect(writes[0]?.body.section).toBe('inicio');
  });

  it('com erros: nada é enviado, o resumo conta os campos e o foco vai ao primeiro', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.clear(await field('name'));
    const crp = await field('crp');
    await user.clear(crp);
    await user.type(crp, 'x'.repeat(21));

    await user.click(saveButton());

    expect(writes).toHaveLength(0);
    expect(await screen.findByText('2 campos precisam de ajuste.')).toBeVisible();
    expect(await field('name')).toHaveFocus();
    expect(await field('name')).toHaveAccessibleDescription(/Campo obrigatório/);
    expect(crp).toHaveAccessibleDescription(/Máximo de 20 caracteres/);
  });

  it('corrigir um campo tira o erro dele', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await field('name');
    await user.clear(name);
    await user.click(saveButton());
    await screen.findByText('1 campo precisa de ajuste.');

    await user.type(name, 'Ana');

    expect(name).not.toHaveAttribute('aria-invalid');
  });

  it('durante a gravação: botão ocupado, e duplo clique grava uma vez', async () => {
    const user = userEvent.setup();
    respondWrite(async () => {
      await delay(50);
      return HttpResponse.json([{ updated_at: NEW_STAMP }]);
    });
    renderEditor();
    await user.type(await field('name'), '!');

    await user.dblClick(saveButton());

    expect(await screen.findByRole('button', { name: 'Publicando…' })).toBeDisabled();
    await screen.findByText('Publicado. O site atualiza em alguns minutos.');
    expect(writes).toHaveLength(1);
  });

  it('dois cliques no mesmo instante: grava uma vez', async () => {
    const user = userEvent.setup();
    respondWrite(async () => {
      await delay(50);
      return HttpResponse.json([{ updated_at: NEW_STAMP }]);
    });
    renderEditor();
    await user.type(await field('name'), '!');

    act(() => {
      fireEvent.click(saveButton());
      fireEvent.click(saveButton());
    });

    await screen.findByText('Publicado. O site atualiza em alguns minutos.');
    expect(writes).toHaveLength(1);
  });

  it.each<[string, () => Response, RegExp]>([
    ['sem rede', () => HttpResponse.error(), /Sem conexão com a internet/],
    [
      'serviço fora',
      () => HttpResponse.json({ code: 'XX000', message: 'x' }, { status: 500 }),
      /Serviço indisponível/,
    ],
    [
      'conflito',
      () => HttpResponse.json([]),
      /Esta seção foi alterada em outro lugar\. Recarregue para ver a versão mais recente\./,
    ],
  ])('%s: aviso de erro, e as alterações continuam na tela', async (_name, response, message) => {
    const user = userEvent.setup();
    respondWrite(response);
    renderEditor();
    await user.type(await field('name'), '!');

    await user.click(saveButton());

    // As regiões de aviso existem vazias desde o início, para o leitor de tela anunciar.
    expect((await screen.findByText(message)).closest('[role="alert"]')).not.toBeNull();
    expect(await field('name')).toHaveValue(`${defaultContent.geral.name}!`);
    expect(status()).toHaveTextContent('Alterações não salvas');
    expect(saveButton()).toBeEnabled();
  });

  it('o aviso de erro pode ser fechado', async () => {
    const user = userEvent.setup();
    respondWrite(() => HttpResponse.error());
    renderEditor();
    await user.type(await field('name'), '!');
    await user.click(saveButton());
    await screen.findByText(/Sem conexão com a internet/);

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(screen.queryByText(/Sem conexão com a internet/)).toBeNull();
  });
});

describe('cabeçalho continua o da 003', () => {
  it('"Editar site", status, "Ver site" e "Sair"', async () => {
    renderEditor();
    await field('name');
    const banner = within(screen.getByRole('banner'));

    expect(banner.getByRole('heading', { level: 1, name: 'Editar site' })).toBeVisible();
    expect(banner.getByRole('link', { name: 'Ver site' })).toHaveAttribute('href', '/');
    expect(banner.getByRole('button', { name: 'Sair' })).toBeVisible();
    await act(async () => undefined);
  });
});
