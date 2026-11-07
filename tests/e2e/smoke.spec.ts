import { expect, test } from '@playwright/test';
import { checkA11y } from './support/a11y';

// CA-08: cada página abre em cada viewport (mobile primeiro) sem violações do axe.

for (const path of ['/', '/admin/login', '/admin']) {
  test(`${path} abre sem erros e passa no axe`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(path);
    await expect(page.locator('main')).toBeAttached();

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    expect(errors, 'erros no console').toEqual([]);
    await checkA11y(page);
  });
}
