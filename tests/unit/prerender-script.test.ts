// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runPrerender } from '../../scripts/prerender.ts';
import { fromRoot } from '../support/paths';

// T09 — script que grava a pré-renderização no dist (spec 001, RF-11).
// Usa um dist e uma entrada SSR falsos numa pasta temporária.

const TEMPLATE = '<html><head><!--app-head--></head><body><div id="root"></div></body></html>';

const OK_ENTRY = `
export async function prerender({ env, template }) {
  return {
    source: 'defaults',
    warnings: ['aviso de teste'],
    files: {
      'index.html': template.replace('<!--app-head-->', '<title>ok</title>'),
      'admin.html': 'admin',
      'robots.txt': 'site=' + (env.SITE_URL ?? 'nenhum'),
    },
  };
}
`;

const FAILING_ENTRY = `
export async function prerender() {
  throw new Error('Falha ao ler o conteúdo do Supabase: HTTP 503');
}
`;

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fakeBuild(entrySource: string, { withTemplate = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'prerender-'));
  dirs.push(root);
  const distDir = join(root, 'dist');
  mkdirSync(distDir);
  if (withTemplate) writeFileSync(join(distDir, 'index.html'), TEMPLATE);
  const serverEntry = join(root, 'entry-server.mjs');
  writeFileSync(serverEntry, entrySource);
  return { distDir, serverEntry };
}

function runCli(args: string[], env: Record<string, string> = {}) {
  try {
    const output = execFileSync(process.execPath, [fromRoot('scripts/prerender.ts'), ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    return { code: 0, output };
  } catch (error) {
    const failed = error as { status: number; stdout: string; stderr: string };
    return { code: failed.status, output: failed.stdout + failed.stderr };
  }
}

describe('runPrerender', () => {
  it('passa o template e o env para a entrada SSR e grava os arquivos no dist', async () => {
    const { distDir, serverEntry } = fakeBuild(OK_ENTRY);

    const result = await runPrerender({
      distDir,
      serverEntry,
      env: { SITE_URL: 'https://exemplo.com.br' },
    });

    expect(result.written.sort()).toEqual(['admin.html', 'index.html', 'robots.txt']);
    expect(result.warnings).toEqual(['aviso de teste']);
    expect(readFileSync(join(distDir, 'index.html'), 'utf8')).toContain('<title>ok</title>');
    expect(readFileSync(join(distDir, 'admin.html'), 'utf8')).toBe('admin');
    expect(readFileSync(join(distDir, 'robots.txt'), 'utf8')).toBe('site=https://exemplo.com.br');
  });

  it('sem dist/index.html, explica que o vite build precisa rodar antes', async () => {
    const { distDir, serverEntry } = fakeBuild(OK_ENTRY, { withTemplate: false });

    await expect(runPrerender({ distDir, serverEntry, env: {} })).rejects.toThrow(/vite build/);
  });

  it('propaga a falha da entrada SSR sem gravar nada', async () => {
    const { distDir, serverEntry } = fakeBuild(FAILING_ENTRY);

    await expect(runPrerender({ distDir, serverEntry, env: {} })).rejects.toThrow(/HTTP 503/);
    expect(readFileSync(join(distDir, 'index.html'), 'utf8')).toBe(TEMPLATE);
  });
});

describe('linha de comando', () => {
  it('sai com 0, lista o resultado e mostra os avisos', () => {
    const { distDir, serverEntry } = fakeBuild(OK_ENTRY);

    const { code, output } = runCli(['--dist', distDir, '--server', serverEntry], {
      SITE_URL: 'https://cli.exemplo.com.br',
    });

    expect(code).toBe(0);
    expect(output).toMatch(/Pré-renderização: 3 arquivos/);
    expect(output).toMatch(/aviso de teste/);
    expect(readFileSync(join(distDir, 'robots.txt'), 'utf8')).toBe(
      'site=https://cli.exemplo.com.br',
    );
  });

  it('sai com 1 e mostra o motivo quando a pré-renderização falha', () => {
    const { distDir, serverEntry } = fakeBuild(FAILING_ENTRY);

    const { code, output } = runCli(['--dist', distDir, '--server', serverEntry]);

    expect(code).toBe(1);
    expect(output).toMatch(/Pré-renderização falhou: .*HTTP 503/);
  });
});

// Testes E2E nunca acessam o Supabase real (CLAUDE.md §4), mesmo com o .env preenchido.
describe('--offline', () => {
  const ENV_ENTRY = `
export async function prerender({ env }) {
  const pick = (name) => env[name] ?? null;
  return {
    source: 'defaults',
    warnings: [],
    files: {
      'env.json': JSON.stringify({
        url: pick('VITE_SUPABASE_URL'),
        key: pick('VITE_SUPABASE_ANON_KEY'),
        site: pick('SITE_URL'),
      }),
    },
  };
}
`;
  const SUPABASE_ENV = {
    VITE_SUPABASE_URL: 'https://real.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'chave-real',
    SITE_URL: 'https://site.exemplo.com.br',
  };
  const readEnvFile = (distDir: string) =>
    JSON.parse(readFileSync(join(distDir, 'env.json'), 'utf8')) as Record<string, string | null>;

  it('sem --offline, a entrada SSR recebe as variáveis do Supabase', () => {
    const { distDir, serverEntry } = fakeBuild(ENV_ENTRY);

    expect(runCli(['--dist', distDir, '--server', serverEntry], SUPABASE_ENV).code).toBe(0);
    expect(readEnvFile(distDir)).toEqual({
      url: 'https://real.supabase.co',
      key: 'chave-real',
      site: 'https://site.exemplo.com.br',
    });
  });

  it('com --offline, as variáveis do Supabase não chegam à entrada SSR', () => {
    const { distDir, serverEntry } = fakeBuild(ENV_ENTRY);

    const { code, output } = runCli(
      ['--dist', distDir, '--server', serverEntry, '--offline'],
      SUPABASE_ENV,
    );

    expect(code).toBe(0);
    expect(output).toMatch(/offline/i);
    expect(readEnvFile(distDir)).toEqual({
      url: null,
      key: null,
      site: 'https://site.exemplo.com.br',
    });
  });

  it('--offline com REQUIRE_REMOTE_CONTENT=true falha (nunca publicar o padrão por engano)', () => {
    const { distDir, serverEntry } = fakeBuild(ENV_ENTRY);

    const { code, output } = runCli(['--dist', distDir, '--server', serverEntry, '--offline'], {
      ...SUPABASE_ENV,
      REQUIRE_REMOTE_CONTENT: 'true',
    });

    expect(code).toBe(1);
    expect(output).toMatch(/--offline.*REQUIRE_REMOTE_CONTENT/s);
  });

  // Spec 003: o build do E2E passou para scripts/e2e-build.ts, que mantém o --offline
  // (provado em tests/unit/e2e-build.test.ts).
});

describe('configuração do build', () => {
  it('npm run build compila o site, a entrada SSR e roda a pré-renderização, nessa ordem', () => {
    const { scripts } = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(scripts.build).toBe(
      'tsc -b && vite build && vite build --ssr src/app/entry-server.tsx --outDir dist-server && node --env-file-if-exists=.env scripts/prerender.ts',
    );
  });

  it.each(['.gitignore', '.prettierignore'])('%s ignora dist-server e dist-report', (file) => {
    const lines = readFileSync(fromRoot(file), 'utf8').split(/\r?\n/);

    expect(lines).toContain('dist-server');
    expect(lines).toContain('dist-report');
  });

  it('o ESLint ignora dist-server e dist-report', () => {
    const config = readFileSync(fromRoot('eslint.config.js'), 'utf8');

    expect(config).toMatch(/['"]dist-server['"]/);
    expect(config).toMatch(/['"]dist-report['"]/);
  });
});
