import { expect, test, type Locator, type Page } from '@playwright/test';
import { checkA11y } from './support/a11y';
import {
  E2E_SUPABASE_ORIGIN,
  mockSupabase,
  recoveryLinkHash,
  seedSession,
} from './support/supabase';

// Spec 003, T09 (CA-17 e os fluxos de CA-04, CA-07, CA-09 e CA-11 no navegador).
// Toda chamada ao Supabase é respondida por tests/e2e/support/supabase.ts.

/**
 * Aviso intermitente do WebKit (cerca de 2 em 5 repetições dos fluxos), mesmo com as
 * fontes em uso na tela. No site o mesmo preload nunca o dispara. Pendência da spec 003.
 */
const WEBKIT_PRELOAD_NOTICE =
  /^The resource \S+\/fonts\/\S+\.woff2 was preloaded using link preload but not used within a few seconds/;

function watchConsole(page: Page, browserName: string): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    if (browserName === 'webkit' && WEBKIT_PRELOAD_NOTICE.test(message.text())) return;
    problems.push(message.text());
  });
  return problems;
}

/** No Safari, Tab não passa por links; Alt+Tab passa por tudo. */
async function tabTo(page: Page, target: Locator, browserName: string) {
  const key = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let presses = 0; presses < 20; presses += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('o foco não chegou ao elemento pelo teclado');
}

const loginHeading = (page: Page) =>
  page.getByRole('heading', { level: 1, name: 'Área administrativa' });

async function signInWithMouse(page: Page) {
  await page.getByLabel('E-mail').fill('pessoa@exemplo.test');
  await page.getByLabel('Senha', { exact: true }).fill('senha-valida');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('fluxos', () => {
  test('entrar até /admin e sair', async ({ page, browserName }) => {
    const problems = watchConsole(page, browserName);
    const mock = await mockSupabase(page);

    await page.goto('/admin/login');
    await signInWithMouse(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Editar site' })).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('alert')).toBeEmpty();
    // Sair da página com a busca das iniciais no meio faz o WebKit registrar um erro.
    await expect(page.locator('[data-part="mark"]')).toHaveText('NS');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);

    expect(mock.calls).toEqual(
      expect.arrayContaining([
        'POST /auth/v1/token',
        'GET /rest/v1/admins',
        'POST /auth/v1/logout',
      ]),
    );
    expect(mock.outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('sem sessão: /admin vai para o login, e Voltar não retorna a ela', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/admin/recuperar-senha');

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Editar site' })).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/admin\/recuperar-senha$/);
  });

  test('sessão salva: entra direto, e recarregar mantém, sem piscar o login', async ({
    page,
    browserName,
  }) => {
    const problems = watchConsole(page, browserName);
    const mock = await mockSupabase(page);
    await seedSession(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.body?.textContent?.includes('Área administrativa')) {
          sessionStorage.setItem('e2e-login-visto', '1');
        }
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { level: 1, name: 'Editar site' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Editar site' })).toBeVisible();

    expect(await page.evaluate(() => sessionStorage.getItem('e2e-login-visto'))).toBeNull();
    expect(mock.outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('link de recuperação: o token sai da URL, e a senha nova é salva', async ({
    page,
    browserName,
  }) => {
    const problems = watchConsole(page, browserName);
    const mock = await mockSupabase(page);

    await page.goto(`/admin/nova-senha${recoveryLinkHash()}`);

    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
    expect(page.url()).not.toContain('#');
    expect(page.url()).not.toContain('access_token');

    await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-123');
    await page.getByLabel('Confirmar nova senha').fill('senha-nova-123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();

    await expect(page.getByRole('status')).toHaveText(/Senha criada com sucesso/);
    await expect(page).toHaveURL(/\/admin$/);
    expect(mock.calls).toEqual(expect.arrayContaining(['GET /auth/v1/user', 'PUT /auth/v1/user']));
    expect(mock.outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('fluxo completo só com o teclado', async ({ page, browserName }) => {
    await mockSupabase(page);
    await page.goto('/admin/login');
    await expect(loginHeading(page)).toBeVisible();

    await tabTo(page, page.getByLabel('E-mail'), browserName);
    await page.keyboard.type('pessoa@exemplo.test');
    await tabTo(page, page.getByLabel('Senha', { exact: true }), browserName);
    await page.keyboard.type('senha-valida');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/admin$/);
    const signOut = page.getByRole('button', { name: 'Sair' });
    await tabTo(page, signOut, browserName);
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('o foco fica visível nos campos e botões', async ({ page, browserName }) => {
    await mockSupabase(page);
    await page.goto('/admin/login');
    const email = page.getByLabel('E-mail');

    await tabTo(page, email, browserName);

    const outline = await email.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
  });
});

type Screen = {
  name: string;
  open: (page: Page) => Promise<void>;
};

const SCREENS: Screen[] = [
  {
    name: 'login',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto('/admin/login');
      await expect(page.locator('[data-part="mark"]')).toHaveText('NS');
    },
  },
  {
    name: 'login com erros nos campos',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto('/admin/login');
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page.getByText('Informe seu e-mail.')).toBeVisible();
    },
  },
  {
    name: 'conta sem acesso',
    open: async (page) => {
      await mockSupabase(page, { admin: 'notListed' });
      await page.goto('/admin/login');
      await signInWithMouse(page);
      await expect(page.getByRole('alert')).toHaveText(/não tem acesso/);
    },
  },
  {
    name: 'recuperar senha',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto('/admin/recuperar-senha');
      await expect(page.getByLabel('E-mail')).toBeVisible();
    },
  },
  {
    name: 'recuperação enviada',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto('/admin/recuperar-senha');
      await page.getByLabel('E-mail').fill('pessoa@exemplo.test');
      await page.getByRole('button', { name: 'Enviar link' }).click();
      await expect(page.getByRole('status')).toBeVisible();
    },
  },
  {
    name: 'nova senha',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto(`/admin/nova-senha${recoveryLinkHash()}`);
      await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
    },
  },
  {
    name: 'link expirado',
    open: async (page) => {
      await mockSupabase(page);
      await page.goto('/admin/nova-senha');
      await expect(page.getByRole('link', { name: 'Pedir novo link' })).toBeVisible();
    },
  },
  {
    name: 'editor',
    open: async (page) => {
      await mockSupabase(page);
      await seedSession(page);
      await page.goto('/admin');
      await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    },
  },
  {
    name: 'falha ao conferir o acesso',
    open: async (page) => {
      await mockSupabase(page, { admin: 'fails' });
      await seedSession(page);
      await page.goto('/admin');
      await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    },
  },
];

test.describe('qualidade de cada tela (CA-17)', () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: axe sem violações`, async ({ page }) => {
      await screen.open(page);

      await checkA11y(page);
    });

    test(`${screen.name}: sem rolagem horizontal de 320 a 1440px`, async ({ page }) => {
      await screen.open(page);

      const overflows: string[] = [];
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        if (scrollWidth > width) overflows.push(`${width}px: ${scrollWidth}px`);
      }

      expect(overflows).toEqual([]);
    });

    test(`${screen.name}: áreas de toque com pelo menos 48px`, async ({ page }) => {
      await screen.open(page);

      const small = await page
        .locator('a:visible, button:visible, input:visible')
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const { width, height } = element.getBoundingClientRect();
              const name = element.getAttribute('aria-label') ?? element.textContent?.trim();
              return { name: name || element.tagName, width, height };
            })
            .filter(({ width, height }) => width < 47.5 || height < 47.5)
            .map(
              ({ name, width, height }) => `${name}: ${Math.round(width)}x${Math.round(height)}`,
            ),
        );

      expect(small).toEqual([]);
    });
  }
});

test('o build do E2E fala só com o Supabase falso', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await mockSupabase(page);

  await page.goto('/admin/login');
  await expect(page.locator('[data-part="mark"]')).toHaveText('NS');

  const supabase = requests.filter((url) => !url.startsWith('http://localhost:4173'));
  expect(supabase.length).toBeGreaterThan(0);
  expect(supabase.every((url) => url.startsWith(E2E_SUPABASE_ORIGIN))).toBe(true);
});
