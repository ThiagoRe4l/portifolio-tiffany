import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { a11yLabels } from '../a11yLabels';
import { headingIdFor, hrefTo, SECTION_IDS } from '../anchors';
import { Hero } from './Hero';

// Spec 002, T06 — hero (RF-05 / CA-05, parte do CA-15 e do CA-17).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Hero />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

describe('Hero', () => {
  it('é a seção #inicio, nomeada pelo h1', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 1 });

    expect(section).toHaveAttribute('id', SECTION_IDS.inicio);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.inicio));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(heading).toHaveTextContent(content.inicio.title);
  });

  it('mostra todos os textos de inicio', () => {
    const { content, section } = setup();
    const { eyebrow, title, text, primaryCta, secondaryCta, badge } = content.inicio;

    for (const value of [
      eyebrow,
      title,
      text,
      primaryCta,
      secondaryCta,
      badge.title,
      badge.subtitle,
    ]) {
      expect(within(section).getByText(value)).toBeVisible();
    }
  });

  it('tem um único h1', () => {
    const { section } = setup();

    expect(section.querySelectorAll('h1')).toHaveLength(1);
    expect(within(section).getAllByRole('heading')).toHaveLength(1);
  });

  it('o botão principal abre o WhatsApp em nova aba', () => {
    const { content, section } = setup();
    const { number, message } = content.contato.whatsapp;
    const primary = within(section).getByRole('link', {
      name: `${content.inicio.primaryCta} ${a11yLabels.newTab}`,
    });

    expect(primary).toHaveAttribute('href', buildWhatsAppLink(number, message));
    expect(primary).toHaveAttribute('target', '_blank');
    expect(primary).toHaveAttribute('rel', 'noopener noreferrer');
    expect(primary.querySelector('[data-icon="whatsapp"]')).not.toBeNull();
  });

  it('o botão secundário leva para #trabalho, na mesma aba', () => {
    const { content, section } = setup();
    const secondary = within(section).getByRole('link', { name: content.inicio.secondaryCta });

    expect(secondary).toHaveAttribute('href', hrefTo(SECTION_IDS.trabalho));
    expect(secondary).not.toHaveAttribute('target');
    expect(secondary.querySelector('[data-icon="arrowRight"]')).not.toBeNull();
  });

  it('a foto com endereço carrega com prioridade', () => {
    const { content, section } = setup();
    const photo = within(section).getByRole('img', { name: content.inicio.photo.alt });

    expect(photo.tagName).toBe('IMG');
    expect(photo).toHaveAttribute('src', content.inicio.photo.src);
    expect(photo).toHaveAttribute('loading', 'eager');
    expect(photo).toHaveAttribute('fetchpriority', 'high');
  });

  it('sem endereço, a foto vira o bloco de espera nomeado pelo alt', () => {
    const content = makeUniqueContent();
    content.inicio.photo.src = '';
    const { section } = setup(content);
    const photo = within(section).getByRole('img', { name: content.inicio.photo.alt });

    expect(photo.tagName).toBe('DIV');
    expect(photo).toHaveAttribute('data-placeholder');
  });

  it('etiqueta, título, texto, botões e foto entram em sequência (--i de 0 a 4)', () => {
    const { content, section } = setup();
    const items = [...section.querySelectorAll<HTMLElement>('[style*="--i"]')];

    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(items[0]).toHaveTextContent(content.inicio.eyebrow);
    expect(items[1]?.tagName).toBe('H1');
    expect(items[2]).toHaveTextContent(content.inicio.text);
    expect(within(items[3]!).getAllByRole('link')).toHaveLength(2);
    expect(within(items[4]!).getByRole('img', { name: content.inicio.photo.alt })).toBeVisible();
    // O selo fica junto da foto.
    expect(items[4]).toHaveTextContent(content.inicio.badge.title);
  });
});
