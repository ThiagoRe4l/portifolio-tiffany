import { expect, test, type Locator } from '@playwright/test';
import { fillContacts, gotoWithContent } from './support/content';

// Spec 002, T08 — layout por largura de "O espaço" e "Contato" (RF-10, RF-11 / CA-10, CA-11).

const PHONE_FORMATTED = '(11) 91234-5678';

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  if (!value) throw new Error('elemento sem caixa');
  return value;
}

test.describe('galeria', () => {
  test('390px: a primeira foto é grande e as próximas ficam em par', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const items = page.locator('#espaco li');
    const [first, second, third] = [
      await box(items.nth(0)),
      await box(items.nth(1)),
      await box(items.nth(2)),
    ];

    expect(first.width).toBeGreaterThan(second.width * 1.5);
    expect(second.y).toBeGreaterThan(first.y);
    expect(third.y).toBe(second.y);
  });

  test('1280px: as fotos ficam em 3 colunas iguais', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const items = page.locator('#espaco li');
    const [first, second, third] = [
      await box(items.nth(0)),
      await box(items.nth(1)),
      await box(items.nth(2)),
    ];

    expect(second.y).toBe(first.y);
    expect(third.y).toBe(first.y);
    expect(Math.abs(first.width - third.width)).toBeLessThanOrEqual(1);
  });
});

test.describe('contato', () => {
  test('390px, tudo preenchido: 3 cartões, sem linha do telefone, com mapa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoWithContent(page, fillContacts);
    const section = page.locator('#contato');
    const channels = section.locator('[data-part="channels"] a');

    await expect(channels).toHaveCount(3);
    for (const channel of await channels.all()) await expect(channel).toBeVisible();
    const [first, second, third] = [
      await box(channels.nth(0)),
      await box(channels.nth(1)),
      await box(channels.nth(2)),
    ];
    expect(second.y).toBe(first.y);
    expect(third.y).toBe(first.y);
    await expect(section.getByRole('group', { name: 'Ligar' })).toBeHidden();
    await expect(section.locator('iframe')).toBeVisible();
  });

  test('1440px, tudo preenchido: pílulas ao lado do WhatsApp, linha do telefone e mapa à direita', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithContent(page, fillContacts);
    const section = page.locator('#contato');
    const channels = section.locator('[data-part="channels"] a');
    const whatsapp = section.getByRole('link', { name: /Chamar no WhatsApp/ });

    await expect(channels.nth(2)).toBeHidden();
    const [main, instagram, email] = [
      await box(whatsapp),
      await box(channels.nth(0)),
      await box(channels.nth(1)),
    ];
    expect(instagram.y).toBe(main.y);
    expect(email.y).toBe(main.y);

    const phoneLine = section.getByRole('group', { name: 'Ligar' });
    await expect(phoneLine.getByRole('link', { name: PHONE_FORMATTED })).toBeVisible();
    expect((await box(section.locator('iframe'))).x).toBeGreaterThan(main.x + main.width / 2);
  });

  test('1440px, sem mapa: o conteúdo ocupa a largura, sem coluna vazia', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const section = page.locator('#contato');
    const copy = section.locator('h2').locator('xpath=ancestor::div[2]');

    await expect(section.locator('iframe')).toHaveCount(0);
    expect((await box(copy)).width).toBeGreaterThan(900);
  });

  test('o endereço mantém as quebras de linha', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoWithContent(page, (content) => {
      content.contato.address.text = 'Rua A\nBairro B\nCidade C';
    });
    const line = page.locator('#contato').getByRole('group', { name: 'Endereço' });
    const hours = page.locator('#contato').getByRole('group', { name: 'Horários' });

    expect((await box(line)).height).toBeGreaterThan((await box(hours)).height * 2.5);
  });
});
