import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabase } from '@/lib/supabase';
import { server } from '../../../tests/setup/msw';
import {
  AUTH_URL,
  authError,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../../tests/support/supabaseAuth';
import { signIn } from './authApi';
import { AuthProvider, useAuth, type AuthStatus } from './AuthProvider';

// Spec 003, T04 (D3, RF-08, RF-10, RF-11). SDK de verdade; só a rede é simulada.

const ADMINS_URL = `${REST_URL}/admins`;
let adminRequests = 0;
let seenStatuses: AuthStatus[] = [];

function Probe() {
  const { status, notice, retryCheck, signOut } = useAuth();
  if (seenStatuses.at(-1) !== status) seenStatuses.push(status);
  return (
    <>
      <p data-testid="status">{status}</p>
      <p data-testid="notice">{notice ?? 'nenhum'}</p>
      <button type="button" onClick={retryCheck}>
        repetir
      </button>
      <button type="button" onClick={() => void signOut()}>
        sair
      </button>
    </>
  );
}

const renderProvider = (strict = false) => {
  const tree = (
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

const seedSession = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));

function respondAdmins(response: () => Response) {
  server.use(
    http.get(ADMINS_URL, () => {
      adminRequests += 1;
      return response();
    }),
  );
}

const isListed = () => HttpResponse.json([{ user_id: USER_ID }]);
const isNotListed = () => HttpResponse.json([]);
const serverFails = () => HttpResponse.json({ message: 'falha' }, { status: 500 });

const expectStatus = (status: AuthStatus) =>
  waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent(new RegExp(`^${status}$`)));
const expectNotice = (notice: string) =>
  waitFor(() => expect(screen.getByTestId('notice')).toHaveTextContent(new RegExp(`^${notice}$`)));

beforeEach(() => {
  adminRequests = 0;
  seenStatuses = [];
  server.use(http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })));
});

afterEach(() => {
  localStorage.clear();
});

describe('AuthProvider', () => {
  it('sem sessão: de "loading" para "signedOut", sem consultar admins nem dar aviso', async () => {
    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    await expectStatus('signedOut');
    expect(adminRequests).toBe(0);
    expect(screen.getByTestId('notice')).toHaveTextContent('nenhum');
  });

  it('sessão salva de administradora: nunca passa por "signedOut" (o login não pisca)', async () => {
    seedSession();
    respondAdmins(isListed);

    renderProvider();

    await expectStatus('admin');
    expect(seenStatuses).not.toContain('signedOut');
  });

  it('StrictMode: consulta admins uma única vez', async () => {
    seedSession();
    respondAdmins(isListed);

    renderProvider(true);

    await expectStatus('admin');
    expect(adminRequests).toBe(1);
  });

  it('conta fora de admins: encerra a sessão e avisa', async () => {
    seedSession();
    respondAdmins(isNotListed);

    renderProvider();

    await expectNotice('accessDenied');
    await expectStatus('signedOut');
    expect(seenStatuses).toContain('denied');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('falha na verificação: mantém a sessão e permite repetir', async () => {
    const user = userEvent.setup();
    seedSession();
    respondAdmins(serverFails);
    renderProvider();

    await expectStatus('checkFailed');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    respondAdmins(isListed);
    await user.click(screen.getByRole('button', { name: 'repetir' }));

    await expectStatus('admin');
    expect(seenStatuses).not.toContain('signedOut');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('login durante o uso: verifica, libera e limpa um aviso antigo', async () => {
    seedSession();
    respondAdmins(isNotListed);
    renderProvider();
    await expectNotice('accessDenied');
    await expectStatus('signedOut');

    respondAdmins(isListed);
    server.use(http.post(`${AUTH_URL}/token`, () => HttpResponse.json(fakeSession())));
    await signIn('pessoa@exemplo.test', 'senha');

    await expectStatus('admin');
    expect(screen.getByTestId('notice')).toHaveTextContent('nenhum');
  });

  it('"Sair": encerra sem aviso de sessão expirada', async () => {
    const user = userEvent.setup();
    seedSession();
    respondAdmins(isListed);
    renderProvider();
    await expectStatus('admin');

    await user.click(screen.getByRole('button', { name: 'sair' }));

    await expectStatus('signedOut');
    expect(screen.getByTestId('notice')).toHaveTextContent('nenhum');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('"Sair" com o servidor fora: o resultado é o mesmo', async () => {
    const user = userEvent.setup();
    seedSession();
    respondAdmins(isListed);
    server.use(http.post(`${AUTH_URL}/logout`, () => authError(500, 'unexpected_failure')));
    renderProvider();
    await expectStatus('admin');

    await user.click(screen.getByRole('button', { name: 'sair' }));

    await expectStatus('signedOut');
    expect(screen.getByTestId('notice')).toHaveTextContent('nenhum');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('sessão que acaba sem o botão "Sair": avisa que expirou', async () => {
    seedSession();
    respondAdmins(isListed);
    renderProvider();
    await expectStatus('admin');

    await getSupabase().auth.signOut({ scope: 'local' });

    await expectStatus('signedOut');
    await expectNotice('sessionExpired');
  });

  it('renovação do token não refaz a verificação nem tira da tela', async () => {
    seedSession();
    respondAdmins(isListed);
    server.use(http.post(`${AUTH_URL}/token`, () => HttpResponse.json(fakeSession())));
    renderProvider();
    await expectStatus('admin');
    const statusesBefore = [...seenStatuses];

    await getSupabase().auth.refreshSession();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(adminRequests).toBe(1);
    expect(seenStatuses).toEqual(statusesBefore);
  });

  it('resposta atrasada de uma verificação não reabre a sessão que já acabou', async () => {
    seedSession();
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(ADMINS_URL, async () => {
        await released;
        return isListed();
      }),
    );
    renderProvider();
    await expectStatus('checking');

    await getSupabase().auth.signOut({ scope: 'local' });
    await expectStatus('signedOut');
    release();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(screen.getByTestId('status')).toHaveTextContent(/^signedOut$/);
  });

  it('useAuth fora do provider: erro claro', () => {
    function Lonely() {
      useAuth();
      return null;
    }
    const silence = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Lonely />)).toThrow(/AuthProvider/);
    silence.mockRestore();
  });
});
