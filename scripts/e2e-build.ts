/**
 * Build usado pelo E2E (`npm run test:e2e`), spec 003 D8.
 * Aponta o admin para um Supabase falso num domínio `.invalid`, que nunca resolve:
 * as variáveis do processo têm prioridade sobre o `.env`, então nenhum teste
 * consegue tocar o banco real. O Playwright responde a essas chamadas.
 */
import { spawnSync } from 'node:child_process';

export const E2E_SUPABASE_URL = 'https://supabase.e2e.invalid';
export const E2E_SUPABASE_ANON_KEY = 'chave-anon-e2e';

/** A pré-renderização continua offline: o site usa o conteúdo padrão. */
export const e2eBuildArgs = ['run', 'build', '--', '--offline'];

export function e2eBuildEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...base,
    VITE_SUPABASE_URL: E2E_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: E2E_SUPABASE_ANON_KEY,
  };
  delete env.REQUIRE_REMOTE_CONTENT;
  return env;
}

if (import.meta.main) {
  // Comando inteiro numa string: no Windows o npm precisa do shell, e o Node reprova
  // shell com lista de argumentos. Os argumentos são fixos, sem nada vindo de fora.
  const result = spawnSync(`npm ${e2eBuildArgs.join(' ')}`, {
    env: e2eBuildEnv(process.env),
    stdio: 'inherit',
    shell: true,
  });
  process.exitCode = result.status ?? 1;
}
