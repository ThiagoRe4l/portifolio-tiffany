// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 005, T07 (D6). Cabeçalhos do Cloudflare Pages: as fotos têm nome único, então
// podem ficar guardadas no navegador por um ano. O resto do site segue o padrão.

const FILE = 'public/_headers';

describe(FILE, () => {
  it('existe em public/, para o Vite copiar para o dist', () => {
    expect(existsSync(fromRoot(FILE))).toBe(true);
  });

  it('só as fotos ganham cache longo e imutável', () => {
    const lines = readFileSync(fromRoot(FILE), 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.trim().startsWith('#'));

    expect(lines).toEqual(['/fotos/*', '  Cache-Control: public, max-age=31536000, immutable']);
  });
});
