import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminIcon, type AdminIconName } from './AdminIcon';
import { AuthLayout } from './AuthLayout';

// Spec 003, T05 (RF-02).

const renderLayout = (initials?: string | null, note?: string) =>
  render(
    <AuthLayout
      title="Área administrativa"
      subtitle="Texto de apoio"
      initials={initials}
      note={note}
    >
      <p>conteudo</p>
    </AuthLayout>,
  );

const mark = () => document.querySelector<HTMLElement>('[data-part="mark"]');

describe('AuthLayout', () => {
  it('"Voltar ao site" é um link comum para "/", com recarregamento', () => {
    // Renderiza sem roteador: um <Link> do React Router quebraria aqui.
    renderLayout('NS');

    expect(screen.getByRole('link', { name: 'Voltar ao site' })).toHaveAttribute('href', '/');
  });

  it('tem o título principal, o apoio e o conteúdo dentro do main', () => {
    renderLayout('NS');
    const main = within(screen.getByRole('main'));

    expect(main.getByRole('heading', { level: 1, name: 'Área administrativa' })).toBeVisible();
    expect(main.getByText('Texto de apoio')).toBeVisible();
    expect(main.getByText('conteudo')).toBeVisible();
  });

  it('segue a ordem do design', () => {
    renderLayout('NS', 'Aviso final');
    const text = screen.getByRole('main').textContent;

    expect(text).toBe('Voltar ao siteNSÁrea administrativaTexto de apoioconteudoAviso final');
  });

  it('com iniciais: mostra as iniciais, sem cadeado', () => {
    renderLayout('NS');

    expect(mark()).toHaveTextContent('NS');
    expect(mark()?.querySelector('[data-icon="lock"]')).toBeNull();
  });

  it('sem conteúdo disponível: círculo com cadeado', () => {
    renderLayout(null);

    expect(mark()?.textContent).toBe('');
    expect(mark()?.querySelector('[data-icon="lock"]')).toBeInstanceOf(Element);
  });

  it('carregando: o círculo já ocupa o espaço, vazio', () => {
    renderLayout(undefined);

    expect(mark()?.textContent).toBe('');
    expect(mark()?.querySelector('svg')).toBeNull();
  });

  it('sem aviso final, não renderiza o bloco', () => {
    renderLayout('NS');

    expect(document.querySelector('[data-part="note"]')).toBeNull();
  });
});

describe('AdminIcon', () => {
  it.each<AdminIconName>(['arrowLeft', 'eye', 'eyeOff', 'lock', 'logout'])(
    '%s: decorativo, traço 1.8',
    (name) => {
      const { container } = render(<AdminIcon name={name} />);
      const svg = container.querySelector('svg');

      expect(svg).toHaveAttribute('data-icon', name);
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('stroke-width', '1.8');
      expect(svg?.childElementCount).toBeGreaterThan(0);
    },
  );
});
