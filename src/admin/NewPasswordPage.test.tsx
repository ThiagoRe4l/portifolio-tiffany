import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  authError,
  fakeJwt,
  fakeUser,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';
import { clearRecoveryLink, consumeRecoveryHash, getRecoveryLink } from './auth/recoveryHash';

// Spec 003, T07 (RF-07, CA-07, D2). Tela real, SDK real; só a rede é simulada.

const USER_URL = `${AUTH_URL}/user`;
const EXPIRED = 'Este link expirou ou já foi usado. Peça um novo para criar sua senha.';
const GOOD_PASSWORD = 'senha-boa-123';

let sessionChecks = 0;
let passwordUpdates = 0;
let sentPassword: unknown;

function openRecoveryLink() {
  const hash = `access_token=${fakeJwt()}&refresh_token=rrr&type=recovery`;
  window.history.replaceState(null, '', `/admin/nova-senha#${hash}`);
  consumeRecoveryHash();
}

function respondSession(response: () => Response) {
  server.use(
    http.get(USER_URL, () => {
      sessionChecks += 1;
      return response();
    }),
  );
}

function respondUpdate(response: () => Response | Promise<Response>) {
  server.use(
    http.put(USER_URL, async ({ request }) => {
      passwordUpdates += 1;
      sentPassword = ((await request.json()) as { password: unknown }).password;
      return response();
    }),
  );
}

function renderPage(strict = false) {
  const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin/nova-senha'] });
  const tree = (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return router;
}

const newPassword = () => screen.findByLabelText('Nova senha');
const confirmPassword = () => screen.findByLabelText('Confirmar nova senha');
const saveButton = () => screen.findByRole('button', { name: 'Salvar nova senha' });

async function fillAndSave(first = GOOD_PASSWORD, second = first) {
  const user = userEvent.setup();
  await user.type(await newPassword(), first);
  await user.type(await confirmPassword(), second);
  await user.click(await saveButton());
  return user;
}

const updated = () => HttpResponse.json(fakeUser());

beforeEach(() => {
  sessionChecks = 0;
  passwordUpdates = 0;
  sentPassword = undefined;
  respondSession(updated);
  server.use(
    http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })),
  );
});

afterEach(() => {
  clearRecoveryLink();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('com link válido', () => {
  beforeEach(openRecoveryLink);

  it('mostra os dois campos, cada um com mostrar/ocultar', async () => {
    renderPage();

    expect(await newPassword()).toHaveAttribute('autocomplete', 'new-password');
    expect(await confirmPassword()).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getAllByRole('button', { name: 'Mostrar senha' })).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: 'Criar nova senha' })).toBeVisible();
  });

  it('mostrar uma senha não afeta a outra', async () => {
    const user = userEvent.setup();
    renderPage();
    const field = (await newPassword()).parentElement as HTMLElement;

    await user.click(within(field).getByRole('button', { name: 'Mostrar senha' }));

    expect(await newPassword()).toHaveAttribute('type', 'text');
    expect(await confirmPassword()).toHaveAttribute('type', 'password');
  });

  it('cria a sessão uma única vez, mesmo com o StrictMode', async () => {
    renderPage(true);

    await newPassword();

    expect(sessionChecks).toBe(1);
  });

  it('senhas iguais com 8 ou mais: salva como digitada, avisa e vai para /admin', async () => {
    respondUpdate(updated);
    const router = renderPage();

    await fillAndSave('  oito ch');

    expect(await screen.findByRole('status')).toHaveTextContent('Senha criada com sucesso.');
    expect(sentPassword).toBe('  oito ch');
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'), { timeout: 3000 });
  });

  it('depois de salvar, os tokens saem da memória', async () => {
    respondUpdate(updated);
    renderPage();

    await fillAndSave();
    await screen.findByRole('status');

    expect(getRecoveryLink()).toBeNull();
  });

  it.each([
    ['curta', 'abc1234', 'abc1234', 'A senha precisa ter pelo menos 8 caracteres.', 'Nova senha'],
    [
      'diferente',
      GOOD_PASSWORD,
      'outra-senha',
      'As senhas não são iguais.',
      'Confirmar nova senha',
    ],
  ])('senha %s: erro no campo, com foco, e nada é enviado', async (_n, a, b, message, label) => {
    renderPage();

    await fillAndSave(a, b);

    const field = await screen.findByLabelText(label);
    expect(field).toHaveAccessibleDescription(message);
    expect(field).toHaveFocus();
    expect(passwordUpdates).toBe(0);
  });

  it('campos vazios: erro em cada um e nada é enviado', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await saveButton());

    expect(await newPassword()).toHaveAccessibleDescription('Informe a nova senha.');
    expect(await confirmPassword()).toHaveAccessibleDescription('Confirme a nova senha.');
    expect(await newPassword()).toHaveFocus();
    expect(passwordUpdates).toBe(0);
  });

  it('exatamente 8 caracteres é aceito', async () => {
    respondUpdate(updated);
    renderPage();

    await fillAndSave('12345678');

    await waitFor(() => expect(sentPassword).toBe('12345678'));
  });

  it.each<[string, () => Response, string]>([
    [
      'igual à anterior',
      () => authError(422, 'same_password'),
      'A nova senha precisa ser diferente',
    ],
    ['fraca', () => authError(422, 'weak_password'), 'não é segura o suficiente'],
    ['sem rede', () => HttpResponse.error(), 'Sem conexão com a internet'],
  ])('servidor recusa (%s): anuncia, com foco, e permite repetir', async (_n, response, text) => {
    respondUpdate(response);
    renderPage();

    await fillAndSave();

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent(text));
    expect(alert).toHaveFocus();
    expect(await saveButton()).toBeEnabled();
  });

  it('a sessão do link caiu ao salvar: mostra o caminho para pedir outro', async () => {
    respondUpdate(() => authError(403, 'session_not_found'));
    renderPage();

    await fillAndSave();

    expect(await screen.findByText(EXPIRED)).toBeVisible();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('durante o envio: botão ocupado, e duplo clique salva uma vez só', async () => {
    const user = userEvent.setup();
    respondUpdate(async () => {
      await delay('infinite');
      return updated();
    });
    renderPage();
    await user.type(await newPassword(), GOOD_PASSWORD);
    await user.type(await confirmPassword(), GOOD_PASSWORD);

    await user.dblClick(await saveButton());

    expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(passwordUpdates).toBe(1);
  });

  it('dois envios no mesmo instante: salva uma vez só', async () => {
    const user = userEvent.setup();
    respondUpdate(async () => {
      await delay(30);
      return updated();
    });
    renderPage();
    await user.type(await newPassword(), GOOD_PASSWORD);
    await user.type(await confirmPassword(), GOOD_PASSWORD);
    const form = (await newPassword()).closest('form') as HTMLFormElement;

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await screen.findByRole('status');
    expect(passwordUpdates).toBe(1);
  });

  it('enquanto confere o link: só o aviso de carregamento', async () => {
    server.use(
      http.get(USER_URL, async () => {
        await delay('infinite');
        return updated();
      }),
    );

    renderPage();

    expect(await screen.findByRole('status')).toHaveTextContent('Verificando o link…');
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  it('sem rede ao conferir o link: não diz que expirou e permite repetir', async () => {
    const user = userEvent.setup();
    respondSession(() => HttpResponse.error());
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Tentar novamente' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão com a internet');
    expect(screen.queryByText(EXPIRED)).not.toBeInTheDocument();

    respondSession(updated);
    await user.click(retry);

    expect(await newPassword()).toBeVisible();
  });

  it('link recusado pelo servidor: mostra o caminho para pedir outro', async () => {
    respondSession(() => authError(403, 'bad_jwt'));

    renderPage();

    expect(await screen.findByText(EXPIRED)).toBeVisible();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('sem link válido', () => {
  it.each([
    ['acesso direto', () => undefined],
    [
      'link expirado',
      () => {
        window.history.replaceState(
          null,
          '',
          '/admin/nova-senha#error=access_denied&error_code=otp_expired',
        );
        consumeRecoveryHash();
      },
    ],
  ])('%s: mensagem e caminho para pedir outro, sem formulário', async (_name, arrange) => {
    const user = userEvent.setup();
    arrange();
    const router = renderPage();

    expect(await screen.findByText(EXPIRED)).toBeVisible();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(sessionChecks).toBe(0);

    await user.click(screen.getByRole('link', { name: 'Pedir novo link' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/recuperar-senha'));
  });
});
