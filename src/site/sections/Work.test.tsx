import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import { ICON_IDS } from '@/content/icons';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Work } from './Work';

// Spec 002, T07 — Meu trabalho (RF-07 / CA-07). Colunas por largura: E2E (T10).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Work />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

function withCards(count: number): SiteContent {
  const content = makeUniqueContent();
  content.trabalho.cards = Array.from({ length: count }, (_, index) => ({
    icon: ICON_IDS[index % ICON_IDS.length]!,
    title: `«card ${index} título»`,
    text: `«card ${index} texto»`,
  }));
  return content;
}

describe('Work', () => {
  it('é a seção #trabalho, com etiqueta e h2 que a nomeia', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.trabalho);
    expect(heading).toHaveTextContent(content.trabalho.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.trabalho));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.trabalho.eyebrow)).toBeVisible();
  });

  it.each([1, 4, 8])('com %i cards, mostra todos, cada um com o ícone escolhido', (count) => {
    const content = withCards(count);
    const { section } = setup(content);
    const items = within(section).getAllByRole('listitem');

    expect(items).toHaveLength(count);
    items.forEach((item, index) => {
      const card = content.trabalho.cards[index]!;
      expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(card.title);
      expect(within(item).getByText(card.text)).toBeVisible();
      const icon = item.querySelector('svg');
      expect(icon).toHaveAttribute('data-icon', card.icon);
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('os cards entram em sequência (--i 0, 1, 2…)', () => {
    const { section } = setup(withCards(4));
    const items = within(section).getAllByRole('listitem');

    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual(['0', '1', '2', '3']);
  });
});
