import { readFileSync } from 'node:fs';
import { fromRoot } from './paths';

export type TokenMap = Record<string, string>;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Conteúdo entre a chave que abre em `openIndex` e a chave que a fecha. */
function blockBody(css: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(openIndex + 1, i);
    }
  }
  throw new Error('Chaves desbalanceadas no CSS');
}

function declarations(body: string): TokenMap {
  const tokens: TokenMap = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens[name] = value.trim().replace(/\s+/g, ' ');
  }
  return tokens;
}

/**
 * Lê `src/styles/tokens.css` e devolve os tokens do `:root` principal (mobile)
 * e os redefinidos em `@media (min-width: 1024px)` (desktop).
 */
export function readTokens(): { base: TokenMap; desktop: TokenMap } {
  const css = stripComments(readFileSync(fromRoot('src/styles/tokens.css'), 'utf8'));

  const mediaMatch = /@media\s*\(\s*min-width:\s*1024px\s*\)\s*\{/.exec(css);
  let desktop: TokenMap = {};
  let withoutMedia = css;
  if (mediaMatch) {
    const openIndex = mediaMatch.index + mediaMatch[0].length - 1;
    const body = blockBody(css, openIndex);
    desktop = declarations(body);
    withoutMedia = css.slice(0, mediaMatch.index) + css.slice(openIndex + body.length + 2);
  }

  const rootMatch = /:root\s*\{/.exec(withoutMedia);
  if (!rootMatch) throw new Error('tokens.css sem bloco :root');
  const base = declarations(blockBody(withoutMedia, rootMatch.index + rootMatch[0].length - 1));

  return { base, desktop };
}
