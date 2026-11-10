import { HttpResponse } from 'msw';

// Respostas falsas do Supabase para os testes (o MSW intercepta; nada chega à rede).

export const SUPABASE_URL = 'https://test.supabase.co';
export const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
export const REST_URL = `${SUPABASE_URL}/rest/v1`;
export { fakeJwt, fakeSession, fakeUser, STORAGE_KEY, USER_ID } from './fakeAuth';

/** Erro no formato atual da API de autenticação. */
export function authError(status: number, code?: string): HttpResponse<never> {
  const body = code ? { code, message: `server text: ${code}` } : { message: 'server text' };
  return HttpResponse.json(body as never, {
    status,
    headers: { 'x-supabase-api-version': '2024-01-01' },
  });
}
