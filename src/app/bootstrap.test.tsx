import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMBEDDED_CONTENT_ID, serializeEmbeddedContent } from '@/content/embedded';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { bootstrap } from './bootstrap';

// RF-03 / CA-03 (spec 000): o site não importa código do admin; o admin é carregado sob demanda.
// RF-11 / RF-12 / RF-13 (spec 001): o site lê o conteúdo embutido e hidrata o HTML do build.
// A fábrica do vi.mock só roda quando o módulo é importado pela primeira vez,
// então o espião prova QUANDO o código do admin foi carregado.

const loaded = vi.hoisted(() => ({ modules: [] as string[] }));

vi.mock('@/site/SitePage', async () => {
  loaded.modules.push('site');
  const { useContent } = await vi.importActual<typeof import('@/content/ContentProvider')>(
    '@/content/ContentProvider',
  );
  return { SitePage: () => <main>{useContent().inicio.title}</main> };
});

vi.mock('@/admin/AdminApp', () => {
  loaded.modules.push('admin');
  return { AdminApp: () => <main>marcador-admin</main> };
});

let container: HTMLElement;
let unmount: (() => void) | undefined;
let content: SiteContent;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  content = makeUniqueContent();
});

afterEach(() => {
  act(() => unmount?.());
  unmount = undefined;
  window.history.replaceState(null, '', '/');
});

function embed(value: SiteContent) {
  const script = document.createElement('script');
  script.id = EMBEDDED_CONTENT_ID;
  script.type = 'application/json';
  script.textContent = serializeEmbeddedContent(value);
  document.body.append(script);
}

async function boot(pathname: string) {
  window.history.replaceState(null, '', pathname);
  await act(async () => {
    unmount = await bootstrap(pathname, container);
  });
}

describe('bootstrap: site', () => {
  it('"/" com #root vazio monta o site com o conteúdo embutido, sem importar o admin', async () => {
    embed(content);

    await boot('/');

    expect(screen.getByRole('main')).toHaveTextContent(content.inicio.title);
    expect(loaded.modules).not.toContain('admin');
  });

  it('"/" com o HTML do build hidrata, reaproveitando os nós e sem erros', async () => {
    embed(content);
    container.innerHTML = `<main>${content.inicio.title}</main>`;
    const serverMain = container.firstElementChild;
    const consoleError = vi.spyOn(console, 'error');

    await boot('/');

    expect(container.firstElementChild).toBe(serverMain);
    expect(serverMain).toHaveTextContent(content.inicio.title);
    expect(consoleError).not.toHaveBeenCalled();
  });

  // Spec 002, T04 (RF-21): só depois de hidratar as animações podem esconder conteúdo.
  it('depois de montar o site, marca a página como pronta para animar', async () => {
    embed(content);
    document.documentElement.setAttribute('data-motion', 'pending');

    await boot('/');

    expect(document.documentElement.getAttribute('data-motion')).toBe('ready');
    document.documentElement.removeAttribute('data-motion');
  });

  it('caminho desconhecido volta para "/" e renderiza o site', async () => {
    embed(content);

    await boot('/qualquer-coisa');

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('main')).toHaveTextContent(content.inicio.title);
    expect(loaded.modules).not.toContain('admin');
  });

  it('sem conteúdo embutido, falha com mensagem clara', async () => {
    await expect(bootstrap('/', container)).rejects.toThrow(/#site-content/);
  });
});

describe('bootstrap: admin', () => {
  it('"/admin/login" importa o admin sob demanda, sem precisar do conteúdo embutido', async () => {
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
