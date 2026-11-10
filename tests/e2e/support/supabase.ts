import type { Page, Route } from '@playwright/test';
import { fakeJwt, fakeSession, fakeUser, STORAGE_KEY, USER_ID } from '../../support/fakeAuth';

/**
 * Supabase falso do E2E (spec 003, D8). O build do E2E aponta para este domínio
 * `.invalid` (scripts/e2e-build.ts), que nunca resolve: só estas respostas existem.
 */
export const E2E_SUPABASE_ORIGIN = 'https://supabase.e2e.invalid';

export type SupabaseMock = {
  /** Chamadas ao Supabase falso, como "POST /auth/v1/token". */
  calls: string[];
  /** Requisições para qualquer outro endereço fora do site; são bloqueadas. */
  outside: string[];
};

type Options = {
  /** Resposta da consulta a `admins`. */
  admin?: 'listed' | 'notListed' | 'fails';
};

const SITE_ORIGIN = 'http://localhost:4173';

function cors(route: Route): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers':
      route.request().headers()['access-control-request-headers'] ?? '*',
    'access-control-expose-headers': 'x-supabase-api-version',
    'x-supabase-api-version': '2024-01-01',
  };
}

export async function mockSupabase(page: Page, options: Options = {}): Promise<SupabaseMock> {
  const mock: SupabaseMock = { calls: [], outside: [] };
  const admin = options.admin ?? 'listed';

  await page.context().route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === SITE_ORIGIN || url.protocol === 'data:') return route.fallback();
    if (url.origin !== E2E_SUPABASE_ORIGIN) {
      mock.outside.push(request.url());
      return route.abort();
    }

    const headers = cors(route);
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });

    const key = `${request.method()} ${url.pathname}`;
    mock.calls.push(key);
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers, json: body });

    switch (key) {
      case 'POST /auth/v1/token':
        return json(fakeSession());
      case 'GET /auth/v1/user':
      case 'PUT /auth/v1/user':
        return json(fakeUser());
      case 'POST /auth/v1/recover':
        return json({});
      case 'POST /auth/v1/logout':
        return route.fulfill({ status: 204, headers });
      case 'GET /rest/v1/site_content':
        return json([{ initials: 'NS' }]);
      case 'GET /rest/v1/admins':
        if (admin === 'fails') return json({ message: 'falha' }, 500);
        return json(admin === 'listed' ? [{ user_id: USER_ID }] : []);
      default:
        return json({ message: `sem resposta falsa para ${key}` }, 404);
    }
  });

  return mock;
}

/** Sessão salva, como se ela já tivesse entrado antes. Vale só para a primeira carga. */
export async function seedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(fakeSession())] as const,
  );
}

export const recoveryLinkHash = () =>
  `#access_token=${fakeJwt()}&refresh_token=refresh-de-teste&expires_in=3600&type=recovery`;
