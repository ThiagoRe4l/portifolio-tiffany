import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { About } from './About';

// Spec 002, T06 — Sobre mim (RF-06 / CA-06).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <About />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

describe('About', () => {
  it('é a seção #sobre, com etiqueta e h2 que a nomeia', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.sobre);
    expect(heading).toHaveTextContent(content.sobre.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.sobre));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.sobre.eyebrow)).toBeVisible();
  });

  it('mostra a foto, sem prioridade de carregamento', () => {
    const { content, section } = setup();
    const photo = within(section).getByRole('img', { name: content.sobre.photo.alt });

    expect(photo).toHaveAttribute('src', content.sobre.photo.src);
    expect(photo).toHaveAttribute('loading', 'lazy');
  });

  it('os dois parágrafos aparecem', () => {
    const { content, section } = setup();

    expect(within(section).getByText(content.sobre.text).tagName).toBe('P');
    expect(within(section).getByText(content.sobre.secondaryText).tagName).toBe('P');
  });

  it('com o título da formação preenchido, ele aparece como h3', () => {
    const { content, section } = setup();

    expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent(
      content.sobre.educationTitle!,
    );
  });

  it('com o título da formação vazio, ele não aparece e a lista continua', () => {
    const content = makeUniqueContent();
    content.sobre.educationTitle = '';
    const { section } = setup(content);

    expect(within(section).queryByRole('heading', { level: 3 })).toBeNull();
    expect(within(section).getAllByRole('listitem')).toHaveLength(content.sobre.education.length);
  });

  it.each([1, 3, 8])('com %i itens de formação, cada um tem um check escondido', (count) => {
    const content = makeUniqueContent();
    content.sobre.education = Array.from({ length: count }, (_, index) => `«formação ${index}»`);
    const { section } = setup(content);
    const items = within(section).getAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual(content.sobre.education);
    for (const item of items) {
      const check = item.querySelector('[data-icon="check"]');
      expect(check).not.toBeNull();
      expect(check).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
