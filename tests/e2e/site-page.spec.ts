import { expect, test, type Page } from '@playwright/test';
import { MENU_TARGETS, SECTION_IDS } from '../../src/site/anchors';
import { HEADER_PART } from '../../src/site/sections/headerParts';

// Spec 002, T09 — página completa no navegador (CA-02, CA-03, CA-13, RF-13, RF-18).

const floating = (page: Page) => page.locator('body a[data-part="floating"]');

test.describe('botão flutuante', () => {
  test('390px: 60px, só o ícone, e entra com "pop" depois de 600ms', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const button = floating(page);

    await expect(button).toBeVisible();
    // Mede-se depois do "pop", que parte de escala 0,6.
    await button.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
    const size = await button.boundingBox();
    expect(Math.round(size?.width ?? 0)).toBe(60);
    expect(Math.round(size?.height ?? 0)).toBe(60);
    expect(await button.evaluate((element) => getComputedStyle(element).position)).toBe('fixed');
    expect(await button.evaluate((element) => getComputedStyle(element).animationDelay)).toBe(
      '0.6s',
    );
    expect(await button.evaluate((element) => getComputedStyle(element).animationName)).toMatch(
      /pop/,
    );
    await expect(button.getByText('Fale comigo')).toHaveCSS('position', 'absolute');
  });

  test('1440px: mostra o texto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const label = floating(page).getByText('Fale comigo');

    await expect(label).toBeVisible();
    await expect(label).not.toHaveCSS('position', 'absolute');
  });

  for (const width of [390, 1440]) {
    test(`${width}px: no fim da página, não cobre o link "Área restrita"`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const link = page.locator('footer a');
      await expect(link).toBeInViewport();

      await expect
        .poll(() =>
          link.evaluate((element) => {
            const { left, right, top, bottom } = element.getBoundingClientRect();
            const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
            return hit === element;
          }),
        )
        .toBe(true);
    });
  }
});

test('o link "pular" aparece no foco e leva o foco ao main', async ({ page, browserName }) => {
  await page.goto('/');
  const skip = page.locator('.skip-link');

  // No Safari, Tab não passa por links por padrão.
  if (browserName === 'webkit') await skip.focus();
  else await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

for (const [key, id] of Object.entries(MENU_TARGETS)) {
  test(`âncora "${key}": o título da seção fica visível abaixo do header`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.locator(`header [data-part="${HEADER_PART.desktopNav}"] a[href="#${id}"]`).click();

    const heading = page.locator(`#${id} h2`);
    await expect
      .poll(async () => {
        const headerBox = await page.locator('header').boundingBox();
        const headingBox = await heading.boundingBox();
        return (
          (headingBox?.y ?? -1) >= (headerBox?.height ?? 0) && (headingBox?.y ?? 9999) < 900 - 40
        );
      })
      .toBe(true);
  });
}

test('âncora pelo menu do celular leva até a seção e fecha o menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');

  await page.locator(`header [data-part="${HEADER_PART.menuButton}"]`).click();
  const panel = page.locator(`header [data-part="${HEADER_PART.menuPanel}"]`);
  await panel.locator(`a[href="#${SECTION_IDS.contato}"]`).click();

  await expect(panel).toBeHidden();
  await expect(page.locator(`#${SECTION_IDS.contato} h2`)).toBeInViewport();
});

test.describe('casos de borda', () => {
  test('abrir em /#contato leva à seção, com o header descontado', async ({ page }) => {
    await page.goto(`/#${SECTION_IDS.contato}`);
    const heading = page.locator(`#${SECTION_IDS.contato} h2`);

    await expect(heading).toBeInViewport();
    await expect
      .poll(async () => {
        const headerBox = await page.locator('header').boundingBox();
        const headingBox = await heading.boundingBox();
        return (headingBox?.y ?? -1) >= (headerBox?.height ?? 0);
      })
      .toBe(true);
  });

  // Abre pela âncora: o WebKit do Playwright não restaura a rolagem ao recarregar.
  test('abrir já rolado: o header tem fundo sólido sem rolagem do usuário', async ({ page }) => {
    await page.goto(`/#${SECTION_IDS.contato}`);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(40);
    await expect(page.locator('header')).toHaveAttribute('data-scrolled');
  });

  test('movimento reduzido ligado no meio da visita: o resto não anima', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );

    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator(`#${SECTION_IDS.contato} [class*="reveal"]`).first()).toHaveCSS(
      'opacity',
      '1',
    );
  });
});

test('ao rolar até o fim, todo elemento marcado é revelado, uma vez', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  const marked = page.locator('main [class*="reveal"]');
  expect(await marked.count()).toBeGreaterThan(15);
  await expect(page.locator(`#${SECTION_IDS.contato} [data-revealed]`)).toHaveCount(0);

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(40);
  }

  await expect(page.locator('main [class*="reveal"]:not([data-revealed])')).toHaveCount(0);
});
