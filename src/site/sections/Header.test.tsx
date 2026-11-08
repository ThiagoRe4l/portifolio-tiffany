import { act, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { triggerResize } from '../../../tests/setup/resizeObserver';
import { a11yLabels } from '../a11yLabels';
import { hrefTo, MENU_TARGETS, SECTION_IDS } from '../anchors';
import { Header } from './Header';
import { HEADER_PART } from './headerParts';

// Spec 002, T05 — header (RF-04 / CA-04, CA-02, CA-22). O que aparece por largura é CSS
// (coberto no E2E); aqui ficam o conteúdo, os destinos, o menu, a rolagem e a medição.

const MENU_ORDER = ['about', 'work', 'focus', 'howItWorks', 'space', 'contact'] as const;

function setup(content: SiteContent = makeUniqueContent()) {
  const user = userEvent.setup();
  const view = render(
    <ContentProvider content={content}>
      <Header />
    </ContentProvider>,
  );
  const header = view.container.querySelector('header');
  if (!header) throw new Error('sem <header>');
  const part = (name: string) => header.querySelector<HTMLElement>(`[data-part="${name}"]`);
  return { user, content, header, part };
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value });
  window.dispatchEvent(new Event('scroll'));
}

afterEach(() => {
  setScrollY(0);
  document.documentElement.removeAttribute('data-menu-open');
});

describe('marca', () => {
  it('mostra iniciais, nome e "profissão · CRP", com link para o topo', () => {
    const { content, part } = setup();
    const brand = part(HEADER_PART.brand);
    const { initials, name, profession, crp } = content.geral;

    expect(brand).toHaveAttribute('href', hrefTo(SECTION_IDS.inicio));
    expect(brand).toHaveTextContent(initials);
    expect(brand).toHaveTextContent(name);
    expect(brand).toHaveTextContent(`${profession} · ${crp}`);
    // As iniciais repetem o nome: ficam fora do nome acessível.
    expect(within(brand!).getByText(initials)).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('links e botão do topo', () => {
  it('a navegação tem os 6 links, na ordem, com os rótulos e as âncoras certas', () => {
    const { content, part } = setup();
    const nav = part(HEADER_PART.desktopNav);
    const links = within(nav!).getAllByRole('link');

    expect(nav?.tagName).toBe('NAV');
    expect(nav).toHaveAccessibleName(a11yLabels.menu);
    expect(links.map((link) => link.textContent)).toEqual(
      MENU_ORDER.map((key) => content.geral.menu[key]),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      MENU_ORDER.map((key) => hrefTo(MENU_TARGETS[key])),
    );
  });

  it('o botão do topo abre o WhatsApp em nova aba', () => {
    const { content, part } = setup();
    const cta = part(HEADER_PART.cta);
    const { number, message } = content.contato.whatsapp;

    expect(cta).toHaveAttribute('href', buildWhatsAppLink(number, message));
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveTextContent(content.geral.headerCta);
  });
});

describe('menu (painel)', () => {
  it('começa fechado, com o botão ligado ao painel', () => {
    const { part } = setup();
    const button = part(HEADER_PART.menuButton);
    const panel = part(HEADER_PART.menuPanel);

    expect(button?.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAccessibleName(a11yLabels.openMenu);
    expect(button).toHaveAttribute('aria-controls', panel?.id);
    expect(panel).not.toBeVisible();
  });

  it('abre com os 6 links e o botão do topo, e o foco vai para o primeiro link', async () => {
    const { user, content, part } = setup();
    const button = part(HEADER_PART.menuButton)!;

    await user.click(button);
    const panel = part(HEADER_PART.menuPanel)!;
    const links = within(panel).getAllByRole('link');

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAccessibleName(a11yLabels.closeMenu);
    expect(panel).toBeVisible();
    expect(links.map((link) => link.textContent)).toEqual([
      ...MENU_ORDER.map((key) => content.geral.menu[key]),
      expect.stringContaining(content.geral.headerCta),
    ]);
    expect(links[0]).toHaveFocus();
    expect(document.documentElement).toHaveAttribute('data-menu-open');
  });

  it('Esc fecha e devolve o foco ao botão', async () => {
    const { user, part } = setup();
    const button = part(HEADER_PART.menuButton)!;

    await user.click(button);
    await user.keyboard('{Escape}');

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(part(HEADER_PART.menuPanel)).not.toBeVisible();
    expect(button).toHaveFocus();
    expect(document.documentElement).not.toHaveAttribute('data-menu-open');
  });

  it('o botão também fecha', async () => {
    const { user, part } = setup();
    const button = part(HEADER_PART.menuButton)!;

    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(part(HEADER_PART.menuPanel)).not.toBeVisible();
  });

  it('escolher um link fecha o menu', async () => {
    const { user, part } = setup();

    await user.click(part(HEADER_PART.menuButton)!);
    await user.click(within(part(HEADER_PART.menuPanel)!).getAllByRole('link')[2]!);

    expect(part(HEADER_PART.menuButton)).toHaveAttribute('aria-expanded', 'false');
    expect(part(HEADER_PART.menuPanel)).not.toBeVisible();
  });
});

describe('rolagem', () => {
  it('ganha fundo sólido depois de 40px e perde ao voltar', () => {
    const { header } = setup();
    expect(header).not.toHaveAttribute('data-scrolled');

    act(() => setScrollY(41));
    expect(header).toHaveAttribute('data-scrolled');

    act(() => setScrollY(40));
    expect(header).not.toHaveAttribute('data-scrolled');
  });

  it('já rolado ao carregar: o estado é aplicado depois de montar', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });

    const { header } = setup();

    expect(header).toHaveAttribute('data-scrolled');
  });
});

describe('cabe numa linha? (textos editados longos)', () => {
  function setWidths(element: HTMLElement, scrollWidth: number, clientWidth: number) {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
  }

  it('o HTML inicial assume que cabe (sem diferença na hidratação)', () => {
    const { header } = setup();

    expect(header).not.toHaveAttribute('data-nav');
  });

  it('quando a linha não cabe, passa para o modo compacto; quando volta a caber, sai', () => {
    const { header, part } = setup();
    const row = part(HEADER_PART.row)!;

    setWidths(row, 1300, 1200);
    act(() => triggerResize());
    expect(header).toHaveAttribute('data-nav', 'compact');

    // No modo compacto os links somem, então a linha "cabe": não pode voltar sozinha.
    setWidths(row, 700, 1200);
    act(() => triggerResize());
    expect(header).toHaveAttribute('data-nav', 'compact');

    // Só volta quando há espaço para a largura que a linha precisava.
    setWidths(row, 700, 1400);
    act(() => triggerResize());
    expect(header).not.toHaveAttribute('data-nav');
  });
});
