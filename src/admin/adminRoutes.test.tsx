import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { adminRoutes } from './adminRoutes';

// Rotas internas do admin (o React Router vive só no chunk do admin).

vi.mock('@/admin/AdminLoginPage', () => ({
  AdminLoginPage: () => <main>marcador-admin-login</main>,
}));

vi.mock('@/admin/AdminEditorPage', () => ({
  AdminEditorPage: () => <main>marcador-admin-editor</main>,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(adminRoutes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('rotas do admin', () => {
  it('"/admin/login" mostra a tela de login', async () => {
    renderAt('/admin/login');

    expect(await screen.findByText('marcador-admin-login')).toBeInTheDocument();
  });

  it('"/admin" mostra o editor', async () => {
    renderAt('/admin');

    expect(await screen.findByText('marcador-admin-editor')).toBeInTheDocument();
  });

  it.each(['/admin/nao-existe', '/admin/login/extra'])(
    'caminho desconhecido %s volta para "/admin"',
    async (path) => {
      const router = renderAt(path);

      expect(await screen.findByText('marcador-admin-editor')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/admin');
    },
  );
});
