import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { formatPhoneBR } from '@/lib/phone';
import { makeUniqueContent } from '../../tests/fixtures/content';
import { a11yLabels } from './a11yLabels';
import { hrefTo, MAIN_ID, SECTION_IDS } from './anchors';
import { SitePage } from './SitePage';
import { credentialLine, stepNumbers } from './text';

// Spec 002, T09 — página completa (RF-01, RF-03, RF-22, RF-23 / CA-01, CA-03, CA-21, CA-22).

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <SitePage />
    </ContentProvider>,
  );
  return { content, container: view.container };
}

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

/** Tudo o que pode aparecer: conteúdo, rótulos aprovados e os textos gerados declarados. */
function allowedTexts(content: SiteContent): Set<string> {
  return new Set([
    ...allStrings(content),
    ...Object.values(a11yLabels),
    credentialLine(content.geral.profession, content.geral.crp),
    formatPhoneBR(content.contato.phone.number!),
    ...content.comoFunciona.steps.flatMap((_, index) => {
      const { short, padded } = stepNumbers(index);
      return [short, padded];
    }),
  ]);
}

function visibleTexts(root: HTMLElement): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent?.trim();
    if (text) texts.push(text);
  }
  return texts;
}

function namingAttributes(root: HTMLElement): string[] {
  const names = ['alt', 'title', 'aria-label'];
  return [...root.querySelectorAll('*')].flatMap((element) =>
    names.flatMap((name) => element.getAttribute(name) ?? []),
  );
}

describe('estrutura da página', () => {
  it('os marcos e as seções seguem a ordem do RF-01', () => {
    const { container } = setup();
    const main = screen.getByRole('main');

    expect([...container.children].map((element) => element.tagName)).toEqual([
      'A',
      'HEADER',
      'MAIN',
      'FOOTER',
      'A',
    ]);
    expect([...main.querySelectorAll(':scope > section')].map((section) => section.id)).toEqual([
      SECTION_IDS.inicio,
      SECTION_IDS.sobre,
      SECTION_IDS.trabalho,
      SECTION_IDS.atuacao,
      SECTION_IDS.comoFunciona,
      SECTION_IDS.espaco,
      SECTION_IDS.contato,
    ]);
  });

  it('há um único h1 (o título do hero)', () => {
    const { content } = setup();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(content.inicio.title);
  });

  it('cada seção é nomeada pelo próprio título', () => {
    setup();
    const sections = [...screen.getByRole('main').querySelectorAll('section')];

    for (const section of sections) {
      const title = document.getElementById(section.getAttribute('aria-labelledby') ?? '');
      expect(title?.tagName).toMatch(/^H[12]$/);
      expect(section).toContainElement(title);
    }
  });

  it('nome e CRP aparecem no header e no rodapé', () => {
    const { content } = setup();
    const { name, profession, crp } = content.geral;
    const credential = credentialLine(profession, crp);

    for (const landmark of [screen.getByRole('banner'), screen.getByRole('contentinfo')]) {
      expect(within(landmark).getByText(name)).toBeVisible();
      expect(within(landmark).getByText(credential)).toBeVisible();
    }
  });
});

describe('link "pular para o conteúdo"', () => {
  it('é o primeiro elemento focável e aponta para o main', async () => {
    setup();
    const user = userEvent.setup();

    await user.tab();

    const skip = screen.getByRole('link', { name: a11yLabels.skipToContent });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', hrefTo(MAIN_ID));
  });

  it('o main pode receber o foco', () => {
    setup();
    const main = screen.getByRole('main');

    expect(main).toHaveAttribute('id', MAIN_ID);
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});

describe('sem texto fixo (teste obrigatório, CLAUDE.md §4)', () => {
  it('todo texto visível vem do conteúdo, de a11yLabels ou é gerado e declarado', () => {
    const { content, container } = setup();
    const allowed = allowedTexts(content);

    expect(visibleTexts(container).filter((text) => !allowed.has(text))).toEqual([]);
  });

  it('todo alt, title e aria-label vem do conteúdo ou de a11yLabels', () => {
    const { content, container } = setup();
    const allowed = allowedTexts(content);
    // Botões externos com aria-label somam o aviso de nova aba ao texto do conteúdo.
    const names = namingAttributes(container).map((name) =>
      name.replace(` ${a11yLabels.newTab}`, ''),
    );

    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !allowed.has(name))).toEqual([]);
  });

  it('os textos do conteúdo aparecem de fato (o teste não passa com a página vazia)', () => {
    const { content, container } = setup();
    const texts = visibleTexts(container);

    for (const expected of [
      content.inicio.title,
      content.sobre.text,
      content.trabalho.cards[0]!.title,
      content.atuacao.focusTags[0]!,
      content.comoFunciona.steps[0]!.text,
      content.contato.whatsapp.buttonText,
      content.geral.restrictedAreaLink,
    ]) {
      expect(texts).toContain(expected);
    }
  });
});
