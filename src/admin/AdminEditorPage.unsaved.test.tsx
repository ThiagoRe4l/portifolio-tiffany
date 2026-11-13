import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { getSupabase } from '@/lib/supabase';
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
import { leaveTo } from './editor/leave';

// Spec 004, T07 (RF-20, RF-16; CA-14). Tela real, SDK real; só a rede é simulada.

vi.mock('./editor/leave', () => ({ leaveTo: vi.fn() }));

const CONTENT_URL = `${REST_URL}/site_content`;
const STAMP = '2026-11-10T14:32:05.123456+00:00';
const LOST = 'Sua sessão expirou e as alterações não salvas foram perdidas. Entre novamente.';

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
const picker = () => screen.getByRole('combobox', { name: /Seção do site/ });
const dialog = () => screen.queryByRole('dialog', { name: 'Descartar alterações?' });

async function editName(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await field('name'), '!');
}

beforeEach(() => {
  vi.mocked(leaveTo).mockClear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
  server.use(
    http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.get(CONTENT_URL, () =>
      HttpResponse.json([{ section: 'geral', data: defaultContent.geral, updated_at: STAMP }]),
    ),
    http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })),
  );
});

afterEach(() => {
  localStorage.clear();
});

describe('sem alterações: nada é perguntado', () => {
  it('trocar de seção vai direto', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    await field('name');

    await user.selectOptions(picker(), 'contato');

    expect(dialog()).toBeNull();
    expect(router.state.location.search).toBe('?secao=contato');
  });

  it('"Ver site" segue como link comum', async () => {
    renderEditor();
    await field('name');
    let prevented = true;
    const record = (event: Event) => {
      prevented = event.defaultPrevented;
      event.preventDefault(); // o jsdom não navega
    };
    document.addEventListener('click', record);

    fireEvent.click(screen.getByRole('link', { name: 'Ver site' }));

    document.removeEventListener('click', record);
    expect(prevented).toBe(false);
    expect(dialog()).toBeNull();
  });

  it('o navegador não avisa ao fechar a aba', async () => {
    renderEditor();
    await field('name');
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('com alterações: confirmação antes de perder (CA-14)', () => {
  it('trocar de seção pergunta; "Continuar editando" mantém tudo', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    await editName(user);

    await user.selectOptions(picker(), 'contato');

    const confirm = dialog();
    expect(confirm).not.toBeNull();
    expect(confirm).toHaveAccessibleDescription(
      'As alterações desta seção ainda não foram salvas.',
    );
    expect(
      within(confirm as HTMLElement).getByRole('button', { name: 'Continuar editando' }),
    ).toHaveFocus();

    await user.click(
      within(confirm as HTMLElement).getByRole('button', { name: 'Continuar editando' }),
    );

    expect(dialog()).toBeNull();
    expect(router.state.location.search).toBe('');
    expect(picker()).toHaveValue('geral');
    expect(await field('name')).toHaveValue(`${defaultContent.geral.name}!`);
  });

  it('trocar de seção e confirmar: abre a outra e descarta o rascunho', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    await editName(user);
    await user.selectOptions(picker(), 'contato');

    await user.click(within(dialog() as HTMLElement).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(router.state.location.search).toBe('?secao=contato'));
    await user.selectOptions(picker(), 'geral');
    expect(dialog()).toBeNull();
    expect(await field('name')).toHaveValue(defaultContent.geral.name);
  });

  it('Esc fecha a janela como "Continuar editando"', async () => {
    const user = userEvent.setup();
    renderEditor();
    await editName(user);
    await user.selectOptions(picker(), 'contato');

    fireEvent(dialog() as HTMLElement, new Event('cancel', { cancelable: true }));

    expect(dialog()).toBeNull();
    expect(await field('name')).toHaveValue(`${defaultContent.geral.name}!`);
  });

  it('"Descartar" da barra pergunta antes', async () => {
    const user = userEvent.setup();
    renderEditor();
    await editName(user);

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    const confirm = dialog() as HTMLElement;
    await user.click(within(confirm).getByRole('button', { name: 'Descartar' }));

    expect(dialog()).toBeNull();
    expect(await field('name')).toHaveValue(defaultContent.geral.name);
  });

  it('"Ver site" pergunta; confirmando, sai para o site', async () => {
    const user = userEvent.setup();
    renderEditor();
    await editName(user);

    await user.click(screen.getByRole('link', { name: 'Ver site' }));
    expect(leaveTo).not.toHaveBeenCalled();
    await user.click(within(dialog() as HTMLElement).getByRole('button', { name: 'Descartar' }));

    expect(leaveTo).toHaveBeenCalledExactlyOnceWith('/');
  });

  it('"Sair" pergunta; confirmando, sai sem aviso de sessão expirada', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    await editName(user);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    await user.click(within(dialog() as HTMLElement).getByRole('button', { name: 'Descartar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
    expect(await screen.findByRole('alert')).toBeEmptyDOMElement();
  });

  it('fechar ou recarregar a aba: o navegador avisa', async () => {
    const user = userEvent.setup();
    renderEditor();
    await editName(user);
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('depois de salvar, o aviso do navegador deixa de existir', async () => {
    const user = userEvent.setup();
    server.use(http.patch(CONTENT_URL, () => HttpResponse.json([{ updated_at: STAMP }])));
    renderEditor();
    await editName(user);
    await user.click(screen.getByRole('button', { name: 'Salvar e publicar' }));
    await screen.findByText('Publicado. O site atualiza em alguns minutos.');
    const event = new Event('beforeunload', { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('sessão expirada com alterações (RF-16)', () => {
  it('o banco recusa a sessão ao salvar: volta ao login dizendo que se perdeu', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(CONTENT_URL, () =>
        HttpResponse.json({ code: 'PGRST303', message: 'JWT expired' }, { status: 401 }),
      ),
    );
    const router = renderEditor();
    await editName(user);

    await user.click(screen.getByRole('button', { name: 'Salvar e publicar' }));

    expect(await screen.findByText(LOST)).toBeVisible();
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('a sessão acaba sozinha com alterações: o login avisa que se perderam', async () => {
    const user = userEvent.setup();
    renderEditor();
    await editName(user);

    await getSupabase().auth.signOut({ scope: 'local' });

    expect(await screen.findByText(LOST)).toBeVisible();
  });

  it('sem alterações, o aviso continua o da 003', async () => {
    renderEditor();
    await field('name');

    await getSupabase().auth.signOut({ scope: 'local' });

    expect(await screen.findByText('Sua sessão expirou. Entre novamente.')).toBeVisible();
  });
});
