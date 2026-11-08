import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Space } from './Space';

// Spec 002, T08 — O espaço (RF-10 / CA-10). Colunas por largura: site-space-contact.spec.ts.

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Space />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

function withPhotos(count: number): SiteContent {
  const content = makeUniqueContent();
  content.espaco.photos = Array.from({ length: count }, (_, index) => ({
    photo: {
      src: `https://imagens.exemplo-teste.com.br/${index}.webp`,
      width: 1200,
      height: 900,
      alt: `«foto ${index}»`,
    },
    caption: `«legenda ${index}»`,
  }));
  return content;
}

describe('Space', () => {
  it('é a seção #espaco, com etiqueta e h2 que a nomeia', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.espaco);
    expect(heading).toHaveTextContent(content.espaco.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.espaco));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.espaco.eyebrow)).toBeVisible();
  });

  it.each([1, 3, 9])('com %i fotos, mostra todas com legenda, sem prioridade', (count) => {
    const content = withPhotos(count);
    const { section } = setup(content);
    const figures = section.querySelectorAll('figure');

    expect(figures).toHaveLength(count);
    content.espaco.photos.forEach(({ photo, caption }, index) => {
      const figure = within(figures[index] as HTMLElement);
      const image = figure.getByRole('img', { name: photo.alt });
      expect(image).toHaveAttribute('src', photo.src);
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(figures[index]?.querySelector('figcaption')).toHaveTextContent(caption!);
    });
  });

  it('a legenda só aparece quando preenchida', () => {
    const content = withPhotos(2);
    content.espaco.photos[1]!.caption = '';
    const { section } = setup(content);
    const figures = section.querySelectorAll('figure');

    expect(figures[0]?.querySelector('figcaption')).not.toBeNull();
    expect(figures[1]?.querySelector('figcaption')).toBeNull();
  });

  it('as fotos entram em sequência (--i 0, 1, 2…)', () => {
    const { section } = setup(withPhotos(3));
    const items = within(section).getAllByRole('listitem');

    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
  });
});
