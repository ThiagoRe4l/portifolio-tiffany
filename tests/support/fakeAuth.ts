// Sessões e contas falsas, sem dependências: usadas pelo Vitest (com MSW) e pelo Playwright.

export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const STORAGE_KEY = 'admin-auth';

const base64Url = (value: object) => btoa(JSON.stringify(value)).replaceAll('=', '');

/** Token com o formato de um JWT; a assinatura é falsa, e o cliente não a confere. */
export function fakeJwt(claims: Record<string, unknown> = {}): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const payload = { sub: USER_ID, exp, role: 'authenticated', ...claims };
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.assinatura`;
}

export const fakeUser = (id = USER_ID) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'pessoa@exemplo.test',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-11-08T00:00:00Z',
});

export function fakeSession(accessToken = fakeJwt()) {
  return {
    access_token: accessToken,
    refresh_token: 'refresh-de-teste',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: fakeUser(),
  };
}
