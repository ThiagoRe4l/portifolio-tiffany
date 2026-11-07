/**
 * Plugin do Vite que grava `dist/.vite/bundle-report.json` com os módulos de
 * cada chunk. O manifest do Vite só lista os chunks, e o verificador de bundle
 * (scripts/bundle-budget.ts) precisa saber o que há DENTRO de cada um.
 */
import type { Plugin } from 'vite';

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
  return {
    name: 'bundle-report',
    apply: 'build',
    generateBundle(_options, bundle) {
      this.emitFile({
        type: 'asset',
        fileName: '.vite/bundle-report.json',
        source: JSON.stringify(toBundleReport(bundle as unknown as BundleLike), null, 2),
      });
    },
  };
}
