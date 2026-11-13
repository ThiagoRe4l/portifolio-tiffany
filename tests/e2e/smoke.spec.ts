import { expect, test } from '@playwright/test';
import { checkA11y } from './support/a11y';
import { mockSupabase } from './support/supabase';

// CA-08: cada página abre em cada viewport (mobile primeiro) sem violações do axe.

for (const path of ['/', '/admin/login', '/admin']) {
  test(`${path} abre sem erros e passa no axe`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    // O admin busca dados (as iniciais do login): sem a simulação, a busca no domínio
    // falso do E2E falha e, conforme o tempo, aparece no console (spec 003, T09).
    if (path.startsWith('/admin')) await mockSupabase(page);

    await page.goto(path);
    await expect(page.locator('main')).toBeAttached();
    if (path.startsWith('/admin')) await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    expect(errors, 'erros no console').toEqual([]);
    await checkA11y(page);
  });
}
