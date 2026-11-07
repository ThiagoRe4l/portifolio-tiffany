import { existsSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SitePage } from '@/site/SitePage';
import { fromRoot } from '../support/paths';

// Pastas da seção 10 do CLAUDE.md.
const REQUIRED_DIRECTORIES = [
  'specs',
  'src/app',
  'src/content',
  'src/site',
  'src/admin',
  'src/lib',
  'src/styles',
  'tests/e2e',
  'tests/fixtures',
  'supabase',
];

// CA-02: estrutura de pastas e alias de importação.
describe('estrutura do projeto', () => {
  it.each(REQUIRED_DIRECTORIES)('a pasta %s existe', (directory) => {
    const path = fromRoot(directory);

    expect(existsSync(path) && statSync(path).isDirectory()).toBe(true);
  });

  it('o alias @/ resolve para src/ no Vitest', () => {
    expect(SitePage).toBeTypeOf('function');
  });
});
