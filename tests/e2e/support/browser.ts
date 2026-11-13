import type { Locator, Page } from '@playwright/test';

/**
 * Aviso intermitente do WebKit (cerca de 2 em 5 repetições dos fluxos do admin), mesmo
 * com as fontes em uso na tela. No site o mesmo preload nunca o dispara. Decisão do
 * Thiago (spec 003): manter o filtro e investigar só se aparecer num iPhone real.
 */
const WEBKIT_PRELOAD_NOTICE =
  /^The resource \S+\/fonts\/\S+\.woff2 was preloaded using link preload but not used within a few seconds/;

/** Erros e avisos do console e da página, para conferir que ficou limpo. */
export function watchConsole(page: Page, browserName: string): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    if (browserName === 'webkit' && WEBKIT_PRELOAD_NOTICE.test(message.text())) return;
    problems.push(message.text());
  });
  return problems;
}

/** Leva o foco ao elemento só com o teclado. No Safari, Tab pula links; Alt+Tab passa por tudo. */
export async function tabTo(page: Page, target: Locator, browserName: string, limit = 80) {
  const key = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let presses = 0; presses < limit; presses += 1) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('o foco não chegou ao elemento pelo teclado');
}
