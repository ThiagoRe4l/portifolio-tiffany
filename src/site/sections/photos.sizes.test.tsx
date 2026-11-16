import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { PHOTO_SIZES } from '../photoSizes';
import { About } from './About';
import { Hero } from './Hero';
import { Space } from './Space';

// Spec 005, T06 (D7; CA-10). Cada lugar passa o seu sizes.

const src = (code: string) => `/fotos/${code}-1600w.webp`;

function withPhotos(): SiteContent {
  const content = makeUniqueContent();
  content.inicio.photo = { ...content.inicio.photo, src: src('inicio'), width: 1600, height: 1200 };
  content.sobre.photo = { ...content.sobre.photo, src: src('sobre'), width: 1600, height: 1200 };
  content.espaco.photos = content.espaco.photos.map((item, index) => ({
    ...item,
    photo: { ...item.photo, src: src(`espaco${index}`), width: 1600, height: 1200 },
  }));
  return content;
}

function sizesIn(node: React.ReactNode) {
  const { container } = render(<ContentProvider content={withPhotos()}>{node}</ContentProvider>);
  return [...container.querySelectorAll('img')].map((img) => img.getAttribute('sizes'));
}

describe('sizes de cada foto do site', () => {
  it('foto principal', () => {
    expect(sizesIn(<Hero />)).toEqual([PHOTO_SIZES.hero]);
  });

  it('Sobre mim', () => {
    expect(sizesIn(<About />)).toEqual([PHOTO_SIZES.about]);
  });

  it('galeria: a primeira é a grande no celular; as outras, pequenas', () => {
    const sizes = sizesIn(<Space />);

    expect(sizes.length).toBeGreaterThan(1);
    expect(sizes[0]).toBe(PHOTO_SIZES.galleryLarge);
    expect(sizes.slice(1).every((value) => value === PHOTO_SIZES.gallerySmall)).toBe(true);
  });
});
