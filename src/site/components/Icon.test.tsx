import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ICON_IDS } from '@/content/icons';
import { CARD_ICONS, UI_ICON_NAMES, UI_ICONS } from '../icons/paths';
import { Icon } from './Icon';

// Spec 002, T03 — ícones de linha (RF-16 / CA-16). Geometria em icons/paths.ts
// (dados copiados de docs/design), sem texto e escondidos de leitores de tela.

const ALL_NAMES = [...ICON_IDS, ...UI_ICON_NAMES];

function svgOf(name: (typeof ALL_NAMES)[number], size?: number) {
  const { container } = render(<Icon name={name} size={size} />);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error(`sem svg para ${name}`);
  return svg;
}

describe('icons/paths.ts', () => {
  it('tem exatamente um desenho para cada ícone de card do conteúdo', () => {
    expect(Object.keys(CARD_ICONS).sort()).toEqual([...ICON_IDS].sort());
  });

  it('tem os 11 ícones de interface', () => {
    expect([...UI_ICON_NAMES].sort()).toEqual(
      [
        'arrowRight',
        'check',
        'clock',
        'close',
        'email',
        'instagram',
        'mapPin',
        'menu',
        'phone',
        'whatsapp',
        'whatsappChat',
      ].sort(),
    );
    expect(Object.keys(UI_ICONS).sort()).toEqual([...UI_ICON_NAMES].sort());
  });

  it('copia a geometria do design', () => {
    expect(UI_ICONS.menu.shapes).toEqual([
      { tag: 'path', attrs: { d: 'M4 7h16M4 12h16M4 17h16' } },
    ]);
    expect(CARD_ICONS.clipboard.shapes[0]).toEqual({
      tag: 'rect',
      attrs: { x: '6', y: '4', width: '12', height: '17', rx: '2' },
    });
    expect(UI_ICONS.check.shapes).toEqual([
      { tag: 'path', attrs: { d: 'M5 12.5l4.5 4.5L19 7.5' } },
    ]);
  });
});

describe('Icon', () => {
  it.each(ALL_NAMES)('%s: SVG de linha, viewBox 24, escondido de leitores de tela', (name) => {
    const svg = svgOf(name);

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('data-icon')).toBe(name);
    expect(svg.children.length).toBeGreaterThan(0);
    expect(svg.textContent).toBe('');
    expect(svg.querySelector('title')).toBeNull();
  });

  it.each(ALL_NAMES.filter((name) => name !== 'check'))('%s: traço 1.8', (name) => {
    expect(svgOf(name).getAttribute('stroke-width')).toBe('1.8');
  });

  it('check: traço 2, como no design (exceção declarada)', () => {
    expect(svgOf('check').getAttribute('stroke-width')).toBe('2');
  });

  it('tamanho padrão 24 e tamanho configurável', () => {
    expect(svgOf('menu').getAttribute('width')).toBe('24');
    const small = svgOf('arrowRight', 18);
    expect(small.getAttribute('width')).toBe('18');
    expect(small.getAttribute('height')).toBe('18');
  });
});
