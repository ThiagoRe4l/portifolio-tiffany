import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrap } from './bootstrap';

// RF-03 / CA-03: o site não importa código do admin; o admin é carregado sob demanda.
// A fábrica do vi.mock só roda quando o módulo é importado pela primeira vez,
// então o espião prova QUANDO o código do admin foi carregado.

const loaded = vi.hoisted(() => ({ modules: [] as string[] }));

vi.mock('@/site/SitePage', () => {
  loaded.modules.push('site');
  return { SitePage: () => <main>marcador-site</main> };
});

vi.mock('@/admin/AdminApp', () => {
  loaded.modules.push('admin');
  return { AdminApp: () => <main>marcador-admin</main> };
});

let container: HTMLElement;
let unmount: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
});

afterEach(() => {
  act(() => unmount?.());
  unmount = undefined;
  window.history.replaceState(null, '', '/');
});

async function boot(pathname: string) {
  window.history.replaceState(null, '', pathname);
  await act(async () => {
    unmount = await bootstrap(pathname, container);
  });
}

describe('bootstrap', () => {
  it('"/" renderiza o site sem importar o admin', async () => {
    await boot('/');

    expect(screen.getByText('marcador-site')).toBeInTheDocument();
    expect(loaded.modules).not.toContain('admin');
  });

  it('caminho desconhecido volta para "/" e renderiza o site', async () => {
    await boot('/qualquer-coisa');

    expect(window.location.pathname).toBe('/');
    expect(screen.getByText('marcador-site')).toBeInTheDocument();
    expect(loaded.modules).not.toContain('admin');
  });

  it('"/admin/login" importa o admin sob demanda e o renderiza', async () => {
    expect(loaded.modules).not.toContain('admin');

    await boot('/admin/login');

    expect(loaded.modules).toContain('admin');
    expect(screen.getByText('marcador-admin')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/login');
  });

  it('falha com mensagem clara se o elemento raiz não existir', async () => {
    await expect(bootstrap('/', null)).rejects.toThrow('Elemento #root não encontrado');
  });
});
