import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './auth/AuthProvider';
import { adminRoutes } from './adminRoutes';

// Spec 003, T04 (RF-16, CA-16). Arquivo próprio: o cliente do SDK é único por módulo,
// e aqui ele nunca pode ter sido criado.

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
});

describe('sem as variáveis do Supabase', () => {
  it.each(['/admin', '/admin/login', '/admin/recuperar-senha', '/admin/nova-senha'])(
    '%s mostra a mensagem, sem erro não tratado',
    async (path) => {
      const consoleError = vi.spyOn(console, 'error');
      const router = createMemoryRouter(adminRoutes, { initialEntries: [path] });

      render(
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>,
      );

      expect(await screen.findByText('Área administrativa indisponível no momento.')).toBeVisible();
      expect(document.body.textContent).not.toMatch(/VITE_|Variável de ambiente/);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(consoleError).not.toHaveBeenCalled();
    },
  );
});
