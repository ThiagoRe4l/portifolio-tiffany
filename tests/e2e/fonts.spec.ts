import { expect, test } from '@playwright/test';

// CA-05: fontes auto-hospedadas, sem Google Fonts, com preload.

const FONT_FILES = ['inter-latin-wght-normal.woff2', 'fraunces-latin-500-normal.woff2'];

test('as fontes vêm do próprio site, em WOFF2, com preload', async ({ page, baseURL }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  const fontResponses = FONT_FILES.map((file) =>
    page.waitForResponse((response) => response.url().endsWith(`/fonts/${file}`)),
  );

  await page.goto('/');
  const responses = await Promise.all(fontResponses);

  expect(requests.filter((url) => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);

  const origin = new URL(baseURL ?? page.url()).origin;
  for (const response of responses) {
    expect(new URL(response.url()).origin).toBe(origin);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/font\/woff2/);
  }

  for (const file of FONT_FILES) {
    const preload = page.locator(`link[rel="preload"][as="font"][href="/fonts/${file}"]`);
    await expect(preload).toHaveAttribute('type', 'font/woff2');
    await expect(preload).toHaveAttribute('crossorigin', '');
  }
});
