export type Entry = { kind: 'admin' } | { kind: 'site'; redirectTo?: '/' };

const ADMIN_PATH = /^\/admin(\/|$)/;

/**
 * Decide o que a página carrega a partir do caminho da URL.
 * - `/admin` e `/admin/…`: o admin (carregado sob demanda, com o próprio roteador).
 * - `/`: o site público.
 * - qualquer outro caminho: o site público, com a URL corrigida para `/`.
 */
export function resolveEntry(pathname: string): Entry {
  if (ADMIN_PATH.test(pathname)) return { kind: 'admin' };
  if (pathname === '/') return { kind: 'site' };
  return { kind: 'site', redirectTo: '/' };
}
