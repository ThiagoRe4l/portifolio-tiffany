// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { collectInitialChunks, type BundleReport } from '../../scripts/bundle-budget.ts';
import { reportPathFor } from '../../scripts/bundle-report-plugin.ts';
import { fromRoot } from '../support/paths';

// T09 — CA-21 (spec 001, RNF de segurança). Variáveis com VITE_ vão para o navegador
// por definição; esta prova garante que a URL e a chave do Supabase NÃO estão no JS
// inicial do site (o visitante não acessa o banco) e que variáveis sem VITE_ não vão
// para nenhum arquivo do build. Roda um `vite build` de verdade numa pasta temporária.

const PROBES = {
  VITE_SUPABASE_URL: 'https://sonda-exposicao-7f3a.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sonda-chave-anon-91c2',
  SITE_URL: 'https://sonda-site-url-4b8e.example',
  REQUIRE_REMOTE_CONTENT: 'sonda-require-0d6f',
  SONDA_PRIVADA: 'sonda-privada-e21a',
};

let outDir: string;

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'env-exposure-'));
  execFileSync(
    process.execPath,
    [fromRoot('node_modules/vite/bin/vite.js'), 'build', '--outDir', outDir, '--emptyOutDir'],
    { cwd: fromRoot(), env: { ...process.env, ...PROBES }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}, 120_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
  rmSync(dirname(reportPathFor(outDir)), { recursive: true, force: true });
});

describe('exposição de variáveis no build (CA-21)', () => {
  it('a URL e a chave do Supabase não estão no JS inicial do site', () => {
    const report = JSON.parse(readFileSync(reportPathFor(outDir), 'utf8')) as BundleReport;
    const initial = collectInitialChunks(report);
    expect(initial.length).toBeGreaterThan(0);

    for (const chunk of initial) {
      const code = readFileSync(join(outDir, chunk.file), 'utf8');
      expect(code, chunk.file).not.toContain(PROBES.VITE_SUPABASE_URL);
      expect(code, chunk.file).not.toContain(PROBES.VITE_SUPABASE_ANON_KEY);
    }
  });

  it('nenhum arquivo do build contém variáveis sem VITE_', () => {
    const leaks = listFiles(outDir).flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return ['SITE_URL', 'REQUIRE_REMOTE_CONTENT', 'SONDA_PRIVADA']
        .filter((name) => text.includes(PROBES[name as keyof typeof PROBES]))
        .map((name) => `${relative(outDir, file)}: ${name}`);
    });

    expect(leaks).toEqual([]);
  });
});

// Pendência do deploy (spec 001, T14): relatórios internos do build não vão para a hospedagem.
describe('o que vai para a hospedagem', () => {
  it('a pasta publicada não tem .vite/ (manifest e relatório do bundle)', () => {
    const internal = listFiles(outDir)
      .map((file) => relative(outDir, file).split(sep).join('/'))
      .filter((file) => file.startsWith('.vite/'));

    expect(internal).toEqual([]);
  });

  it('o relatório do bundle continua existindo, ao lado da pasta publicada', () => {
    expect(JSON.parse(readFileSync(reportPathFor(outDir), 'utf8'))).toBeInstanceOf(Array);
  });
});
