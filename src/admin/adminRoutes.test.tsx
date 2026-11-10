import { act, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabase } from '@/lib/supabase';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { adminRoutes } from './adminRoutes';

// Rotas do admin e proteção (spec 000; spec 003, CA-01 e CA-09, teste obrigatório).

const editorRendered = vi.hoisted(() => vi.fn());

vi.mock('@/admin/AdminLoginPage', () => ({
  AdminLoginPage: function LoginMarker() {
    const { notice } = useAuth();
    return <main>marcador-admin-login:{notice ?? 'sem-aviso'}</main>;
  },
}));

vi.mock('@/admin/RecoverPasswordPage', () => ({
  RecoverPasswordPage: () => <main>marcador-recuperar</main>,
}));

vi.mock('@/admin/NewPasswordPage', () => ({
  NewPasswordPage: () => <main>marcador-nova-senha</main>,
}));

vi.mock('@/admin/AdminEditorPage', () => ({
  AdminEditorPage: function EditorMarker() {
    editorRendered();
    return <main>marcador-admin-editor</main>;
  },
}));

const PREVIOUS_ENTRY = '/admin/recuperar-senha';

function renderAt(path: string) {
  const router = createMemoryRouter(adminRoutes, {
    initialEntries: [PREVIOUS_ENTRY, path],
    initialIndex: 1,
  });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const seedSession = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));

function asAdmin() {
  seedSession();
  server.use(http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])));
}

beforeEach(() => {
  editorRendered.mockClear();
  server.use(http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })));
});

afterEach(() => {
  localStorage.clear();
});

describe('rotas públicas, sem sessão', () => {
  it.each([
    ['/admin/login', 'marcador-admin-login:sem-aviso'],
    ['/admin/recuperar-senha', 'marcador-recuperar'],
    ['/admin/nova-senha', 'marcador-nova-senha'],
  ])('%s abre a tela certa', async (path, marker) => {
    const router = renderAt(path);

    expect(await screen.findByText(marker)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });
});

describe('proteção de rotas (CA-09)', () => {
  it.each(['/admin', '/admin/', '/admin/nao-existe', '/admin/login/extra'])(
    'sem sessão, %s termina no login sem renderizar o editor',
    async (path) => {
      const router = renderAt(path);

      expect(await screen.findByText('marcador-admin-login:sem-aviso')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/admin/login');
      expect(editorRendered).not.toHaveBeenCalled();
    },
  );

  it('sem sessão, o Voltar não retorna à rota protegida', async () => {
    const router = renderAt('/admin');
    await screen.findByText('marcador-admin-login:sem-aviso');

    expect(router.state.historyAction).toBe('REPLACE');
    await act(() => router.navigate(-1));

    expect(router.state.location.pathname).toBe(PREVIOUS_ENTRY);
    expect(screen.getByText('marcador-recuperar')).toBeInTheDocument();
  });

  it('com sessão de administradora, /admin mostra o editor', async () => {
    asAdmin();

    renderAt('/admin');

    expect(await screen.findByText('marcador-admin-editor')).toBeInTheDocument();
  });

  it('com sessão, /admin/login vai para /admin', async () => {
    asAdmin();

    const router = renderAt('/admin/login');

    expect(await screen.findByText('marcador-admin-editor')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
  });

  it.each(['/admin/nao-existe', '/admin/login/extra'])(
    'com sessão, caminho desconhecido %s volta para /admin',
    async (path) => {
      asAdmin();

      const router = renderAt(path);

      expect(await screen.findByText('marcador-admin-editor')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/admin');
    },
  );

  it('com sessão, /admin/nova-senha continua aberta: o link de recuperação cria sessão', async () => {
    asAdmin();

    const router = renderAt('/admin/nova-senha');

    expect(await screen.findByText('marcador-nova-senha')).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(router.state.location.pathname).toBe('/admin/nova-senha');
  });

  it('conta fora de admins não vê o editor e chega ao login com o aviso', async () => {
    seedSession();
    server.use(http.get(`${REST_URL}/admins`, () => HttpResponse.json([])));

    renderAt('/admin');

    expect(await screen.findByText('marcador-admin-login:accessDenied')).toBeInTheDocument();
    expect(editorRendered).not.toHaveBeenCalled();
  });

  it('sessão que acaba durante o uso: volta ao login com o aviso', async () => {
    asAdmin();
    const router = renderAt('/admin');
    await screen.findByText('marcador-admin-editor');

    await act(() => getSupabase().auth.signOut({ scope: 'local' }));

    expect(await screen.findByText('marcador-admin-login:sessionExpired')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/login');
  });
});
