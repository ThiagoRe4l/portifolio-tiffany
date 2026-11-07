// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// CA-11: arquivos de ambiente nunca vão para o repositório; o exemplo vai.

function isIgnored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--no-index', path], { cwd: fromRoot() });
    return true;
  } catch {
    return false;
  }
}

describe('variáveis de ambiente e git', () => {
  it.each(['.env', '.env.local', '.env.production', '.env.development.local'])(
    '%s é ignorado pelo git',
    (file) => {
      expect(isIgnored(file)).toBe(true);
    },
  );

  it('.env.example NÃO é ignorado', () => {
    expect(isIgnored('.env.example')).toBe(false);
  });

  it('.env.example lista as variáveis públicas sem valores', () => {
    const lines = readFileSync(fromRoot('.env.example'), 'utf8').trim().split(/\r?\n/);

    expect(lines).toEqual(['VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY=']);
  });
});
