import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../support/contrast';
import { readTokens } from '../support/tokens';

// CA-10: combinações de texto e fundo previstas no design (WCAG AA, texto normal ≥ 4,5:1).

const AA_NORMAL_TEXT = 4.5;

/** [texto, fundo, onde aparece] */
const ALLOWED_PAIRS: [string, string, string][] = [
  ['--color-text', '--color-bg', 'texto principal no fundo creme'],
  ['--color-text', '--color-surface', 'texto principal em seções brancas e cards'],
  ['--color-text', '--color-sand', 'texto em blocos areia (formação, contato)'],
  ['--color-text-muted', '--color-bg', 'texto secundário no fundo creme'],
  ['--color-text-muted', '--color-surface', 'texto secundário em seções brancas'],
  ['--color-text-muted', '--color-sand', 'texto secundário em blocos areia'],
  ['--color-accent', '--color-bg', 'etiqueta terracota no fundo creme'],
  ['--color-accent', '--color-surface', 'etiqueta terracota em seções brancas'],
  ['--color-primary', '--color-bg', 'botão contornado / links no fundo creme'],
  ['--color-primary', '--color-surface', 'links em seções brancas'],
  ['--color-surface', '--color-primary', 'texto branco no botão e na seção verde'],
  ['--color-surface', '--color-primary-hover', 'texto branco no botão em hover'],
  ['--color-accent-on-dark', '--color-primary', 'etiqueta clara na seção verde'],
  ['--color-surface', '--color-text', 'texto branco no rodapé escuro'],
];

/** Combinações que o design NÃO pode usar. */
const FORBIDDEN_PAIRS: [string, string, string][] = [
  ['--color-accent', '--color-sand', 'etiqueta terracota sobre fundo areia'],
];

describe('função de contraste', () => {
  it('preto sobre branco = 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('cor sobre ela mesma = 1:1', () => {
    expect(contrastRatio('#2F5D57', '#2F5D57')).toBeCloseTo(1, 5);
  });

  it('é simétrica', () => {
    expect(contrastRatio('#A9553A', '#FAF6F0')).toBeCloseTo(
      contrastRatio('#FAF6F0', '#A9553A'),
      10,
    );
  });
});

describe('contraste dos tokens', () => {
  const { base } = readTokens();
  const color = (name: string): string => {
    const value = base[name];
    if (!value) throw new Error(`Token ausente: ${name}`);
    return value;
  };

  it.each(ALLOWED_PAIRS)('%s sobre %s (%s) ≥ 4,5:1', (text, background) => {
    expect(contrastRatio(color(text), color(background))).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it.each(FORBIDDEN_PAIRS)(
    '%s sobre %s (%s) fica abaixo de 4,5:1 e não pode ser usado',
    (text, background) => {
      expect(contrastRatio(color(text), color(background))).toBeLessThan(AA_NORMAL_TEXT);
    },
  );
});
