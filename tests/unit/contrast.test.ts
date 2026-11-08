import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../support/contrast';
import { readTokens } from '../support/tokens';

// CA-10: combinações de texto e fundo previstas no design (WCAG AA, texto normal ≥ 4,5:1).

const AA_NORMAL_TEXT = 4.5;

/** Cor resultante de `foreground` com opacidade `alpha` sobre `background` (hex). */
function blend(foreground: string, alpha: number, background: string): string {
  const channel = (hex: string, index: number) =>
    parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const mixed = [0, 1, 2].map((i) =>
    Math.round(channel(foreground, i) * alpha + channel(background, i) * (1 - alpha)),
  );
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

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
  // Spec 002 (plan D7): pares do design de referência.
  ['--color-on-dark', '--color-primary', 'texto claro na seção verde'],
  ['--color-on-dark', '--color-footer', 'texto claro no rodapé'],
  ['--color-on-dark-muted', '--color-footer', 'direitos e "Área restrita" no rodapé'],
  ['--color-surface', '--color-footer', 'nome no rodapé'],
  ['--color-accent-on-sand', '--color-sand', 'etiqueta no cartão areia do contato'],
  ['--color-text', '--color-primary-soft', 'texto sobre o fundo dos ícones'],
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

  it('texto branco nos blocos de público (branco a 10% sobre o verde) ≥ 4,5:1', () => {
    const alpha = /rgba\(\s*255,\s*255,\s*255,\s*([\d.]+)\s*\)/.exec(
      color('--color-on-dark-surface'),
    );
    expect(alpha).not.toBeNull();
    const background = blend('#FFFFFF', Number(alpha?.[1]), color('--color-primary'));

    expect(contrastRatio(color('--color-surface'), background)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });

  it.each(FORBIDDEN_PAIRS)(
    '%s sobre %s (%s) fica abaixo de 4,5:1 e não pode ser usado',
    (text, background) => {
      expect(contrastRatio(color(text), color(background))).toBeLessThan(AA_NORMAL_TEXT);
    },
  );
});
