// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUDGET_BYTES,
  checkBudget,
  collectInitialChunks,
  findForbiddenModules,
  runBudget,
  type BundleReport,
} from '../../scripts/bundle-budget.ts';
import { reportPathFor, toBundleReport } from '../../scripts/bundle-report-plugin.ts';
import { fromRoot } from '../support/paths';

// RF-09 / CA-09 / CA-03: orçamento de JS inicial e nada do admin no bundle do site.

const ROOT = 'C:/projeto';

/** Bundle de exemplo: entrada + vendor estático; admin sob demanda com o próprio vendor. */
const REPORT: BundleReport = [
  {
    file: 'assets/index-A.js',
    isEntry: true,
    imports: ['assets/vendor-B.js'],
    dynamicImports: ['assets/AdminApp-C.js'],
    modules: [`${ROOT}/src/app/main.tsx`, `${ROOT}/src/site/SitePage.tsx`],
  },
  {
    file: 'assets/vendor-B.js',
    isEntry: false,
    imports: ['assets/index-A.js'], // ciclo proposital
    dynamicImports: [],
    modules: [`${ROOT}/node_modules/react-dom/cjs/react-dom-client.production.js`],
  },
  {
    file: 'assets/AdminApp-C.js',
    isEntry: false,
    imports: ['assets/vendor-B.js', 'assets/router-D.js'],
    dynamicImports: [],
    modules: [`${ROOT}/src/admin/AdminApp.tsx`],
  },
  {
    file: 'assets/router-D.js',
    isEntry: false,
    imports: [],
    dynamicImports: [],
    modules: [`${ROOT}/node_modules/react-router/dist/production/index.js`],
  },
];

describe('reportPathFor', () => {
  it('guarda o relatório ao lado da pasta publicada, nunca dentro dela', () => {
    expect(reportPathFor(join('C:', 'projeto', 'dist'))).toBe(
      join('C:', 'projeto', 'dist-report', 'bundle-report.json'),
    );
    expect(reportPathFor(join('C:', 'projeto', 'dist') + '/')).toBe(
      join('C:', 'projeto', 'dist-report', 'bundle-report.json'),
    );
  });
});

describe('toBundleReport (plugin do build)', () => {
  it('converte a saída do Rollup só com os chunks, em caminhos com "/"', () => {
    const bundle = {
      'assets/index-A.js': {
        type: 'chunk',
        fileName: 'assets/index-A.js',
        isEntry: true,
        imports: ['assets/vendor-B.js'],
        dynamicImports: ['assets/AdminApp-C.js'],
        modules: { 'C:\\projeto\\src\\app\\main.tsx': {}, '\0vite/preload-helper.js': {} },
      },
      'assets/index.css': { type: 'asset', fileName: 'assets/index.css' },
    };

    expect(toBundleReport(bundle)).toEqual([
      {
        file: 'assets/index-A.js',
        isEntry: true,
        imports: ['assets/vendor-B.js'],
        dynamicImports: ['assets/AdminApp-C.js'],
        modules: ['C:/projeto/src/app/main.tsx', '\0vite/preload-helper.js'],
      },
    ]);
  });
});

describe('collectInitialChunks', () => {
  it('inclui a entrada e os imports estáticos, sem os dinâmicos', () => {
    expect(collectInitialChunks(REPORT).map((chunk) => chunk.file)).toEqual([
      'assets/index-A.js',
      'assets/vendor-B.js',
    ]);
  });

  it('segue imports estáticos de imports estáticos', () => {
    const report: BundleReport = [
      { file: 'a.js', isEntry: true, imports: ['b.js'], dynamicImports: [], modules: [] },
      { file: 'b.js', isEntry: false, imports: ['c.js'], dynamicImports: [], modules: [] },
      { file: 'c.js', isEntry: false, imports: [], dynamicImports: [], modules: [] },
    ];

    expect(collectInitialChunks(report).map((chunk) => chunk.file)).toEqual([
      'a.js',
      'b.js',
      'c.js',
    ]);
  });
});

describe('findForbiddenModules', () => {
  it('não acusa nada quando o admin e o roteador ficam fora do conjunto inicial', () => {
    expect(findForbiddenModules(collectInitialChunks(REPORT))).toEqual([]);
  });

  it('acusa código de src/admin no conjunto inicial', () => {
    const leaked = [{ ...REPORT[0]!, modules: [`${ROOT}/src/admin/AdminLoginPage.tsx`] }];

    expect(findForbiddenModules(leaked)).toEqual([
      {
        file: 'assets/index-A.js',
        module: `${ROOT}/src/admin/AdminLoginPage.tsx`,
        reason: 'código do admin',
      },
    ]);
  });

  it('acusa o react-router no conjunto inicial (também com caminho do Windows)', () => {
    const leaked = [
      { ...REPORT[0]!, modules: ['C:\\projeto\\node_modules\\react-router\\dist\\index.js'] },
    ];

    expect(findForbiddenModules(leaked)).toEqual([
      {
        file: 'assets/index-A.js',
        module: 'C:/projeto/node_modules/react-router/dist/index.js',
        reason: 'react-router (só pode existir no admin)',
      },
    ]);
  });

  // Spec 001 (RNF de performance): Zod, schemas, conteúdo padrão e pré-renderização
  // ficam no build e no admin; o site no navegador só lê o JSON embutido.
  it.each([
    ['node_modules/zod/v4/classic/schemas.js', 'zod (só no build e no admin)'],
    ['src/content/schema.ts', 'schemas e conteúdo padrão (só no build e no admin)'],
    ['src/content/fields.ts', 'schemas e conteúdo padrão (só no build e no admin)'],
    ['src/content/defaults.ts', 'schemas e conteúdo padrão (só no build e no admin)'],
    ['src/content/load.ts', 'schemas e conteúdo padrão (só no build e no admin)'],
    ['src/content/transform.ts', 'schemas e conteúdo padrão (só no build e no admin)'],
    ['src/prerender/head.ts', 'código da pré-renderização (só no build)'],
    ['src/app/renderSite.tsx', 'código da pré-renderização (só no build)'],
    ['src/app/entry-server.tsx', 'código da pré-renderização (só no build)'],
    // Spec 003 (RF-15, CA-15): o SDK e os pacotes dele entram só no admin.
    ['node_modules/@supabase/supabase-js/dist/index.mjs', 'SDK do Supabase (só no admin)'],
    ['node_modules/@supabase/auth-js/dist/module/index.js', 'SDK do Supabase (só no admin)'],
  ])('acusa %s no conjunto inicial', (path, reason) => {
    const leaked = [{ ...REPORT[0]!, modules: [`${ROOT}/${path}`] }];

    expect(findForbiddenModules(leaked)).toEqual([
      { file: 'assets/index-A.js', module: `${ROOT}/${path}`, reason },
    ]);
  });

  it.each(['src/content/ContentProvider.tsx', 'src/content/embedded.ts', 'src/lib/whatsapp.ts'])(
    'permite %s no site',
    (path) => {
      expect(findForbiddenModules([{ ...REPORT[0]!, modules: [`${ROOT}/${path}`] }])).toEqual([]);
    },
  );
});

describe('checkBudget', () => {
  it('o limite é 150 KB', () => {
    expect(BUDGET_BYTES).toBe(150 * 1024);
  });

  it('soma os tamanhos gzip e aprova até o limite (inclusive)', () => {
    const result = checkBudget([
      { file: 'a.js', gzipBytes: BUDGET_BYTES - 100 },
      { file: 'b.js', gzipBytes: 100 },
    ]);

    expect(result).toEqual({ totalBytes: BUDGET_BYTES, ok: true });
  });

  it('reprova acima do limite', () => {
    expect(checkBudget([{ file: 'a.js', gzipBytes: BUDGET_BYTES + 1 }]).ok).toBe(false);
  });
});

describe('runBudget e linha de comando', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** Cria um dist/ falso com os arquivos JS e o relatório ao lado (fora do que é publicado). */
  function fakeDist(files: Record<string, Buffer | string>, report: BundleReport): string {
    const dist = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
    const reportPath = reportPathFor(dist);
    dirs.push(dist, dirname(reportPath));
    mkdirSync(dirname(reportPath), { recursive: true });
    mkdirSync(join(dist, 'assets'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report));
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dist, file), content);
    return dist;
  }

  const SMALL = { 'assets/index-A.js': 'console.log(1);'.repeat(100) };
  const SMALL_REPORT: BundleReport = [
    {
      file: 'assets/index-A.js',
      isEntry: true,
      imports: [],
      dynamicImports: [],
      modules: [`${ROOT}/src/app/main.tsx`],
    },
  ];

  it('aprova um bundle pequeno e mede o gzip de verdade', () => {
    const result = runBudget(fakeDist(SMALL, SMALL_REPORT));

    expect(result.ok).toBe(true);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.totalBytes).toBeLessThan(200);
    expect(result.problems).toEqual([]);
  });

  it('reprova um bundle que passa de 150 KB gzip', () => {
    // Bytes aleatórios não comprimem: 200 KB continuam ~200 KB em gzip.
    const big = { 'assets/index-A.js': randomBytes(200 * 1024) };

    const result = runBudget(fakeDist(big, SMALL_REPORT));

    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/acima do limite de 150 KB/);
  });

  it('reprova quando há código proibido no conjunto inicial, mesmo pequeno', () => {
    const report = [{ ...SMALL_REPORT[0]!, modules: [`${ROOT}/src/admin/AdminApp.tsx`] }];

    const result = runBudget(fakeDist(SMALL, report));

    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/código do admin/);
  });

  it('reprova quando o SDK do Supabase está no conjunto inicial, mesmo pequeno', () => {
    const report = [
      {
        ...SMALL_REPORT[0]!,
        modules: [`${ROOT}/node_modules/@supabase/supabase-js/dist/index.mjs`],
      },
    ];

    const result = runBudget(fakeDist(SMALL, report));

    expect(result.ok).toBe(false);
    expect(result.problems.join('\n')).toMatch(/SDK do Supabase/);
  });

  it('explica o que fazer quando não há build', () => {
    const empty = mkdtempSync(join(tmpdir(), 'bundle-budget-'));
    dirs.push(empty);

    expect(() => runBudget(empty)).toThrow(/npm run build/);
  });

  it('a linha de comando sai com código 0 quando passa e 1 quando reprova', () => {
    const script = fromRoot('scripts/bundle-budget.ts');
    const run = (dist: string) => {
      try {
        // stderr capturado (e não herdado) para a reprovação proposital não poluir o terminal.
        const output = execFileSync(process.execPath, [script, dist], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { code: 0, output };
      } catch (error) {
        const failed = error as { status: number; stdout: string; stderr: string };
        return { code: failed.status, output: failed.stdout + failed.stderr };
      }
    };

    const ok = run(fakeDist(SMALL, SMALL_REPORT));
    const over = run(fakeDist({ 'assets/index-A.js': randomBytes(200 * 1024) }, SMALL_REPORT));

    expect(ok.code).toBe(0);
    expect(ok.output).toMatch(/JS inicial: [\d,.]+ KB gzip/);
    expect(over.code).toBe(1);
  }, 30_000);
});
