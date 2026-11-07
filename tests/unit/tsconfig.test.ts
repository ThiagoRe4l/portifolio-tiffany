import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

type TsConfig = {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  references?: { path: string }[];
};

function readTsConfig(name: string): TsConfig {
  return JSON.parse(readFileSync(fromRoot(name), 'utf8')) as TsConfig;
}

const STRICT_FLAGS = ['strict', 'noUncheckedIndexedAccess'] as const;

// CA-01: o rigor do TypeScript não pode ser desligado sem quebrar um teste.
describe('configuração do TypeScript', () => {
  it.each(['tsconfig.app.json', 'tsconfig.test.json'])('%s mantém o modo estrito', (name) => {
    const options = readTsConfig(name).compilerOptions ?? {};

    for (const flag of STRICT_FLAGS) {
      expect(options[flag], `${name}: ${flag}`).toBe(true);
    }
  });

  it('o código do site não enxerga os tipos do Node', () => {
    const types = readTsConfig('tsconfig.app.json').compilerOptions?.types;

    expect(types).not.toContain('node');
  });

  it('os testes são checados pelo typecheck', () => {
    const root = readTsConfig('tsconfig.json');
    const testConfig = readTsConfig('tsconfig.test.json');

    expect(root.references).toContainEqual({ path: './tsconfig.test.json' });
    expect(testConfig.include).toContain('tests');
  });
});
