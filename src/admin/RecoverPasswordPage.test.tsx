import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../tests/setup/msw';
import { AUTH_URL, authError, REST_URL } from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';

// Spec 003, T07 (RF-06, CA-06). Tela real, SDK real; só a rede é simulada.

const RECOVER_URL = `${AUTH_URL}/recover`;
const SENT = 'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.';

let requests = 0;
let lastBody: Record<string, unknown> = {};

function respond(response: () => Response | Promise<Response>) {
  server.use(
    http.post(RECOVER_URL, async ({ request }) => {
      requests += 1;
      lastBody = (await request.json()) as Record<string, unknown>;
      return response();
    }),
  );
}

function renderPage() {
  const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin/recuperar-senha'] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const emailInput = () => screen.getByLabelText('E-mail');
const sendButton = () => screen.getByRole('button', { name: 'Enviar link' });

async function submitEmail(email = 'pessoa@exemplo.test') {
  const user = userEvent.setup();
  await user.type(emailInput(), email);
  await user.click(sendButton());
  return user;
}

beforeEach(() => {
  requests = 0;
  lastBody = {};
});

describe('RecoverPasswordPage', () => {
  it('traz campo, botão e o caminho de volta ao login', async () => {
    const user = userEvent.setup();
    // O login, ao abrir, pede as iniciais do monograma.
    server.use(http.get(`${REST_URL}/site_content`, () => HttpResponse.json([])));
    const router = renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar senha' })).toBeVisible();
    expect(emailInput()).toHaveAttribute('autocomplete', 'email');
    expect(emailInput().closest('form')).toHaveAttribute('novalidate');

    await user.click(screen.getByRole('link', { name: 'Voltar ao login' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });

  it.each([
    ['', 'Informe seu e-mail.'],
    ['sem-arroba', 'Informe um e-mail válido.'],
  ])('e-mail "%s": erro junto do campo, com foco, e nada é enviado', async (email, message) => {
    const user = userEvent.setup();
    renderPage();

    if (email) await user.type(emailInput(), email);
    await user.click(sendButton());

    expect(emailInput()).toHaveAccessibleDescription(message);
    expect(emailInput()).toHaveFocus();
    expect(requests).toBe(0);
  });

  it('ao enviar: normaliza o e-mail, troca o formulário pela mensagem e mantém a volta', async () => {
    respond(() => HttpResponse.json({}));
    renderPage();

    await submitEmail('  Pessoa@Exemplo.TEST ');

    expect(await screen.findByRole('status')).toHaveTextContent(SENT);
    expect(lastBody.email).toBe('pessoa@exemplo.test');
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao login' })).toBeVisible();
  });

  it('conta existente ou não: a tela final é idêntica', async () => {
    respond(() => HttpResponse.json({}));
    const first = renderPage();
    await submitEmail('existe@exemplo.test');
    await screen.findByRole('status');
    const existing = screen.getByRole('main').textContent;
    first.dispose();
    document.body.replaceChildren();

    respond(() => authError(404, 'user_not_found'));
    renderPage();
    await submitEmail('nao-existe@exemplo.test');
    await screen.findByRole('status');

    expect(screen.getByRole('main').textContent).toBe(existing);
  });

  it('sem rede: mostra o erro, com foco, e permite tentar de novo', async () => {
    respond(() => HttpResponse.error());
    renderPage();
    const user = await submitEmail();

    const alert = screen.getByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent('Sem conexão com a internet'));
    expect(alert).toHaveFocus();
    expect(emailInput()).toHaveValue('pessoa@exemplo.test');

    respond(() => HttpResponse.json({}));
    await user.click(sendButton());

    expect(await screen.findByRole('status')).toHaveTextContent(SENT);
  });

  it('muitos pedidos: avisa, sem mudar a garantia de não revelar a conta', async () => {
    respond(() => authError(429, 'over_email_send_rate_limit'));
    renderPage();

    await submitEmail();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Muitas tentativas'));
  });

  it('durante o envio: botão ocupado', async () => {
    respond(async () => {
      await delay('infinite');
      return HttpResponse.json({});
    });
    renderPage();

    await submitEmail();

    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled();
  });

  it('dois envios no mesmo instante: um único pedido', async () => {
    const user = userEvent.setup();
    respond(async () => {
      await delay(30);
      return HttpResponse.json({});
    });
    renderPage();
    await user.type(emailInput(), 'pessoa@exemplo.test');
    const form = emailInput().closest('form') as HTMLFormElement;

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await screen.findByRole('status');
    expect(requests).toBe(1);
  });

  it('duplo clique: um único pedido', async () => {
    const user = userEvent.setup();
    respond(async () => {
      await delay(30);
      return HttpResponse.json({});
    });
    renderPage();
    await user.type(emailInput(), 'pessoa@exemplo.test');

    await user.dblClick(sendButton());

    await screen.findByRole('status');
    expect(requests).toBe(1);
  });
});
