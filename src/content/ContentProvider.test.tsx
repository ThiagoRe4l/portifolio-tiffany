import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { ContentProvider, useContent } from './ContentProvider';

// T05 — acesso ao conteúdo nos componentes (spec 001, RF-13 / CA-13).

describe('ContentProvider / useContent', () => {
  it('entrega ao componente o conteúdo recebido', () => {
    const content = makeUniqueContent();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ContentProvider content={content}>{children}</ContentProvider>
    );

    const { result } = renderHook(() => useContent(), { wrapper });

    expect(result.current).toBe(content);
  });

  it('o componente renderiza um texto vindo do conteúdo', () => {
    const content = makeUniqueContent();
    function Title() {
      return <h1>{useContent().inicio.title}</h1>;
    }

    render(
      <ContentProvider content={content}>
        <Title />
      </ContentProvider>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(content.inicio.title);
  });

  it('fora do provider, falha com uma mensagem clara', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useContent())).toThrow(
      'useContent precisa estar dentro de <ContentProvider>',
    );
  });
});
