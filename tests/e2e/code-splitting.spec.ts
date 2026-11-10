import { expect, test, type Page } from '@playwright/test';
import { mockSupabase } from './support/supabase';

// CA-03 (parte E2E): o visitante do site nunca baixa o código do admin.

const ADMIN_CHUNK = /\/assets\/AdminApp-[\w-]+\.js$/;

function collectScripts(page: Page): string[] {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  return scripts;
}

test('"/" não baixa o chunk do admin', async ({ page }) => {
  const scripts = collectScripts(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter((url) => ADMIN_CHUNK.test(url))).toEqual([]);
});

test('"/admin/login" baixa o chunk do admin e mantém a URL', async ({ page }) => {
  const scripts = collectScripts(page);

  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');

  expect(scripts.filter((url) => ADMIN_CHUNK.test(url))).toHaveLength(1);
  expect(new URL(page.url()).pathname).toBe('/admin/login');
});

test('caminho desconhecido do site volta para "/" sem baixar o admin', async ({ page }) => {
  const scripts = collectScripts(page);

  await page.goto('/pagina-que-nao-existe');
  await page.waitForLoadState('networkidle');

  expect(new URL(page.url()).pathname).toBe('/');
  expect(scripts.filter((url) => ADMIN_CHUNK.test(url))).toEqual([]);
});

// Spec 003 (RF-09): sem sessão, o "/admin" para onde o caminho volta leva ao login.
test('caminho desconhecido do admin, sem sessão, termina no login', async ({ page }) => {
  await mockSupabase(page);

  await page.goto('/admin/nao-existe');

  await expect(page).toHaveURL(/\/admin\/login$/);
});
