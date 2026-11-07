/**
 * Último passo do `npm run build` (spec 001, RF-11): lê o `dist/index.html` gerado
 * pelo Vite, chama a `prerender()` da compilação SSR e grava os arquivos no dist.
 * Uso: `node scripts/prerender.ts [--dist pasta] [--server arquivo]`.
 * As variáveis vêm do ambiente (na hospedagem) ou do `.env` (`--env-file-if-exists`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

type PrerenderModule = {
  prerender(options: {
    env: Record<string, string | undefined>;
    template: string;
  }): Promise<{ files: Record<string, string>; warnings: string[]; source: string }>;
};

export type RunPrerenderOptions = {
  distDir: string;
  serverEntry: string;
  env: Record<string, string | undefined>;
};

export async function runPrerender(options: RunPrerenderOptions) {
  const templatePath = resolve(options.distDir, 'index.html');
  if (!existsSync(templatePath)) {
    throw new Error(`${templatePath} não encontrado. Rode o vite build antes.`);
  }
  const template = readFileSync(templatePath, 'utf8');

  const entry = (await import(pathToFileURL(resolve(options.serverEntry)).href)) as PrerenderModule;
  const { files, warnings, source } = await entry.prerender({ env: options.env, template });

  for (const [name, text] of Object.entries(files)) {
    writeFileSync(resolve(options.distDir, name), text);
  }
  return { written: Object.keys(files), warnings, source };
}

/**
 * `--offline` (usado pelo `npm run test:e2e`): ignora o Supabase mesmo com o `.env`
 * preenchido, para nenhum teste acessar o banco real. Recusa o modo da hospedagem.
 */
function offlineEnv(env: Record<string, string | undefined>) {
  if (env.REQUIRE_REMOTE_CONTENT === 'true') {
    throw new Error('--offline não pode ser usado com REQUIRE_REMOTE_CONTENT=true.');
  }
  const { VITE_SUPABASE_URL: _url, VITE_SUPABASE_ANON_KEY: _key, ...rest } = env;
  void _url;
  void _key;
  console.log('Pré-renderização offline: Supabase ignorado, usando o conteúdo padrão.');
  return rest;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      dist: { type: 'string', default: 'dist' },
      server: { type: 'string', default: 'dist-server/entry-server.js' },
      offline: { type: 'boolean', default: false },
    },
  });

  try {
    const result = await runPrerender({
      distDir: values.dist,
      serverEntry: values.server,
      env: values.offline ? offlineEnv(process.env) : process.env,
    });
    const origin = result.source === 'supabase' ? 'Supabase' : 'conteúdo padrão';
    console.log(
      `Pré-renderização: ${result.written.length} arquivos (${origin}): ${result.written.join(', ')}`,
    );
    // Avisos na saída padrão: informativos, o build segue (falhas vão para stderr).
    for (const warning of result.warnings) console.log(`⚠ ${warning}`);
  } catch (error) {
    console.error(`Pré-renderização falhou: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
