import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Focus } from './Focus';

// Spec 002, T07 — Área de atuação (RF-08 / CA-08).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Focus />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  const lists = within(section).getAllByRole('list');
  return { content, section, tags: lists[0]!, audience: lists[1]! };
}

describe('Focus', () => {
  it('é a seção #atuacao, com etiqueta clara, h2 e texto', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.atuacao);
    expect(heading).toHaveTextContent(content.atuacao.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.atuacao));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.atuacao.eyebrow).parentElement).toHaveAttribute(
      'data-tone',
      'onDark',
    );
    expect(within(section).getByText(content.atuacao.text)).toBeVisible();
  });

  it('cada etiqueta de foco vira uma pílula, na ordem', () => {
    const { content, tags } = setup();

    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(content.atuacao.focusTags);
  });

  it('com os títulos opcionais preenchidos, eles aparecem como h3', () => {
    const { content, section } = setup();

    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([content.atuacao.focusTitle, content.atuacao.audienceTitle]);
  });

  it('com os títulos opcionais vazios, eles não aparecem e as listas continuam', () => {
    const content = makeUniqueContent();
    content.atuacao.focusTitle = '';
    content.atuacao.audienceTitle = '';
    const { section, tags, audience } = setup(content);

    expect(within(section).queryAllByRole('heading', { level: 3 })).toEqual([]);
    expect(within(tags).getAllByRole('listitem')).toHaveLength(content.atuacao.focusTags.length);
    expect(within(audience).getAllByRole('listitem')).toHaveLength(content.atuacao.audience.length);
  });

  it('os blocos de público mostram título e, quando preenchido, o texto', () => {
    const content = makeUniqueContent();
    content.atuacao.audience = [
      { title: '«público com texto»', text: '«texto do público»' },
      { title: '«público sem texto»', text: '' },
    ];
    const { audience } = setup(content);
    const [withText, withoutText] = within(audience).getAllByRole('listitem');

    expect(withText).toHaveTextContent('«público com texto»');
    expect(within(withText!).getByText('«texto do público»')).toBeVisible();
    expect(withoutText!.textContent).toBe('«público sem texto»');
    expect(withoutText!.querySelectorAll('p')).toHaveLength(1);
  });
});
