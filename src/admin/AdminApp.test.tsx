import { afterEach, describe, expect, it, vi } from 'vitest';

// Spec 003, T04 (D2): o token do link sai da URL antes de o roteador existir.

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('AdminApp', () => {
  it('carregar o módulo consome o hash antes de criar o roteador', async () => {
    window.history.replaceState(
      null,
      '',
      '/admin/nova-senha#access_token=aaa&refresh_token=rrr&type=recovery',
    );
    vi.resetModules();

    const hashWhenRouterIsCreated = vi.fn();
    vi.doMock('react-router', async (importOriginal) => {
      const original = await importOriginal<typeof import('react-router')>();
      return {
        ...original,
        createBrowserRouter: (...args: Parameters<typeof original.createBrowserRouter>) => {
          hashWhenRouterIsCreated(window.location.hash);
          return original.createBrowserRouter(...args);
        },
      };
    });

    await import('./AdminApp');
    const { getRecoveryLink } = await import('./auth/recoveryHash');

    expect(hashWhenRouterIsCreated).toHaveBeenCalledExactlyOnceWith('');
    expect(window.location.pathname).toBe('/admin/nova-senha');
    expect(getRecoveryLink()).toMatchObject({ kind: 'tokens', accessToken: 'aaa' });
  });
});
