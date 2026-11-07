import { expect, test, type ConsoleMessage } from '@playwright/test';
import { defaultContent } from '../../src/content/defaults';

// T09 — spec 001: HTML pré-renderizado (CA-11), nenhuma requisição externa (CA-12)
// e arquivos para robôs (CA-16). O build do E2E roda sem Supabase: conteúdo padrão.

test.describe('com JavaScript desligado', () => {
  test.use({ javaScriptEnabled: false });

  test('o HTML já traz o head, o site e o conteúdo embutido', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(defaultContent.geral.seoTitle);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      defaultContent.geral.seoDescription,
    );
    await expect(page.locator('#site-content')).toHaveAttribute('type', 'application/json');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.locator('#root > main')).toHaveCount(1);
  });
});

test('com JavaScript, hidrata sem erros nem avisos no console', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (['error', 'warning'].includes(message.type())) problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(error.message));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(problems).toEqual([]);
  await expect(page.locator('#root > main')).toHaveCount(1);
});

test('nenhuma requisição sai do localhost (o visitante não acessa o Supabase)', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const { hostname } = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(hostname)) external.push(request.url());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(external).toEqual([]);
});

// /admin/* depende da reescrita do preview (T10), igual ao _redirects do Cloudflare.
for (const path of ['/admin', '/admin/login', '/admin/qualquer/coisa']) {
  test(`${path} é servido pelo admin.html, com noindex e sem o conteúdo do site`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('#site-content')).toHaveCount(0);
  });
}

test('/robots.txt bloqueia /admin', async ({ request }) => {
  const response = await request.get('/robots.txt');

  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain('Disallow: /admin');
});
