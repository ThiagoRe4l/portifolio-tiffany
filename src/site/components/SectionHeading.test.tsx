import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from './SectionHeading';

// Spec 002, T03 — etiqueta + título de seção (RF-01: cada seção com seu título;
// um único h1 na página, o do hero).

describe('SectionHeading', () => {
  it('mostra a etiqueta e o título como h2 por padrão', () => {
    render(<SectionHeading eyebrow="«etiqueta»" title="«título»" />);

    expect(screen.getByRole('heading', { level: 2, name: '«título»' })).toBeInTheDocument();
    expect(screen.getByText('«etiqueta»').tagName).toBe('P');
  });

  it('pode ser h1 (hero)', () => {
    render(<SectionHeading eyebrow="«e»" title="«t»" level={1} />);

    expect(screen.getByRole('heading', { level: 1, name: '«t»' })).toBeInTheDocument();
  });

  it('recebe um id no título, para a seção usar aria-labelledby', () => {
    render(<SectionHeading eyebrow="«e»" title="«t»" headingId="sobre-titulo" />);

    expect(screen.getByRole('heading')).toHaveAttribute('id', 'sobre-titulo');
  });

  it.each(['default', 'onDark', 'onSand'] as const)('marca o tom %s (cor da etiqueta)', (tone) => {
    const { container } = render(<SectionHeading eyebrow="«e»" title="«t»" tone={tone} />);

    expect(container.firstElementChild).toHaveAttribute('data-tone', tone);
  });

  it('a etiqueta vem antes do título', () => {
    const { container } = render(<SectionHeading eyebrow="«e»" title="«t»" />);
    const [first, second] = Array.from(container.firstElementChild?.children ?? []);

    expect(first?.textContent).toBe('«e»');
    expect(second?.tagName).toBe('H2');
  });
});
