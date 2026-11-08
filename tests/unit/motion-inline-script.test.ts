import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 002, T04 (plan D1) — script inline do <head>: marca a página como "pendente"
// antes da primeira pintura (o CSS só esconde conteúdo sob [data-motion]) e, se o app
// não ficar pronto em 3 s, tira a marca para nada ficar invisível (RF-21 / CA-20).

const HTML = readFileSync(fromRoot('index.html'), 'utf8');
const head = /<head>([\s\S]*?)<\/head>/.exec(HTML)?.[1] ?? '';
const inlineScripts = [...head.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
const script = inlineScripts[0] ?? '';

const html = document.documentElement;

beforeEach(() => {
  vi.useFakeTimers();
  html.removeAttribute('data-motion');
});

afterEach(() => {
  vi.useRealTimers();
  html.removeAttribute('data-motion');
});

describe('script inline do <head>', () => {
  it('existe um só, curto e antes do <head> gerado pelo build', () => {
    expect(inlineScripts).toHaveLength(1);
    expect(script.trim().length).toBeGreaterThan(0);
    expect(script.length).toBeLessThanOrEqual(300);
    expect(head.indexOf('<script>')).toBeLessThan(head.indexOf('<!--app-head-->'));
  });

  it('marca o <html> como pendente', () => {
    new Function(script)();

    expect(html.getAttribute('data-motion')).toBe('pending');
  });

  it('se o app não ficar pronto em 3 s, tira a marca (conteúdo visível)', () => {
    new Function(script)();

    vi.advanceTimersByTime(2999);
    expect(html.getAttribute('data-motion')).toBe('pending');

    vi.advanceTimersByTime(1);
    expect(html.hasAttribute('data-motion')).toBe(false);
  });

  it('se o app ficou pronto a tempo, mantém as animações', () => {
    new Function(script)();
    html.setAttribute('data-motion', 'ready');

    vi.advanceTimersByTime(5000);

    expect(html.getAttribute('data-motion')).toBe('ready');
  });
});
