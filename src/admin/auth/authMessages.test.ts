import { describe, expect, it } from 'vitest';
import { AUTH_NOTICES, messageFor } from './authMessages';
import type { AuthErrorKind } from './authApi';

// Spec 003, T03 (RF-05, RF-06, RF-09, RF-10, RF-16).

describe('messageFor', () => {
  it('credenciais erradas têm o texto exato da spec', () => {
    expect(messageFor('invalidCredentials')).toBe('E-mail ou senha incorretos.');
  });

  const kinds: AuthErrorKind[] = [
    'invalidCredentials',
    'network',
    'rateLimited',
    'unavailable',
    'samePassword',
    'weakPassword',
    'expiredLink',
    'unknown',
  ];

  it('cada tipo de erro tem a sua mensagem', () => {
    expect(new Set(kinds.map(messageFor)).size).toBe(kinds.length);
  });

  it.each(kinds)('%s: frase em português, sem termo técnico', (kind) => {
    const message = messageFor(kind);

    expect(message).toMatch(/^[A-ZÁÉÍÓÚ].*\.$/);
    expect(message).not.toMatch(/\b(error|failed|token|jwt|http|api|supabase|\d{3})\b/i);
  });
});

describe('AUTH_NOTICES', () => {
  it('traz os textos exatos da spec', () => {
    expect(AUTH_NOTICES).toEqual({
      recoverySent:
        'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.',
      sessionExpired: 'Sua sessão expirou. Entre novamente.',
      sessionExpiredUnsaved:
        'Sua sessão expirou e as alterações não salvas foram perdidas. Entre novamente.',
      accessDenied: 'Esta conta não tem acesso à área administrativa.',
      checkFailed:
        'Não foi possível confirmar seu acesso. Verifique sua conexão e tente novamente.',
      unconfigured: 'Área administrativa indisponível no momento.',
    });
  });
});
