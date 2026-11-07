import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// RF-04 / RF-05: estilos globais, movimento reduzido e fontes auto-hospedadas.

const read = (path: string) => readFileSync(fromRoot(path), 'utf8');
const compact = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

const FONT_FILES = [
  { file: 'inter-latin-wght-normal.woff2', family: 'Inter', weight: '400 600' },
  { file: 'fraunces-latin-500-normal.woff2', family: 'Fraunces', weight: '500' },
];

describe('entrada do app', () => {
  it('main.tsx importa tokens.css antes de global.css', () => {
    const main = read('src/app/main.tsx');
    const tokens = main.indexOf("import '@/styles/tokens.css'");
    const global = main.indexOf("import '@/styles/global.css'");

    expect(tokens).toBeGreaterThanOrEqual(0);
    expect(global).toBeGreaterThan(tokens);
  });
});

describe('global.css', () => {
  it('desliga animações, transições e rolagem suave com movimento reduzido', () => {
    const css = compact(read('src/styles/global.css'));
    const block = /@media \(prefers-reduced-motion: reduce\) \{(.*?\}) \}/.exec(css)?.[1] ?? '';

    expect(block).toMatch(/animation: none !important/);
    expect(block).toMatch(/transition: none !important/);
    expect(block).toMatch(/scroll-behavior: auto !important/);
  });

  it('define foco visível', () => {
    expect(compact(read('src/styles/global.css'))).toMatch(/:focus-visible \{[^}]*outline:/);
  });

  it('usa os tokens de fundo, texto e fonte no body', () => {
    const body = /body \{([^}]*)\}/.exec(compact(read('src/styles/global.css')))?.[1] ?? '';

    expect(body).toMatch(/background(-color)?: var\(--color-bg\)/);
    expect(body).toMatch(/color: var\(--color-text\)/);
    expect(body).toMatch(/font-family: var\(--font-body\)/);
    expect(body).toMatch(/font-size: var\(--fs-body\)/);
    expect(body).toMatch(/line-height: var\(--lh-body\)/);
  });

  it.each(FONT_FILES)('declara @font-face de $family com swap', ({ file, family, weight }) => {
    const faces = compact(read('src/styles/global.css')).match(/@font-face \{[^}]*\}/g) ?? [];
    const face = faces.find((rule) => rule.includes(`/fonts/${file}`)) ?? '';

    expect(face).toMatch(new RegExp(`font-family: '?${family}'?;`));
    expect(face).toMatch(new RegExp(`font-weight: ${weight};`));
    expect(face).toMatch(/font-display: swap;/);
    expect(face).toMatch(/format\('woff2'\)/);
  });
});

describe('fontes auto-hospedadas', () => {
  it.each(FONT_FILES)('public/fonts/$file existe e é WOFF2', ({ file }) => {
    const path = fromRoot('public/fonts', file);

    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path).subarray(0, 4).toString('latin1')).toBe('wOF2');
  });

  it('a licença OFL acompanha as fontes', () => {
    expect(read('public/fonts/LICENSE-OFL.txt')).toMatch(/SIL OPEN FONT LICENSE/i);
  });

  it.each(FONT_FILES)('index.html faz preload de $file', ({ file }) => {
    const html = read('index.html').replace(/\s+/g, ' ');
    const link = html.match(new RegExp(`<link[^>]*href="/fonts/${file}"[^>]*>`))?.[0] ?? '';

    expect(link).toMatch(/rel="preload"/);
    expect(link).toMatch(/as="font"/);
    expect(link).toMatch(/type="font\/woff2"/);
    expect(link).toMatch(/crossorigin/);
  });

  it('nada carrega do Google Fonts', () => {
    const sources = [read('index.html'), read('src/styles/global.css')].join('\n');

    expect(sources).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
