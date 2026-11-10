export type RecoveryLink =
  { kind: 'tokens'; accessToken: string; refreshToken: string } | { kind: 'invalid' };

let link: RecoveryLink | null = null;

/**
 * Lê o retorno do link de recuperação e tira os tokens da URL. Precisa rodar antes
 * de o roteador existir, para eles nunca entrarem no histórico de navegação.
 */
export function consumeRecoveryHash(): void {
  const params = new URLSearchParams(window.location.hash.slice(1));
  // Qualquer outro hash não pertence a este fluxo.
  if (!params.has('access_token') && !params.has('error_code')) return;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  link =
    accessToken && refreshToken && params.get('type') === 'recovery'
      ? { kind: 'tokens', accessToken, refreshToken }
      : { kind: 'invalid' };

  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
}

export const getRecoveryLink = (): RecoveryLink | null => link;

export function clearRecoveryLink(): void {
  link = null;
}
