// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  E2E_SUPABASE_ANON_KEY,
  E2E_SUPABASE_URL,
  e2eBuildArgs,
  e2eBuildEnv,
} from '../../scripts/e2e-build.ts';
import { fromRoot } from '../support/paths';

// Spec 003, T09 (D8). O build do E2E nunca pode apontar para o Supabase real.

const REAL = {
  VITE_SUPABASE_URL: 'https://projeto-real.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-real',
  REQUIRE_REMOTE_CONTENT: 'true',
  PATH: '/bin',
};

describe('e2eBuildEnv', () => {
  it('troca a URL e a chave pelas falsas, mesmo com as reais no ambiente', () => {
    const env = e2eBuildEnv(REAL);

    expect(env.VITE_SUPABASE_URL).toBe(E2E_SUPABASE_URL);
    expect(env.VITE_SUPABASE_ANON_KEY).toBe(E2E_SUPABASE_ANON_KEY);
    expect(JSON.stringify(env)).not.toContain('projeto-real');
    expect(JSON.stringify(env)).not.toContain('chave-real');
  });

  it('o endereço falso usa o domínio reservado .invalid, que nunca resolve', () => {
    expect(new URL(E2E_SUPABASE_URL).hostname).toMatch(/\.invalid$/);
  });

  it('não exige o conteúdo remoto, que conflita com o build offline', () => {
    expect(e2eBuildEnv(REAL)).not.toHaveProperty('REQUIRE_REMOTE_CONTENT');
  });

  it('mantém o resto do ambiente', () => {
    expect(e2eBuildEnv(REAL).PATH).toBe('/bin');
  });

  it('não altera o ambiente recebido', () => {
    const base = { ...REAL };

    e2eBuildEnv(base);

    expect(base).toEqual(REAL);
  });
});

describe('comando', () => {
  it('roda o build normal, com a pré-renderização offline', () => {
    expect(e2eBuildArgs).toEqual(['run', 'build', '--', '--offline']);
  });

  it('npm run test:e2e usa este build antes do Playwright', () => {
    const { scripts } = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(scripts['test:e2e']).toBe('node scripts/e2e-build.ts && playwright test');
  });
});
