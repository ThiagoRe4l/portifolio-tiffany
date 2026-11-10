import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthStatus } from './AuthProvider';
import { GuestOnly, RequireAdmin } from './RequireAdmin';

// Spec 003, T04 (CA-09, teste obrigatório). O que cada estado da sessão pode mostrar.

const auth = vi.hoisted(() => ({
  status: 'loading' as AuthStatus,
  notice: null,
  retryCheck: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./AuthProvider', () => ({ useAuth: () => auth }));

const childRendered = vi.fn();

function Secret() {
  childRendered();
  return <p>conteudo</p>;
}

function renderGuard(guard: (children: ReactNode) => ReactNode, path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/login', element: path === '/admin/login' ? guard(<Secret />) : <p>login</p> },
      { path: '/admin', element: path === '/admin' ? guard(<Secret />) : <p>editor</p> },
    ],
    { initialEntries: ['/outra-entrada', path], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const requireAdmin = (children: ReactNode) => <RequireAdmin>{children}</RequireAdmin>;
const guestOnly = (children: ReactNode) => <GuestOnly>{children}</GuestOnly>;

beforeEach(() => {
  childRendered.mockClear();
  auth.retryCheck.mockClear();
});

describe('RequireAdmin', () => {
  it('administradora vê o conteúdo', () => {
    auth.status = 'admin';

    renderGuard(requireAdmin, '/admin');

    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });

  it.each<AuthStatus>(['signedOut', 'denied'])(
    '%s: vai para o login trocando o histórico, sem renderizar o conteúdo',
    (status) => {
      auth.status = status;

      const router = renderGuard(requireAdmin, '/admin');

      expect(screen.getByText('login')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/admin/login');
      expect(router.state.historyAction).toBe('REPLACE');
      expect(childRendered).not.toHaveBeenCalled();
    },
  );

  it.each<AuthStatus>(['loading', 'checking'])(
    '%s: só o estado de carregamento, sem conteúdo e sem login',
    (status) => {
      auth.status = status;

      const router = renderGuard(requireAdmin, '/admin');

      expect(screen.getByRole('status')).toHaveTextContent('Carregando');
      expect(router.state.location.pathname).toBe('/admin');
      expect(childRendered).not.toHaveBeenCalled();
    },
  );

  it('checkFailed: nada protegido abre, e "Tentar novamente" funciona', async () => {
    const user = userEvent.setup();
    auth.status = 'checkFailed';

    const router = renderGuard(requireAdmin, '/admin');

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível confirmar seu acesso');
    expect(router.state.location.pathname).toBe('/admin');
    expect(childRendered).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(auth.retryCheck).toHaveBeenCalledTimes(1);
  });
});

describe('GuestOnly', () => {
  it.each<AuthStatus>(['signedOut', 'denied'])('%s: mostra a tela', (status) => {
    auth.status = status;

    renderGuard(guestOnly, '/admin/login');

    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });

  it('administradora conectada vai para /admin, trocando o histórico', () => {
    auth.status = 'admin';

    const router = renderGuard(guestOnly, '/admin/login');

    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(childRendered).not.toHaveBeenCalled();
  });

  it.each<AuthStatus>(['loading', 'checking'])('%s: o login não pisca', (status) => {
    auth.status = status;

    renderGuard(guestOnly, '/admin/login');

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(childRendered).not.toHaveBeenCalled();
  });

  it('checkFailed: oferece "Tentar novamente"', () => {
    auth.status = 'checkFailed';

    renderGuard(guestOnly, '/admin/login');

    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(childRendered).not.toHaveBeenCalled();
  });
});
