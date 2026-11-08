// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 002, T04 — CSS das animações (RF-17 a RF-21). Lido como texto:
// - estado escondido só sob [data-motion] (sem JS, nada some);
// - movimento reduzido zera tudo (teste obrigatório do projeto);
// - hover só com ponteiro de verdade.

const CSS = readFileSync(fromRoot('src/site/motion/motion.module.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ');

type Rule = { selector: string; body: string; media: string };

/** Regras `seletor { corpo }`, com o @media em volta (um nível, como no arquivo). */
function rules(css: string): Rule[] {
  const found: Rule[] = [];
  let index = 0;
  const walk = (until: number, media: string) => {
    while (index < until) {
      const open = css.indexOf('{', index);
      if (open === -1 || open >= until) return;
      const selector = css.slice(index, open).trim();
      let depth = 1;
      let close = open + 1;
      while (depth > 0) {
        if (css[close] === '{') depth += 1;
        if (css[close] === '}') depth -= 1;
        close += 1;
      }
      if (selector.startsWith('@media')) {
        index = open + 1;
        walk(close - 1, selector);
      } else if (!selector.startsWith('@keyframes')) {
        found.push({ selector, body: css.slice(open + 1, close - 1), media });
      }
      index = close;
    }
  };
  walk(css.length, '');
  return found;
}

const ALL = rules(CSS);
const outsideMedia = ALL.filter((rule) => rule.media === '');
const find = (predicate: (rule: Rule) => boolean) => ALL.filter(predicate);

describe('motion.module.css', () => {
  it('só esconde conteúdo sob [data-motion]', () => {
    const hiding = ALL.filter((rule) => /opacity: 0[;\s}]|opacity: 0$/.test(rule.body));

    expect(hiding.length).toBeGreaterThan(0);
    for (const rule of hiding) expect(rule.selector).toContain('[data-motion]');
  });

  it('revelar ao rolar: sobe 24px com fade e sequência de 80ms', () => {
    const hidden = find(
      (r) => r.selector.includes('[data-motion]') && r.selector.includes('.reveal'),
    );
    const shown = find(
      (r) => r.selector.includes('.reveal') && r.selector.includes('[data-revealed]'),
    );

    expect(hidden.map((r) => r.body).join(' ')).toMatch(
      /transform: translateY\(var\(--motion-distance\)\)/,
    );
    const shownBody = shown.map((r) => r.body).join(' ');
    expect(shownBody).toMatch(/opacity: 1/);
    expect(shownBody).toMatch(/transform: none/);
    expect(shownBody).toMatch(/var\(--motion-duration\)/);
    expect(shownBody).toMatch(/var\(--motion-ease\)/);
    expect(shownBody).toMatch(/calc\(var\(--i, 0\) \* var\(--motion-stagger\)\)/);
  });

  it('entrada do hero: fadeUp de 700ms com 90ms entre os itens', () => {
    expect(CSS).toMatch(/@keyframes fadeUp \{/);
    const body = find((r) => r.selector.includes('[data-motion]') && r.selector.includes('.enter'))
      .map((r) => r.body)
      .join(' ');

    expect(body).toMatch(/animation: fadeUp var\(--motion-duration\) var\(--motion-ease\) both/);
    expect(body).toMatch(/animation-delay: calc\(var\(--i, 0\) \* var\(--motion-stagger-hero\)\)/);
  });

  it('botão flutuante: "pop" depois de 600ms', () => {
    expect(CSS).toMatch(/@keyframes pop \{/);
    const body = find((r) => r.selector.includes('[data-motion]') && r.selector.includes('.pop'))
      .map((r) => r.body)
      .join(' ');

    expect(body).toMatch(/animation: pop [\d.]+m?s var\(--motion-ease\) 600ms both/);
  });

  it('movimento reduzido: nada anima e tudo fica no estado final (teste obrigatório)', () => {
    const reduced = ALL.filter((rule) => rule.media.includes('prefers-reduced-motion: reduce'));
    const selectors = reduced.map((rule) => rule.selector).join(' ');
    const body = reduced.map((rule) => rule.body).join(' ');

    for (const name of ['.reveal', '.enter', '.pop', '.lift', '.zoom']) {
      expect(selectors).toContain(name);
    }
    expect(body).toMatch(/opacity: 1 !important/);
    expect(body).toMatch(/transform: none !important/);
    expect(body).toMatch(/animation: none !important/);
    expect(body).toMatch(/transition: none !important/);
  });

  it('hover (card sobe 4px, foto com zoom 1.03) só com ponteiro de verdade', () => {
    const hover = ALL.filter((rule) => rule.selector.includes(':hover'));

    expect(hover.length).toBeGreaterThan(0);
    for (const rule of hover) expect(rule.media).toContain('(hover: hover) and (pointer: fine)');
    const body = hover.map((rule) => rule.body).join(' ');
    expect(body).toMatch(/translateY\(-4px\)/);
    expect(body).toMatch(/var\(--shadow-card-hover\)/);
    expect(body).toMatch(/scale\(1\.03\)/);
    expect(outsideMedia.some((rule) => rule.selector.includes(':hover'))).toBe(false);
  });
});
