import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  authError,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';

// Spec 003, T08 (RF-11, RF-12, CA-11, CA-12). SDK real; só a rede é simulada.

const LOGOUT_URL = `${AUTH_URL}/logout`;

function renderEditor() {
  const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin'] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const header = async () => within(await screen.findByRole('banner'));

beforeEach(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
  server.use(
    http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.get(`${REST_URL}/site_content`, () => HttpResponse.json([{ initials: 'NS' }])),
    http.post(LOGOUT_URL, () => new HttpResponse(null, { status: 204 })),
  );
});

afterEach(() => {
  localStorage.clear();
});

describe('casca do editor (CA-12)', () => {
  it('cabeçalho com "Editar site", "Ver site" e "Sair", nessa ordem', async () => {
    renderEditor();
    const banner = await header();

    expect(banner.getByRole('heading', { level: 1, name: 'Editar site' })).toBeVisible();
    const actions = [
      banner.getByRole('link', { name: 'Ver site' }),
      banner.getByRole('button', { name: 'Sair' }),
    ];
    expect(actions[0]?.compareDocumentPosition(actions[1] as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('"Ver site" é link comum para "/", com recarregamento', async () => {
    renderEditor();

    expect((await header()).getByRole('link', { name: 'Ver site' })).toHaveAttribute('href', '/');
  });

  it('tem a área principal, reservada ao editor da spec 004', async () => {
    renderEditor();
    await header();

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('"Sair" (CA-11)', () => {
  it.each<[string, () => Response]>([
    ['servidor responde', () => new HttpResponse(null, { status: 204 })],
    ['servidor fora', () => authError(500, 'unexpected_failure')],
    ['sem rede', () => HttpResponse.error()],
  ])('%s: encerra, volta ao login sem aviso e /admin deixa de abrir', async (_n, response) => {
    const user = userEvent.setup();
    server.use(http.post(LOGOUT_URL, response));
    const router = renderEditor();

    await user.click((await header()).getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(await screen.findByRole('alert')).toBeEmptyDOMElement();

    await act(() => router.navigate('/admin'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });
});
