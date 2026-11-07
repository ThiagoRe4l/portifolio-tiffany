import { describe, expect, it } from 'vitest';
import { readTokens } from '../support/tokens';

// CA-04: tokens de design com os valores exatos da seção 8 do CLAUDE.md.

const COLORS = {
  '--color-bg': '#FAF6F0',
  '--color-sand': '#F1E8DC',
  '--color-surface': '#FFFFFF',
  '--color-text': '#1F2D2B',
  '--color-text-muted': '#56625F',
  '--color-primary': '#2F5D57',
  '--color-primary-hover': '#244A45',
  '--color-primary-soft': '#E4EDE9',
  '--color-accent': '#A9553A',
  '--color-accent-on-dark': '#F2C9B5',
  '--color-line': '#E6DCCF',
  '--color-input-border': '#CFC3B4',
  '--color-placeholder': '#E9DFD2',
};

const MOBILE_TOKENS = {
  // Tipografia
  '--font-heading': "'Fraunces', Georgia, serif",
  '--font-body': "'Inter', system-ui, sans-serif",
  '--fs-h1': '38px',
  '--fs-h2': '30px',
  '--fs-body': '16px',
  '--fs-label': '13px',
  '--lh-body': '1.6',
  '--ls-label': '0.08em',
  '--fw-regular': '400',
  '--fw-medium': '500',
  '--fw-semibold': '600',
  '--fw-heading': '500',
  // Forma
  '--radius-card': '16px',
  '--radius-card-lg': '18px',
  '--radius-photo': '20px',
  '--radius-photo-lg': '24px',
  '--radius-pill': '999px',
  '--radius-arch': '999px 999px 24px 24px',
  // Espaço
  '--space-section': '56px',
  '--gutter': '24px',
  '--container': '1200px',
  '--tap-min': '48px',
  // Movimento
  '--motion-duration': '700ms',
  '--motion-ease': 'cubic-bezier(.2,.7,.2,1)',
  '--motion-stagger-hero': '90ms',
  '--motion-stagger': '80ms',
  '--motion-distance': '24px',
};

const DESKTOP_OVERRIDES = {
  '--fs-h1': '60px',
  '--fs-h2': '44px',
  '--fs-body': '17px',
  '--space-section': '104px',
};

describe('tokens de design (src/styles/tokens.css)', () => {
  const { base, desktop } = readTokens();

  it.each(Object.entries(COLORS))('cor %s = %s', (name, value) => {
    expect(base[name]?.toUpperCase()).toBe(value);
  });

  it.each(Object.entries(MOBILE_TOKENS))('mobile: %s = %s', (name, value) => {
    expect(base[name]).toBe(value);
  });

  it.each(Object.entries(DESKTOP_OVERRIDES))('desktop (≥ 1024px): %s = %s', (name, value) => {
    expect(desktop[name]).toBe(value);
  });

  it('o desktop só redefine tamanhos de texto e espaçamento das seções', () => {
    expect(Object.keys(desktop).sort()).toEqual(Object.keys(DESKTOP_OVERRIDES).sort());
  });
});
