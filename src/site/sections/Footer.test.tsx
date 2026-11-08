import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { Footer } from './Footer';

// Spec 002, T09 — rodapé (RF-12, RF-23 / CA-12, CA-22).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Footer />
    </ContentProvider>,
  );
  const footer = view.container.querySelector('footer');
  if (!footer) throw new Error('sem <footer>');
  return { content, footer };
}

describe('Footer', () => {
  it('mostra nome, "profissão · CRP" e a linha de direitos', () => {
    const { content, footer } = setup();
    const { name, profession, crp, copyright } = content.geral;

    expect(within(footer).getByText(name)).toBeVisible();
    expect(within(footer).getByText(`${profession} · ${crp}`)).toBeVisible();
    expect(within(footer).getByText(copyright)).toBeVisible();
  });

  it('o texto do rodapé aparece quando preenchido', () => {
    const { content, footer } = setup();

    expect(within(footer).getByText(content.geral.footerText!)).toBeVisible();
  });

  it('o texto do rodapé some quando vazio, sem deixar parágrafo vazio', () => {
    const content = makeUniqueContent();
    content.geral.footerText = '';
    const { footer } = setup(content);

    expect([...footer.querySelectorAll('p')].filter((p) => !p.textContent)).toEqual([]);
  });

  it('"Área restrita" é um link comum para /admin/login, com o texto do conteúdo', () => {
    const { content, footer } = setup();
    const link = within(footer).getByRole('link', { name: content.geral.restrictedAreaLink });

    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/admin/login');
    expect(link).not.toHaveAttribute('target');
  });

  it('reserva espaço para o botão flutuante só quando ele existe', () => {
    const on = setup();
    expect(on.footer).toHaveAttribute('data-floating');

    const content = makeUniqueContent();
    content.contato.floatingButton.enabled = false;
    const off = setup(content);
    expect(off.footer).not.toHaveAttribute('data-floating');
  });
});
