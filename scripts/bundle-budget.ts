/**
 * Verificador do orçamento de JS inicial do site (CLAUDE.md §7).
 * Uso: `npm run size` (depois de `npm run build`), ou `node scripts/bundle-budget.ts [pasta-dist]`.
 * Falha se o JS inicial passar de 150 KB gzip ou se contiver código do admin
 * ou o react-router (que só podem existir no chunk do admin).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { ChunkReport } from './bundle-report-plugin.ts';

export type BundleReport = ChunkReport[];

export const BUDGET_BYTES = 150 * 1024;

const FORBIDDEN = [
  { pattern: /\/src\/admin\//, reason: 'código do admin' },
  { pattern: /\/node_modules\/react-router\//, reason: 'react-router (só pode existir no admin)' },
];

export type ForbiddenModule = { file: string; module: string; reason: string };

/** Entradas e tudo o que elas importam estaticamente (imports dinâmicos ficam de fora). */
export function collectInitialChunks(report: BundleReport): ChunkReport[] {
  const byFile = new Map(report.map((chunk) => [chunk.file, chunk]));
  const visited = new Set<string>();
  const queue = report.filter((chunk) => chunk.isEntry).map((chunk) => chunk.file);

  while (queue.length > 0) {
    const file = queue.shift();
    if (file === undefined || visited.has(file)) continue;
    visited.add(file);
    queue.push(...(byFile.get(file)?.imports ?? []));
  }

  return report.filter((chunk) => visited.has(chunk.file));
}

export function findForbiddenModules(chunks: ChunkReport[]): ForbiddenModule[] {
  const found: ForbiddenModule[] = [];
  for (const chunk of chunks) {
    for (const rawModule of chunk.modules) {
      const module = rawModule.replaceAll('\\', '/');
      const rule = FORBIDDEN.find(({ pattern }) => pattern.test(module));
      if (rule) found.push({ file: chunk.file, module, reason: rule.reason });
    }
  }
  return found;
}

export function checkBudget(sizes: { file: string; gzipBytes: number }[]): {
  totalBytes: number;
  ok: boolean;
} {
  const totalBytes = sizes.reduce((sum, size) => sum + size.gzipBytes, 0);
  return { totalBytes, ok: totalBytes <= BUDGET_BYTES };
}

export type BudgetResult = {
  ok: boolean;
  totalBytes: number;
  sizes: { file: string; gzipBytes: number }[];
  problems: string[];
};

const kb = (bytes: number) => (bytes / 1024).toFixed(1).replace('.', ',');

export function runBudget(distDir: string): BudgetResult {
  const reportPath = resolve(distDir, '.vite/bundle-report.json');
  if (!existsSync(reportPath)) {
    throw new Error(
      `Relatório do bundle não encontrado em ${reportPath}. Rode npm run build antes.`,
    );
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as BundleReport;
  const initial = collectInitialChunks(report);
  const sizes = initial.map((chunk) => ({
    file: chunk.file,
    gzipBytes: gzipSync(readFileSync(resolve(distDir, chunk.file))).length,
  }));

  const { totalBytes, ok: withinBudget } = checkBudget(sizes);
  const forbidden = findForbiddenModules(initial);

  const problems: string[] = [];
  if (!withinBudget) {
    problems.push(`JS inicial com ${kb(totalBytes)} KB gzip, acima do limite de 150 KB.`);
  }
  // Agrupa por arquivo + motivo, para a saída não listar dezenas de módulos.
  const groups = new Map<string, ForbiddenModule[]>();
  for (const item of forbidden) {
    const key = `${item.file}\u0000${item.reason}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  for (const items of groups.values()) {
    const [first] = items;
    if (!first) continue;
    const count = items.length === 1 ? '1 módulo' : `${items.length} módulos`;
    problems.push(`${first.file} contém ${first.reason} (${count}, ex.: ${first.module})`);
  }

  return { ok: problems.length === 0, totalBytes, sizes, problems };
}

if (import.meta.main) {
  const distDir = resolve(process.argv[2] ?? 'dist');
  try {
    const result = runBudget(distDir);
    for (const size of result.sizes) console.log(`  ${size.file}  ${kb(size.gzipBytes)} KB gzip`);
    console.log(`JS inicial: ${kb(result.totalBytes)} KB gzip (limite: 150 KB)`);
    for (const problem of result.problems) console.error(`✗ ${problem}`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(`✗ ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
