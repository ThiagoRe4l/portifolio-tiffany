import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabase } from '@/lib/supabase';
import { server } from '../../../tests/setup/msw';
import {
  AUTH_URL,
  authError,
  fakeJwt,
  fakeSession,
  fakeUser,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../../tests/support/supabaseAuth';
import {
  establishRecoverySession,
  isAdmin,
  onSessionChange,
  requestPasswordReset,
  signIn,
  signOut,
  updatePassword,
  type AuthErrorKind,
} from './authApi';

// Spec 003, T03 (D4). Usa o SDK de verdade; só a rede é simulada.

const TOKEN_URL = `${AUTH_URL}/token`;
const RECOVER_URL = `${AUTH_URL}/recover`;
const USER_URL = `${AUTH_URL}/user`;
const LOGOUT_URL = `${AUTH_URL}/logout`;
const ADMINS_URL = `${REST_URL}/admins`;

const networkDown = () => HttpResponse.error();
const htmlPage = (status: number) => () =>
  new HttpResponse('<html>fora do ar</html>', {
    status,
    headers: { 'content-type': 'text/html' },
  });

const stored = () => localStorage.getItem(STORAGE_KEY);

/** Entra de verdade pelo SDK, para os testes que precisam de sessão. */
async function withSession(accessToken = fakeJwt()) {
  server.use(http.post(TOKEN_URL, () => HttpResponse.json(fakeSession(accessToken))));
  await signIn('pessoa@exemplo.test', 'senha-valida');
}

afterEach(() => {
  localStorage.clear();
});

describe('signIn', () => {
  it('sucesso: envia e-mail normalizado, senha intacta e guarda a sessão', async () => {
    let body: Record<string, unknown> = {};
    let grantType: string | null = null;
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        grantType = new URL(request.url).searchParams.get('grant_type');
        return HttpResponse.json(fakeSession());
      }),
    );

    const result = await signIn('  Pessoa@Exemplo.TEST ', '  senha com espaços  ');

    expect(result).toEqual({ ok: true });
    expect(grantType).toBe('password');
    expect(body.email).toBe('pessoa@exemplo.test');
    expect(body.password).toBe('  senha com espaços  ');
    expect(stored()).not.toBeNull();
  });

  const failures: [string, () => Response, AuthErrorKind][] = [
    ['senha errada', () => authError(400, 'invalid_credentials'), 'invalidCredentials'],
    ['e-mail não confirmado', () => authError(400, 'email_not_confirmed'), 'invalidCredentials'],
    ['conta bloqueada', () => authError(403, 'user_banned'), 'invalidCredentials'],
    ['recusa sem código', () => authError(400), 'invalidCredentials'],
    ['limite de tentativas', () => authError(429, 'over_request_rate_limit'), 'rateLimited'],
    ['erro 500', () => authError(500, 'unexpected_failure'), 'unavailable'],
    ['erro 503 sem JSON', htmlPage(503), 'unavailable'],
    ['projeto pausado (540, sem JSON)', htmlPage(540), 'unavailable'],
    ['projeto pausado (540, com JSON)', () => authError(540), 'unavailable'],
    ['sem rede', networkDown, 'network'],
  ];

  it.each(failures)('%s', async (_name, response, kind) => {
    server.use(http.post(TOKEN_URL, response));

    // toEqual exato: nenhum texto do servidor acompanha o resultado.
    expect(await signIn('pessoa@exemplo.test', 'senha')).toEqual({ ok: false, kind });
    expect(stored()).toBeNull();
  });

  it('resposta recusada desconhecida vira "unknown"', async () => {
    server.use(http.post(TOKEN_URL, () => authError(422, 'email_provider_disabled')));

    expect(await signIn('pessoa@exemplo.test', 'senha')).toEqual({ ok: false, kind: 'unknown' });
  });
});

describe('requestPasswordReset', () => {
  it('envia o e-mail normalizado e o endereço de volta, sem PKCE', async () => {
    let body: Record<string, unknown> = {};
    let redirectTo: string | null = null;
    server.use(
      http.post(RECOVER_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        redirectTo = new URL(request.url).searchParams.get('redirect_to');
        return HttpResponse.json({});
      }),
    );

    await requestPasswordReset(' Pessoa@Exemplo.TEST ');

    expect(body.email).toBe('pessoa@exemplo.test');
    expect(body.code_challenge ?? null).toBeNull();
    expect(redirectTo).toBe(`${window.location.origin}/admin/nova-senha`);
  });

  it.each<[string, () => Response]>([
    ['conta existente', () => HttpResponse.json({})],
    ['conta inexistente', () => authError(404, 'user_not_found')],
    ['e-mail fora da equipe', () => authError(400, 'email_address_not_authorized')],
    ['falha no envio do e-mail', () => authError(500, 'unexpected_failure')],
  ])('%s: o resultado é o mesmo, para não revelar a conta', async (_name, response) => {
    server.use(http.post(RECOVER_URL, response));

    expect(await requestPasswordReset('pessoa@exemplo.test')).toEqual({ ok: true });
  });

  it.each<[string, () => Response, AuthErrorKind]>([
    ['sem rede', networkDown, 'network'],
    ['limite de e-mails', () => authError(429, 'over_email_send_rate_limit'), 'rateLimited'],
  ])('%s: mostra o erro e permite repetir', async (_name, response, kind) => {
    server.use(http.post(RECOVER_URL, response));

    expect(await requestPasswordReset('pessoa@exemplo.test')).toEqual({ ok: false, kind });
  });
});

describe('establishRecoverySession', () => {
  const tokens = (accessToken = fakeJwt()) => ({ accessToken, refreshToken: 'refresh-de-teste' });

  it('token válido: cria a sessão', async () => {
    server.use(http.get(USER_URL, () => HttpResponse.json(fakeUser())));

    expect(await establishRecoverySession(tokens())).toEqual({ ok: true });
    expect(stored()).not.toBeNull();
  });

  it('token recusado pelo servidor: link expirado', async () => {
    server.use(http.get(USER_URL, () => authError(403, 'bad_jwt')));

    expect(await establishRecoverySession(tokens())).toEqual({ ok: false, kind: 'expiredLink' });
    expect(stored()).toBeNull();
  });

  it('token malformado: link expirado, sem chamar o servidor', async () => {
    expect(await establishRecoverySession(tokens('nao-e-um-jwt'))).toEqual({
      ok: false,
      kind: 'expiredLink',
    });
  });

  it('token vencido e refresh já usado: link expirado', async () => {
    server.use(http.post(TOKEN_URL, () => authError(400, 'refresh_token_already_used')));
    const expired = fakeJwt({ exp: Math.floor(Date.now() / 1000) - 60 });

    expect(await establishRecoverySession(tokens(expired))).toEqual({
      ok: false,
      kind: 'expiredLink',
    });
  });

  it('sem rede: não diz que o link expirou', async () => {
    server.use(http.get(USER_URL, networkDown));

    expect(await establishRecoverySession(tokens())).toEqual({ ok: false, kind: 'network' });
  });
});

describe('updatePassword', () => {
  it('sucesso: envia a senha exatamente como digitada', async () => {
    await withSession();
    let body: Record<string, unknown> = {};
    server.use(
      http.put(USER_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(fakeUser());
      }),
    );

    expect(await updatePassword('  nova senha  ')).toEqual({ ok: true });
    expect(body.password).toBe('  nova senha  ');
  });

  it.each<[string, () => Response, AuthErrorKind]>([
    ['senha igual à atual', () => authError(422, 'same_password'), 'samePassword'],
    ['senha fraca', () => authError(422, 'weak_password'), 'weakPassword'],
    ['sessão recusada', () => authError(403, 'bad_jwt'), 'expiredLink'],
    ['sessão apagada no servidor', () => authError(403, 'session_not_found'), 'expiredLink'],
    ['erro 500', () => authError(500, 'unexpected_failure'), 'unavailable'],
    ['limite de tentativas', () => authError(429, 'over_request_rate_limit'), 'rateLimited'],
    ['sem rede', networkDown, 'network'],
  ])('%s', async (_name, response, kind) => {
    await withSession();
    server.use(http.put(USER_URL, response));

    expect(await updatePassword('nova-senha')).toEqual({ ok: false, kind });
  });

  it('sem sessão: link expirado, sem chamar o servidor', async () => {
    expect(await updatePassword('nova-senha')).toEqual({ ok: false, kind: 'expiredLink' });
  });
});

describe('signOut', () => {
  it('apaga a sessão e encerra só neste aparelho', async () => {
    await withSession();
    let scope: string | null = null;
    server.use(
      http.post(LOGOUT_URL, ({ request }) => {
        scope = new URL(request.url).searchParams.get('scope');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await signOut();

    expect(scope).toBe('local');
    expect(stored()).toBeNull();
  });

  it.each<[string, () => Response]>([
    ['sem rede', networkDown],
    ['erro 500', () => authError(500, 'unexpected_failure')],
  ])('%s: a sessão local é apagada mesmo assim, sem lançar erro', async (_name, response) => {
    await withSession();
    server.use(http.post(LOGOUT_URL, response));

    await expect(signOut()).resolves.toBeUndefined();
    expect(stored()).toBeNull();
  });
});

describe('onSessionChange', () => {
  const nextCall = (spy: ReturnType<typeof vi.fn>, count: number) =>
    vi.waitFor(() => expect(spy.mock.calls.length).toBeGreaterThanOrEqual(count));

  it('avisa a sessão inicial e as mudanças, só com o id da conta', async () => {
    const listener = vi.fn();
    const stop = onSessionChange(listener);

    await nextCall(listener, 1);
    expect(listener).toHaveBeenLastCalledWith(null);

    await withSession();
    await nextCall(listener, 2);
    expect(listener).toHaveBeenLastCalledWith(USER_ID);

    stop();
  });

  it('o aviso sai do callback do SDK: dá para chamar o SDK nele sem travar', async () => {
    const seen: unknown[] = [];
    const stop = onSessionChange(() => {
      void getSupabase()
        .auth.getSession()
        .then(({ data }) => seen.push(data.session));
    });

    await vi.waitFor(() => expect(seen).toHaveLength(1));
    stop();
  });

  it('depois de parar, não avisa mais', async () => {
    const listener = vi.fn();
    const stop = onSessionChange(listener);
    await nextCall(listener, 1);
    stop();
    listener.mockClear();

    await withSession();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('isAdmin', () => {
  it('consulta a própria linha com o token da sessão, que o RLS exige', async () => {
    const token = fakeJwt();
    await withSession(token);
    let url = new URL('https://vazio.test');
    let authorization: string | null = null;
    server.use(
      http.get(ADMINS_URL, ({ request }) => {
        url = new URL(request.url);
        authorization = request.headers.get('authorization');
        return HttpResponse.json([{ user_id: USER_ID }]);
      }),
    );

    expect(await isAdmin(USER_ID)).toBe('admin');
    expect(url.searchParams.get('user_id')).toBe(`eq.${USER_ID}`);
    expect(authorization).toBe(`Bearer ${token}`);
  });

  it('sem linha: não é administradora', async () => {
    server.use(http.get(ADMINS_URL, () => HttpResponse.json([])));

    expect(await isAdmin(USER_ID)).toBe('notAdmin');
  });

  it.each<[string, () => Response]>([
    ['erro do servidor', () => HttpResponse.json({ message: 'falha' }, { status: 500 })],
    ['sem rede', networkDown],
    ['serviço iniciando', () => HttpResponse.json({ message: 'falha' }, { status: 503 })],
  ])('%s: a verificação falhou, o que não significa "não é"', async (_name, response) => {
    let requests = 0;
    server.use(
      http.get(ADMINS_URL, () => {
        requests += 1;
        return response();
      }),
    );

    expect(await isAdmin(USER_ID)).toBe('failed');
    // Sem repetição automática: a tela já oferece "Tentar novamente" (RF-10).
    expect(requests).toBe(1);
  });
});
