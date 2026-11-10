import {
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
} from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

export type AuthErrorKind =
  | 'invalidCredentials'
  | 'network'
  | 'rateLimited'
  | 'unavailable'
  | 'samePassword'
  | 'weakPassword'
  | 'expiredLink'
  | 'unknown';

export type AuthResult = { ok: true } | { ok: false; kind: AuthErrorKind };

export type AdminCheck = 'admin' | 'notAdmin' | 'failed';

const OK: AuthResult = { ok: true };
const failure = (kind: AuthErrorKind): AuthResult => ({ ok: false, kind });

const EXPIRED_LINK_CODES = new Set([
  'bad_jwt',
  'otp_expired',
  'refresh_token_already_used',
  'refresh_token_not_found',
  'session_expired',
]);

/** Só o tipo do erro sai daqui: nenhum texto do servidor chega à tela. */
function classify(error: unknown): AuthErrorKind {
  if (!isAuthError(error)) return 'unknown';
  if (isAuthRetryableFetchError(error)) return error.status === 0 ? 'network' : 'unavailable';
  if (error.status === 429) return 'rateLimited';
  if (isAuthWeakPasswordError(error)) return 'weakPassword';
  if (error.code === 'same_password') return 'samePassword';
  if (
    isAuthSessionMissingError(error) ||
    error.name === 'AuthInvalidJwtError' ||
    EXPIRED_LINK_CODES.has(error.code ?? '')
  ) {
    return 'expiredLink';
  }
  // Resposta que nem é JSON: quem respondeu não foi o serviço (ex.: projeto pausado).
  if (error.name === 'AuthUnknownError' || (error.status ?? 0) >= 500) return 'unavailable';
  return 'unknown';
}

/** Executa a chamada ao SDK, que devolve o erro ou o lança, conforme o caso. */
async function attempt(
  call: () => Promise<{ error: unknown }>,
  toKind: (error: unknown) => AuthErrorKind = classify,
): Promise<AuthResult> {
  try {
    const { error } = await call();
    return error ? failure(toKind(error)) : OK;
  } catch (error) {
    return failure(toKind(error));
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function signIn(email: string, password: string): Promise<AuthResult> {
  return attempt(
    () =>
      getSupabase().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      }),
    // Toda recusa do login recebe a mesma resposta, para não revelar o estado da conta.
    (error) =>
      isAuthApiError(error) && (error.status === 400 || error.status === 403)
        ? 'invalidCredentials'
        : classify(error),
  );
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const result = await attempt(() =>
    getSupabase().auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${window.location.origin}/admin/nova-senha`,
    }),
  );
  // Qualquer outro erro poderia variar conforme a conta exista ou não.
  if (!result.ok && (result.kind === 'network' || result.kind === 'rateLimited')) return result;
  return OK;
}

export function establishRecoverySession(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<AuthResult> {
  return attempt(() =>
    getSupabase().auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    }),
  );
}

const recoveryAttempts = new WeakMap<object, Promise<AuthResult>>();

/** O token do link é de uso único: o duplo efeito do StrictMode não pode gastá-lo duas vezes. */
export function establishRecoverySessionOnce(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<AuthResult> {
  const running = recoveryAttempts.get(tokens);
  if (running) return running;

  const current = establishRecoverySession(tokens).then((result) => {
    if (!result.ok) recoveryAttempts.delete(tokens);
    return result;
  });
  recoveryAttempts.set(tokens, current);
  return current;
}

export function updatePassword(password: string): Promise<AuthResult> {
  return attempt(() => getSupabase().auth.updateUser({ password }));
}

/** Com `local`, o SDK apaga a sessão deste aparelho antes de qualquer chamada à rede. */
export async function signOut(): Promise<void> {
  await attempt(() => getSupabase().auth.signOut({ scope: 'local' }));
}

/** Iniciais do monograma, de leitura pública. `null` quando não estão disponíveis. */
export async function fetchInitials(): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .from('site_content')
      .select('initials:data->>initials')
      .eq('section', 'geral')
      .retry(false)
      .maybeSingle();
    const initials: unknown = error ? null : data?.initials;
    return typeof initials === 'string' && initials.trim() !== '' ? initials.trim() : null;
  } catch {
    return null;
  }
}

export function isAuthConfigured(): boolean {
  try {
    getSupabase();
    return true;
  } catch {
    return false;
  }
}

/**
 * Avisa a sessão inicial e cada mudança, com o id da conta ou `null`. O aviso sai do
 * callback do SDK porque chamar o SDK lá dentro pode travar. Devolve a função de parar.
 */
export function onSessionChange(listener: (userId: string | null) => void): () => void {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    const timer = setTimeout(() => {
      pending.delete(timer);
      listener(session?.user.id ?? null);
    }, 0);
    pending.add(timer);
  });

  return () => {
    pending.forEach(clearTimeout);
    data.subscription.unsubscribe();
  };
}

export async function isAdmin(userId: string): Promise<AdminCheck> {
  try {
    const { data, error } = await getSupabase()
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .retry(false) // Repetindo, o SDK deixaria a tela de carregamento por cerca de 7 s.
      .maybeSingle();
    if (error) return 'failed';
    return data ? 'admin' : 'notAdmin';
  } catch {
    return 'failed';
  }
}
