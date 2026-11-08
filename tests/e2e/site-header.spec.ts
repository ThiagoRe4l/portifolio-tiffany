import { expect, test, type Page } from '@playwright/test';
import { HEADER_PART } from '../../src/site/sections/headerParts';

// Spec 002, T05 — header por largura (RF-04 / CA-04), no navegador de verdade.
// Âncoras com o título visível ficam para a T09 (as seções ainda não existem).

const part = (page: Page, name: string) => page.locator(`header [data-part="${name}"]`);

/** Nenhum texto do header cortado e tudo numa linha só. */
async function expectSingleLineWithoutClipping(page: Page) {
  const report = await page.locator('header').evaluate((header) => {
    const row = header.querySelector<HTMLElement>('[data-part="row"]');
    const clipped = [...header.querySelectorAll<HTMLElement>('a, button, span')]
      .filter((element) => element.offsetParent !== null)
      // Texto só para leitores de tela (.visually-hidden) é recortado de propósito.
      .filter((element) => !element.closest('.visually-hidden'))
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.textContent);
    return { rowHeight: row?.getBoundingClientRect().height ?? 0, clipped };
  });

  expect(report.clipped).toEqual([]);
  expect(report.rowHeight).toBeLessThanOrEqual(80);
}

const CASES = [
  { width: 390, menuButton: true, cta: false, links: false },
  { width: 768, menuButton: true, cta: true, links: false },
  { width: 1024, menuButton: true, cta: true, links: false },
  { width: 1279, menuButton: true, cta: true, links: false },
  { width: 1280, menuButton: false, cta: true, links: true },
  { width: 1440, menuButton: false, cta: true, links: true },
];

for (const { width, menuButton, cta, links } of CASES) {
  test(`${width}px: menu ${menuButton ? 'sim' : 'não'}, botão do topo ${cta ? 'sim' : 'não'}, links ${links ? 'sim' : 'não'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');

    await expect(part(page, HEADER_PART.menuButton)).toBeVisible({ visible: menuButton });
    await expect(part(page, HEADER_PART.cta)).toBeVisible({ visible: cta });
    await expect(part(page, HEADER_PART.desktopNav)).toBeVisible({ visible: links });
    await expectSingleLineWithoutClipping(page);
  });
}

test('rótulos longos em 1440px: volta para o menu, sem cortar nem quebrar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto('/');
  await expect(part(page, HEADER_PART.desktopNav)).toBeVisible();

  await part(page, HEADER_PART.desktopNav).evaluate((nav) => {
    for (const link of nav.querySelectorAll('a')) link.textContent = 'X'.repeat(24);
  });

  await expect(page.locator('header')).toHaveAttribute('data-nav', 'compact');
  await expect(part(page, HEADER_PART.desktopNav)).toBeHidden();
  await expect(part(page, HEADER_PART.menuButton)).toBeVisible();
  await expectSingleLineWithoutClipping(page);
});

test('menu pelo teclado: abre, foco no primeiro link, Esc fecha e devolve o foco', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  const button = part(page, HEADER_PART.menuButton);

  await button.focus();
  await page.keyboard.press('Enter');
  const panel = part(page, HEADER_PART.menuPanel);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link').first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
});

test('menu aberto e a tela cresce para 1440px: o menu fecha', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await part(page, HEADER_PART.menuButton).click();
  await expect(part(page, HEADER_PART.menuPanel)).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 800 });

  await expect(part(page, HEADER_PART.menuPanel)).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-menu-open');
});

test('o header fica fixo no topo', async ({ page }) => {
  await page.goto('/');

  expect(await page.locator('header').evaluate((header) => getComputedStyle(header).position)).toBe(
    'fixed',
  );
});
