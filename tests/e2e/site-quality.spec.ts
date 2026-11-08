import { expect, test, type Page } from '@playwright/test';
import { defaultContent } from '../../src/content/defaults';
import type { SiteContent } from '../../src/content/types';
import { SECTION_IDS } from '../../src/site/anchors';
import { checkA11y } from './support/a11y';
import { fillContacts, fillLongTexts, gotoWithContent } from './support/content';

// Spec 002, T10 — qualidade no navegador (CA-09, CA-07, CA-15, CA-18, CA-19, CA-20, CA-23).

const WIDTHS = [320, 390, 768, 1024, 1280, 1440];
const DESKTOP_PROJECT = 'desktop';
const CLS_LIMIT = 0.1;

const PHOTO_URL = '/e2e-foto.png';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const VARIANTS: { name: string; open: (page: Page) => Promise<unknown> }[] = [
  { name: 'conteúdo padrão', open: (page) => page.goto('/') },
  { name: 'contatos preenchidos', open: (page) => gotoWithContent(page, fillContacts) },
];

function fillPhotos(content: SiteContent) {
  content.inicio.photo.src = PHOTO_URL;
  content.sobre.photo.src = PHOTO_URL;
  for (const item of content.espaco.photos) item.photo.src = PHOTO_URL;
}

/** Rola a página inteira em passos, como uma pessoa faria. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let top = 0; top < height; top += 300) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    await page.waitForTimeout(40);
  }
}

test.describe('acessibilidade (CA-23)', () => {
  for (const { name, open } of VARIANTS) {
    test(`axe sem violações: ${name}`, async ({ page }) => {
      await open(page);
      await expect(page.locator('main')).toBeAttached();
      await checkA11y(page);
    });
  }
});

test.describe('sem rolagem horizontal, de 320 a 1440px (CA-23)', () => {
  const cases = [
    ...VARIANTS,
    {
      name: 'textos longos, no limite do schema',
      open: (page: Page) => gotoWithContent(page, fillLongTexts),
    },
  ];

  for (const { name, open } of cases) {
    test(name, async ({ page }) => {
      await open(page);
      await expect(page.locator('main')).toBeAttached();
      const overflowing: string[] = [];

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        // Compara com a largura pedida: no celular, conteúdo largo infla o `innerWidth`.
        const culprits = await page.evaluate((limit) => {
          if (document.documentElement.scrollWidth <= limit) return null;
          const exceeds = (element: Element) => element.getBoundingClientRect().right > limit + 1;
          return [...document.body.querySelectorAll('*')]
            .filter((element) => exceeds(element) && ![...element.children].some(exceeds))
            .map((element) => `${element.tagName}.${element.getAttribute('class') ?? ''}`);
        }, width);
        if (culprits) overflowing.push(`${width}px: ${[...new Set(culprits)].join(', ')}`);
      }

      expect(overflowing).toEqual([]);
    });
  }
});

test.describe('estabilidade do layout (CA-15, CA-23)', () => {
  // A API de layout-shift só existe no Chromium; o WebKit fica de fora desta medida.
  test.skip(({ browserName }) => browserName !== 'chromium', 'layout-shift só no Chromium');

  async function measureCls(page: Page, open: () => Promise<unknown>) {
    await page.addInitScript(() => {
      const store = window as unknown as Record<string, number>;
      store.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) store.__cls = (store.__cls ?? 0) + shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await open();
    await page.evaluate(() => document.fonts.ready);
    await scrollThrough(page);
    await page.waitForTimeout(800);
    return page.evaluate(() => (window as unknown as Record<string, number>).__cls ?? 0);
  }

  test('CLS < 0,1 ao carregar e rolar até o fim', async ({ page }) => {
    const cls = await measureCls(page, () => page.goto('/'));

    expect(cls).toBeLessThan(CLS_LIMIT);
  });

  test('CLS < 0,1 quando as fotos chegam depois do texto', async ({ page }) => {
    await page.route(`**${PHOTO_URL}`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({ body: ONE_PIXEL_PNG, contentType: 'image/png' });
    });

    const cls = await measureCls(page, () => gotoWithContent(page, fillPhotos));

    expect(cls).toBeLessThan(CLS_LIMIT);
  });
});

test.describe('com movimento reduzido (CA-19)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nada anima e tudo já está no estado final', async ({ page }) => {
    await page.goto('/');

    const atStart = await page.evaluate(() => document.getAnimations().length);
    await scrollThrough(page);
    const afterScroll = await page.evaluate(() => document.getAnimations().length);
    const hidden = await page
      .locator('[class*="reveal"]')
      .evaluateAll(
        (elements) =>
          elements.filter((element) => getComputedStyle(element).opacity !== '1').length,
      );

    expect(atStart).toBe(0);
    expect(afterScroll).toBe(0);
    expect(hidden).toBe(0);
    await expect(page.locator('body a[data-part="floating"]')).toHaveCSS('opacity', '1');
  });
});

test.describe('sem JavaScript (CA-20)', () => {
  test.use({ javaScriptEnabled: false });

  const NOT_TEXT = new Set(['photo', 'icon']);

  function strings(value: unknown): string[] {
    if (typeof value === 'string') return value ? [value] : [];
    if (Array.isArray(value)) return value.flatMap(strings);
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, child]) =>
        NOT_TEXT.has(key) ? [] : strings(child),
      );
    }
    return [];
  }

  test('todo o texto do conteúdo aparece', async ({ page }) => {
    const { geral, contato, inicio, sobre, trabalho, atuacao, comoFunciona, espaco } =
      defaultContent;
    const expected = [
      ...strings({ inicio, sobre, trabalho, atuacao, comoFunciona, espaco }),
      ...strings([contato.eyebrow, contato.title, contato.text, contato.whatsapp.buttonText]),
      ...strings([contato.address.text, contato.hours.text, contato.floatingButton.text]),
      ...strings([geral.name, geral.crp, geral.restrictedAreaLink]),
    ];

    await page.goto('/');
    const visible = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      while (walker.nextNode()) {
        const parent = walker.currentNode.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
        if (parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) {
          parts.push(walker.currentNode.textContent ?? '');
        }
      }
      return parts.join('\n');
    });

    expect(expected.filter((text) => !visible.includes(text))).toEqual([]);
  });
});

test('com JavaScript, o que está fora da tela espera a rolagem (CA-20)', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-motion');
  await expect(page.locator(`#${SECTION_IDS.contato} [class*="reveal"]`).first()).toHaveCSS(
    'opacity',
    '0',
  );
});

test.describe('hover (CA-18)', () => {
  const card = (page: Page) => page.locator(`#${SECTION_IDS.trabalho} [class*="lift"]`).first();

  async function revealCard(page: Page) {
    await page.goto('/');
    await card(page).scrollIntoViewIfNeeded();
    await expect(card(page).locator('xpath=ancestor::li')).toHaveCSS('opacity', '1');
  }

  test('desktop: o card sobe 4px com sombra e a foto da galeria dá zoom', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, 'hover só existe no desktop');
    await revealCard(page);

    await card(page).hover();
    await expect(card(page)).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
    await expect(card(page)).not.toHaveCSS('box-shadow', 'none');

    const photo = page.locator(`#${SECTION_IDS.espaco} [class*="zoom"]`).first();
    await photo.scrollIntoViewIfNeeded();
    await expect(photo.locator('xpath=ancestor::li')).toHaveCSS('opacity', '1');
    await photo.hover();
    await expect(photo.locator(':scope > *').first()).toHaveCSS(
      'transform',
      'matrix(1.03, 0, 0, 1.03, 0, 0)',
    );
  });

  test('toque: nenhum efeito de hover fica preso', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === DESKTOP_PROJECT, 'caso de tela de toque');
    await revealCard(page);

    await card(page).tap();
    await page.waitForTimeout(350);

    await expect(card(page)).toHaveCSS('transform', 'none');
    await expect(card(page)).toHaveCSS('box-shadow', 'none');
  });
});

test.describe('console limpo (CA-23)', () => {
  for (const { name, open } of VARIANTS) {
    test(`sem erros nem avisos: ${name}`, async ({ page }) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(error.message));
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) problems.push(message.text());
      });

      await open(page);
      await expect(page.locator('main')).toBeAttached();
      await scrollThrough(page);

      expect(problems).toEqual([]);
    });
  }
});

test.describe('formato por largura (CA-07, CA-09)', () => {
  const columns = async (page: Page) => {
    const boxes = await page
      .locator(`#${SECTION_IDS.trabalho} li`)
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().left)));
    return new Set(boxes).size;
  };

  test('390px: passos com "1" e cards em uma coluna', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const numbers = page.locator(`#${SECTION_IDS.comoFunciona} li`).first().locator('> span');

    await expect(numbers.nth(0)).toBeVisible();
    await expect(numbers.nth(0)).toHaveText('1');
    await expect(numbers.nth(1)).toBeHidden();
    expect(await columns(page)).toBe(1);
  });

  test('1440px: passos com "01" e cards em mais de uma coluna', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const numbers = page.locator(`#${SECTION_IDS.comoFunciona} li`).first().locator('> span');

    await expect(numbers.nth(0)).toBeHidden();
    await expect(numbers.nth(1)).toBeVisible();
    await expect(numbers.nth(1)).toHaveText('01');
    expect(await columns(page)).toBeGreaterThan(1);
  });
});
