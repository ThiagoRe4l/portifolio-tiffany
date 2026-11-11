import { isAuthRedirectHash, NEW_PASSWORD_PATH } from '@/lib/authRedirect';

export type Entry =
  { kind: 'admin' } | { kind: 'site'; redirectTo?: '/' } | { kind: 'recoveryRedirect'; to: string };

const ADMIN_PATH = /^\/admin(\/|$)/;

/**
 * Decide o que a página carrega a partir do caminho da URL.
 * - `/admin` e `/admin/…`: o admin (carregado sob demanda, com o próprio roteador).
 * - `/`: o site público.
 * - qualquer outro caminho: o site público, com a URL corrigida para `/`.
 * - fora do admin, com o retorno de um link de e-mail no hash: a tela de nova senha
 *   (a volta do link pode cair na Site URL; spec 003, T11).
 */
export function resolveEntry(pathname: string, hash = ''): Entry {
  if (ADMIN_PATH.test(pathname)) return { kind: 'admin' };
  if (isAuthRedirectHash(hash))
    return { kind: 'recoveryRedirect', to: `${NEW_PASSWORD_PATH}${hash}` };
  if (pathname === '/') return { kind: 'site' };
  return { kind: 'site', redirectTo: '/' };
}
