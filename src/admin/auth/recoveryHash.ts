import { isAuthRedirectHash, NEW_PASSWORD_PATH } from '@/lib/authRedirect';

export type RecoveryLink =
  { kind: 'tokens'; accessToken: string; refreshToken: string } | { kind: 'invalid' };

let link: RecoveryLink | null = null;

/**
 * Lê o retorno do link de recuperação e tira os tokens da URL. Precisa rodar antes
 * de o roteador existir, para eles nunca entrarem no histórico de navegação.
 * Se a volta do link caiu em outra rota do admin, a URL já passa a ser a da nova senha.
 */
export function consumeRecoveryHash(): void {
  if (!isAuthRedirectHash(window.location.hash)) return;
  const params = new URLSearchParams(window.location.hash.slice(1));

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  link =
    accessToken && refreshToken && params.get('type') === 'recovery'
      ? { kind: 'tokens', accessToken, refreshToken }
      : { kind: 'invalid' };

  window.history.replaceState(
    window.history.state,
    '',
    `${NEW_PASSWORD_PATH}${window.location.search}`,
  );
}

export const getRecoveryLink = (): RecoveryLink | null => link;

export function clearRecoveryLink(): void {
  link = null;
}
