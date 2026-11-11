/**
 * Retorno dos links de e-mail do Supabase (spec 003). Fica em `lib` porque o site
 * também precisa reconhecê-lo, e o site não pode importar nada de `src/admin`.
 */
export const NEW_PASSWORD_PATH = '/admin/nova-senha';

/** O hash traz tokens ou um erro do link? Qualquer outro hash não é deste fluxo. */
export function isAuthRedirectHash(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.has('access_token') || params.has('error_code');
}
