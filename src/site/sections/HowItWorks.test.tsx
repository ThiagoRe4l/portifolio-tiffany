import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { HowItWorks } from './HowItWorks';

// Spec 002, T07 — Como funciona (RF-09 / CA-09). Qual formato de número aparece em
// cada largura é CSS (E2E na T10); aqui, os dois existem e são decorativos.

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <HowItWorks />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

function withSteps(count: number): SiteContent {
  const content = makeUniqueContent();
  content.comoFunciona.steps = Array.from({ length: count }, (_, index) => ({
    title: `«passo ${index} título»`,
    text: `«passo ${index} texto»`,
  }));
  return content;
}

describe('HowItWorks', () => {
  it('é a seção #como-funciona, com etiqueta e h2 que a nomeia', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.comoFunciona);
    expect(heading).toHaveTextContent(content.comoFunciona.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.comoFunciona));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.comoFunciona.eyebrow)).toBeVisible();
  });

  it.each([2, 5])('com %i passos, é uma lista ordenada com título e texto', (count) => {
    const content = withSteps(count);
    const { section } = setup(content);
    const list = within(section).getByRole('list');
    const items = within(list).getAllByRole('listitem');

    expect(list.tagName).toBe('OL');
    expect(items).toHaveLength(count);
    items.forEach((item, index) => {
      const step = content.comoFunciona.steps[index]!;
      expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(step.title);
      expect(within(item).getByText(step.text)).toBeVisible();
    });
  });

  it.each([2, 5])(
    'com %i passos, numera "1…n" e "01…0n", escondido de leitores de tela',
    (count) => {
      const { section } = setup(withSteps(count));
      const items = within(section).getAllByRole('listitem');

      items.forEach((item, index) => {
        const short = within(item).getByText(String(index + 1), { exact: true });
        const padded = within(item).getByText(String(index + 1).padStart(2, '0'), { exact: true });
        expect(short).toHaveAttribute('aria-hidden', 'true');
        expect(padded).toHaveAttribute('aria-hidden', 'true');
      });
    },
  );

  it('os passos entram em sequência (--i 0, 1, 2…)', () => {
    const { section } = setup(withSteps(3));
    const items = within(section).getAllByRole('listitem');

    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual(['0', '1', '2']);
  });
});
