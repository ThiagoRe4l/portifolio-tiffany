/**
 * Plugin do Vite que grava `dist-report/bundle-report.json` com os módulos de
 * cada chunk. O manifest do Vite só lista os chunks, e o verificador de bundle
 * (scripts/bundle-budget.ts) precisa saber o que há DENTRO de cada um.
 * O relatório fica AO LADO da pasta publicada (não vai para a hospedagem).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/** `<pasta>-report/bundle-report.json`, ao lado da pasta publicada. */
export function reportPathFor(distDir: string): string {
  const dir = distDir.replace(/[\\/]+$/, '');
  return join(dirname(dir), `${basename(dir)}-report`, 'bundle-report.json');
}

export type ChunkReport = {
  file: string;
  isEntry: boolean;
  imports: string[];
  dynamicImports: string[];
  modules: string[];
};

/** Forma mínima da saída do Rollup/Rolldown que o relatório usa. */
type BundleLike = Record<
  string,
  {
    type: string;
    fileName: string;
    isEntry?: boolean;
    imports?: string[];
    dynamicImports?: string[];
    modules?: Record<string, unknown>;
  }
>;

const toPosix = (path: string) => path.replaceAll('\\', '/');

export function toBundleReport(bundle: BundleLike): ChunkReport[] {
  const report: ChunkReport[] = [];
  for (const output of Object.values(bundle)) {
    if (output.type !== 'chunk') continue;
    report.push({
      file: output.fileName,
      isEntry: output.isEntry ?? false,
      imports: [...(output.imports ?? [])],
      dynamicImports: [...(output.dynamicImports ?? [])],
      modules: Object.keys(output.modules ?? {}).map(toPosix),
    });
  }
  return report;
}

export function bundleReportPlugin(): Plugin {
  let isSsrBuild = false;
  let outDir = 'dist';
  return {
    name: 'bundle-report',
    apply: 'build',
    configResolved(config) {
      isSsrBuild = Boolean(config.build.ssr);
      outDir = resolve(config.root, config.build.outDir);
    },
    writeBundle(options, bundle) {
      // A compilação SSR (pré-renderização) não vai para o navegador.
      if (isSsrBuild) return;
      const reportPath = reportPathFor(options.dir ?? outDir);
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(
        reportPath,
        JSON.stringify(toBundleReport(bundle as unknown as BundleLike), null, 2),
      );
    },
  };
}
