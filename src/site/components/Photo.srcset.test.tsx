import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Photo as PhotoContent } from '@/content/types';
import { Photo } from './Photo';

// Spec 005, T06 (D7; RF-11; CA-10). Versões da foto pela regra de src/lib/image.ts.

const CODE = '3f6c2a1e-7b4d-4e2a-9c1f-0a1b2c3d4e5f';
const WITH_VERSIONS: PhotoContent = {
  src: `/fotos/${CODE}-1600w.webp`,
  width: 1600,
  height: 1200,
  alt: 'Sala de atendimento',
};

describe('Photo com versões', () => {
  it('srcset com as três versões e o sizes do lugar', () => {
    render(<Photo photo={WITH_VERSIONS} sizes="(min-width: 1024px) 480px, 100vw" />);
    const img = screen.getByRole('img', { name: 'Sala de atendimento' });

    expect(img).toHaveAttribute('src', WITH_VERSIONS.src);
    expect(img).toHaveAttribute(
      'srcset',
      `/fotos/${CODE}-480w.webp 480w, /fotos/${CODE}-960w.webp 960w, /fotos/${CODE}-1600w.webp 1600w`,
    );
    expect(img).toHaveAttribute('sizes', '(min-width: 1024px) 480px, 100vw');
    expect(img).toHaveAttribute('width', '1600');
    expect(img).toHaveAttribute('height', '1200');
  });

  it('sem sizes informado: a tela toda, que nunca escolhe uma versão pequena demais', () => {
    render(<Photo photo={WITH_VERSIONS} />);

    expect(screen.getByRole('img')).toHaveAttribute('sizes', '100vw');
  });

  it('endereço fora da regra (externo): sem srcset nem sizes, como antes', () => {
    render(
      <Photo photo={{ ...WITH_VERSIONS, src: 'https://exemplo.test/foto.jpg' }} sizes="100vw" />,
    );
    const img = screen.getByRole('img');

    expect(img).not.toHaveAttribute('srcset');
    expect(img).not.toHaveAttribute('sizes');
  });

  it('sem foto: continua o bloco de espera', () => {
    render(<Photo photo={{ ...WITH_VERSIONS, src: '' }} sizes="100vw" />);

    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Sala de atendimento' })).toHaveAttribute(
      'data-placeholder',
    );
  });

  it('a foto principal continua com prioridade, e as outras, preguiçosas', () => {
    render(
      <>
        <Photo photo={WITH_VERSIONS} priority />
        <Photo photo={{ ...WITH_VERSIONS, alt: 'outra' }} />
      </>,
    );

    expect(screen.getByRole('img', { name: 'Sala de atendimento' })).toHaveAttribute(
      'fetchpriority',
      'high',
    );
    expect(screen.getByRole('img', { name: 'outra' })).toHaveAttribute('loading', 'lazy');
  });
});
