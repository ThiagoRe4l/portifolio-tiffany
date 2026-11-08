import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Photo as PhotoContent } from '@/content/types';
import { Photo } from './Photo';

// Spec 002, T03 — foto do conteúdo (RF-15 / CA-15). Sem endereço, vira um bloco de
// espera com a mesma proporção, sem texto visível, com o alt como nome acessível.

const WITH_SRC: PhotoContent = {
  src: 'https://imagens.exemplo-teste.com.br/foto.webp',
  width: 800,
  height: 1000,
  alt: '«alt da foto»',
};
const WITHOUT_SRC: PhotoContent = { ...WITH_SRC, src: '' };

describe('Photo com endereço', () => {
  it('é um <img> com dimensões, alt e carregamento preguiçoso', () => {
    render(<Photo photo={WITH_SRC} />);
    const img = screen.getByRole('img', { name: '«alt da foto»' });

    expect(img.tagName).toBe('IMG');
    expect(img).toHaveAttribute('src', WITH_SRC.src);
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '1000');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).not.toHaveAttribute('fetchpriority');
  });

  it('com priority (foto do hero), carrega já e com prioridade alta', () => {
    render(<Photo photo={WITH_SRC} priority />);
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('repassa a className da seção', () => {
    render(<Photo photo={WITH_SRC} className="arco" />);

    expect(screen.getByRole('img')).toHaveClass('arco');
  });
});

describe('Photo sem endereço (bloco de espera)', () => {
  it('não tem <img>, tem role="img" com o alt como nome e nenhum texto visível', () => {
    const { container } = render(<Photo photo={WITHOUT_SRC} />);
    const block = screen.getByRole('img', { name: '«alt da foto»' });

    expect(container.querySelector('img')).toBeNull();
    expect(block.tagName).toBe('DIV');
    expect(block.textContent).toBe('');
  });

  it('mantém a proporção da foto (sem a página pular quando ela chegar)', () => {
    render(<Photo photo={WITHOUT_SRC} />);

    expect(screen.getByRole('img').style.aspectRatio).toBe('800 / 1000');
  });

  it('repassa a className da seção e marca o estado de espera', () => {
    render(<Photo photo={WITHOUT_SRC} className="arco" />);
    const block = screen.getByRole('img');

    expect(block).toHaveClass('arco');
    expect(block).toHaveAttribute('data-placeholder');
  });
});
