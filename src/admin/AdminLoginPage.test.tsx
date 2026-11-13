import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSupabase } from '@/lib/supabase';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  authError,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';

// Spec 003, T06 (CA-02, CA-04, CA-05). Tela real, SDK real; só a rede é simulada.

const TOKEN_URL = `${AUTH_URL}/token`;
const CONTENT_URL = `${REST_URL}/site_content`;
const ADMINS_URL = `${REST_URL}/admins`;

let tokenRequests = 0;

function renderLogin() {
  const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin/login'] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const emailInput = () => screen.findByLabelText('E-mail');
const passwordInput = () => screen.findByLabelText('Senha');
const submitButton = () => screen.findByRole('button', { name: 'Entrar' });
const mark = () => document.querySelector<HTMLElement>('[data-part="mark"]');

function respondToken(response: () => Response | Promise<Response>) {
  server.use(
    http.post(TOKEN_URL, () => {
      tokenRequests += 1;
      return response();
    }),
  );
}

const respondInitials = (response: () => Response | Promise<Response>) =>
  server.use(http.get(CONTENT_URL, response));

const signedIn = () => HttpResponse.json(fakeSession());

async function fillAndSubmit(email = 'pessoa@exemplo.test', password = 'senha-valida') {
  const user = userEvent.setup();
  await user.type(await emailInput(), email);
  await user.type(await passwordInput(), password);
  await user.click(await submitButton());
  return user;
}

beforeEach(() => {
  tokenRequests = 0;
  respondInitials(() => HttpResponse.json([{ initials: 'NS' }]));
  server.use(
    http.get(ADMINS_URL, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })),
  );
});

afterEach(() => {
  localStorage.clear();
});

describe('tela (CA-02)', () => {
  it('traz todos os elementos do design, na ordem', async () => {
    renderLogin();
    await waitFor(() => expect(mark()).toHaveTextContent('NS'));

    expect(screen.getByRole('main').textContent).toBe(
      [
        'Voltar ao site',
        'NS',
        'Área administrativa',
        'Entre para editar textos e fotos do site.',
        'E-mail',
        'Senha',
        'Entrar',
        'Esqueci minha senha',
        'Acesso exclusivo da administradora do site.',
      ].join(''),
    );
  });

  it('"Voltar ao site" é link comum, e "Esqueci minha senha" abre a recuperação', async () => {
    const user = userEvent.setup();
    const router = renderLogin();

    expect(await screen.findByRole('link', { name: 'Voltar ao site' })).toHaveAttribute(
      'href',
      '/',
    );
    await user.click(screen.getByRole('link', { name: 'Esqueci minha senha' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/recuperar-senha'));
  });

  it('os campos ajudam os gerenciadores de senha', async () => {
    renderLogin();
    const email = await emailInput();
    const password = await passwordInput();

    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toHaveAttribute('name', 'email');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('name', 'password');
    expect(email.closest('form')).toHaveAttribute('novalidate');
  });

  it('o olho mostra a senha e não faz requisição', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await passwordInput(), 'segredo');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(await passwordInput()).toHaveAttribute('type', 'text');
    expect(tokenRequests).toBe(0);
  });
});

describe('monograma (D5)', () => {
  it('pede só as iniciais da seção geral', async () => {
    let url = new URL('https://vazio.test');
    server.use(
      http.get(CONTENT_URL, ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([{ initials: 'AB' }]);
      }),
    );

    renderLogin();

    await waitFor(() => expect(mark()).toHaveTextContent('AB'));
    expect(url.searchParams.get('section')).toBe('eq.geral');
    expect(url.searchParams.get('select')).toMatch(/data->>initials/);
  });

  it('enquanto carrega: círculo vazio', async () => {
    respondInitials(async () => {
      await delay('infinite');
      return HttpResponse.json([]);
    });

    renderLogin();
    await emailInput();

    expect(mark()?.textContent).toBe('');
    expect(mark()?.querySelector('svg')).toBeNull();
  });

  it.each<[string, () => Response]>([
    ['linha ausente', () => HttpResponse.json([])],
    ['iniciais vazias', () => HttpResponse.json([{ initials: '  ' }])],
    ['iniciais nulas', () => HttpResponse.json([{ initials: null }])],
    ['erro do servidor', () => HttpResponse.json({ message: 'falha' }, { status: 500 })],
    ['sem rede', () => HttpResponse.error()],
  ])('%s: círculo com cadeado', async (_name, response) => {
    respondInitials(response);

    renderLogin();

    await waitFor(() =>
      expect(mark()?.querySelector('[data-icon="lock"]')).toBeInstanceOf(Element),
    );
  });
});

describe('validação (CA-04)', () => {
  it('campos vazios: erro em cada um, foco no primeiro e nenhuma requisição', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(await submitButton());

    expect(await emailInput()).toHaveAccessibleDescription('Informe seu e-mail.');
    expect(await passwordInput()).toHaveAccessibleDescription('Informe sua senha.');
    expect(await emailInput()).toHaveFocus();
    expect(tokenRequests).toBe(0);
  });

  it.each(['sem-arroba', 'a@b', 'a b@c.com', '@exemplo.test'])(
    'e-mail malformado (%s): erro junto do campo e nenhuma requisição',
    async (email) => {
      renderLogin();
      await fillAndSubmit(email, 'senha');

      expect(await emailInput()).toHaveAccessibleDescription('Informe um e-mail válido.');
      expect(await emailInput()).toHaveFocus();
      expect(tokenRequests).toBe(0);
    },
  );

  it('só a senha vazia: foco na senha', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(await emailInput(), 'pessoa@exemplo.test');

    await user.click(await submitButton());

    expect(await passwordInput()).toHaveFocus();
    expect(await emailInput()).not.toHaveAttribute('aria-invalid');
  });

  it('o erro do campo some quando ele é editado', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(await submitButton());

    await user.type(await emailInput(), 'a');

    expect(await emailInput()).not.toHaveAttribute('aria-invalid');
    expect(await passwordInput()).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('entrar (CA-04)', () => {
  it('credenciais válidas: vai para /admin', async () => {
    respondToken(signedIn);
    const router = renderLogin();

    await fillAndSubmit();

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });

  it('e-mail com maiúsculas e espaços é aceito', async () => {
    respondToken(signedIn);
    const router = renderLogin();

    await fillAndSubmit('  Pessoa@Exemplo.TEST ');

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });

  it('senha com espaços nas pontas é enviada como digitada', async () => {
    let password: unknown;
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        password = ((await request.json()) as { password: unknown }).password;
        return signedIn();
      }),
    );
    renderLogin();

    await fillAndSubmit('pessoa@exemplo.test', '  com espaços  ');

    await waitFor(() => expect(password).toBe('  com espaços  '));
  });

  it('autopreenchimento sem evento de digitação é reconhecido', async () => {
    const user = userEvent.setup();
    let body: Record<string, unknown> = {};
    server.use(
      http.post(TOKEN_URL, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return signedIn();
      }),
    );
    renderLogin();
    await waitFor(() => expect(mark()).toHaveTextContent('NS'));
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(await emailInput(), 'preenchido@exemplo.test');
    setValue?.call(await passwordInput(), 'senha-salva');

    await user.click(await submitButton());

    await waitFor(() => expect(body.email).toBe('preenchido@exemplo.test'));
    expect(body.password).toBe('senha-salva');
  });

  it('durante o envio: botão desabilitado e indicando carregamento', async () => {
    respondToken(async () => {
      await delay('infinite');
      return signedIn();
    });
    renderLogin();

    await fillAndSubmit();

    const button = await screen.findByRole('button', { name: 'Entrando…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('duplo clique em "Entrar": uma única requisição', async () => {
    const user = userEvent.setup();
    respondToken(async () => {
      await delay(30);
      return authError(400, 'invalid_credentials');
    });
    renderLogin();
    await user.type(await emailInput(), 'pessoa@exemplo.test');
    await user.type(await passwordInput(), 'senha');

    await user.dblClick(await submitButton());

    await screen.findByText('E-mail ou senha incorretos.');
    expect(tokenRequests).toBe(1);
  });

  it('dois envios no mesmo instante: uma única requisição', async () => {
    const user = userEvent.setup();
    respondToken(async () => {
      await delay(30);
      return authError(400, 'invalid_credentials');
    });
    renderLogin();
    await user.type(await emailInput(), 'pessoa@exemplo.test');
    await user.type(await passwordInput(), 'senha');
    const form = (await emailInput()).closest('form') as HTMLFormElement;

    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    await screen.findByText('E-mail ou senha incorretos.');
    expect(tokenRequests).toBe(1);
  });
});

describe('mensagens de erro (CA-05)', () => {
  const cases: [string, () => Response, string][] = [
    [
      'credencial inválida',
      () => authError(400, 'invalid_credentials'),
      'E-mail ou senha incorretos.',
    ],
    [
      'sem rede',
      () => HttpResponse.error(),
      'Sem conexão com a internet. Verifique sua rede e tente novamente.',
    ],
    [
      'limite de tentativas',
      () => authError(429, 'over_request_rate_limit'),
      'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    ],
    [
      'serviço fora',
      () => authError(503),
      'Serviço indisponível no momento. Tente novamente em instantes.',
    ],
  ];

  it.each(cases)('%s: anuncia a mensagem, com foco nela', async (_name, response, message) => {
    respondToken(response);
    renderLogin();

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(alert).toHaveTextContent(message));
    expect(alert.textContent).not.toMatch(/server text/);
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('a região de aviso já existe antes do erro, para o leitor de tela anunciar', async () => {
    renderLogin();
    await emailInput();

    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('nova tentativa apaga o erro anterior e pode dar certo', async () => {
    respondToken(() => authError(400, 'invalid_credentials'));
    const router = renderLogin();
    const user = await fillAndSubmit();
    await screen.findByText('E-mail ou senha incorretos.');

    respondToken(async () => {
      await delay(30);
      return signedIn();
    });
    await user.click(await submitButton());

    await waitFor(() => expect(screen.queryByText('E-mail ou senha incorretos.')).toBeNull());
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });
});

describe('avisos vindos da sessão', () => {
  it('conta fora de admins: volta ao login com a mensagem', async () => {
    respondToken(signedIn);
    server.use(http.get(ADMINS_URL, () => HttpResponse.json([])));
    const router = renderLogin();

    await fillAndSubmit();

    await screen.findByText('Esta conta não tem acesso à área administrativa.');
    expect(screen.getByRole('alert')).toHaveTextContent('Esta conta não tem acesso');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    expect(router.state.location.pathname).toBe('/admin/login');
  });

  it('sessão expirada durante o uso: mostra o aviso no login', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
    const router = createMemoryRouter(adminRoutes, { initialEntries: ['/admin'] });
    render(
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>,
    );
    await waitFor(() => expect(document.querySelector('main')).not.toBeNull());
    // O editor (004) tem regiões de aviso sempre presentes: espera o conteúdo carregar.
    await screen.findByRole('combobox', { name: /Seção do site/ });

    await act(() => getSupabase().auth.signOut({ scope: 'local' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sua sessão expirou. Entre novamente.',
    );
  });

  it('o aviso some quando ela tenta entrar', async () => {
    respondToken(async () => {
      await delay('infinite');
      return signedIn();
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
    server.use(http.get(ADMINS_URL, () => HttpResponse.json([])));
    renderLogin();
    await screen.findByText('Esta conta não tem acesso à área administrativa.');

    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.queryByText('Esta conta não tem acesso à área administrativa.')).toBeNull(),
    );
  });
});
