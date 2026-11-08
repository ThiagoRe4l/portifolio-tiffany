import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { a11yLabels } from '../a11yLabels';
import { ButtonLink } from './ButtonLink';

// Spec 002, T03 — botões-link (RF-14 / CA-14). Links que abrem em nova aba avisam
// isso a leitores de tela com o rótulo aprovado em a11yLabels.

describe('ButtonLink', () => {
  it('é um link com o texto recebido e a variante marcada', () => {
    render(
      <ButtonLink href="#trabalho" variant="ghost">
        «texto do botão»
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: '«texto do botão»' });

    expect(link).toHaveAttribute('href', '#trabalho');
    expect(link).toHaveAttribute('data-variant', 'ghost');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('a variante padrão é primary', () => {
    render(<ButtonLink href="#x">«a»</ButtonLink>);

    expect(screen.getByRole('link')).toHaveAttribute('data-variant', 'primary');
  });

  it('externo: nova aba, rel seguro e aviso no nome acessível', () => {
    render(
      <ButtonLink href="https://wa.me/5511987654321" external>
        «chamar»
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: `«chamar» ${a11yLabels.newTab}` });
    const hint = link.querySelector('.visually-hidden');

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(hint?.textContent?.trim()).toBe(a11yLabels.newTab);
  });

  it('ícone no início ou no fim, sempre escondido de leitores de tela', () => {
    const { container, rerender } = render(
      <ButtonLink href="#x" icon="whatsapp">
        «a»
      </ButtonLink>,
    );
    let link = container.querySelector('a');
    expect(link?.firstElementChild?.getAttribute('data-icon')).toBe('whatsapp');
    expect(link?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <ButtonLink href="#x" icon="arrowRight" iconPosition="end">
        «a»
      </ButtonLink>,
    );
    link = container.querySelector('a');
    expect(link?.lastElementChild?.getAttribute('data-icon')).toBe('arrowRight');
    expect(screen.getByRole('link')).toHaveAccessibleName('«a»');
  });

  it('repassa a className e o aria-label de quem usa (botão flutuante)', () => {
    render(
      <ButtonLink href="#x" className="flutuante" ariaLabel="«fale comigo»">
        «fale comigo»
      </ButtonLink>,
    );

    expect(screen.getByRole('link', { name: '«fale comigo»' })).toHaveClass('flutuante');
  });
});
