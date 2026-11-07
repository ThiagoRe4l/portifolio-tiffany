import { expect, test, type Page } from '@playwright/test';

// CA-04 (parte E2E): com prefers-reduced-motion: reduce, nenhuma animação ou
// transição roda e a rolagem suave é desligada. O contraponto (sem preferência)
// prova que a regra só vale para quem pediu movimento reduzido.

/** Injeta um elemento com transição e animação e devolve os estilos calculados. */
async function motionStyles(page: Page) {
  await page.goto('/');
  return page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes probe-fade { from { opacity: 0 } to { opacity: 1 } }
      #motion-probe { transition: opacity 700ms, transform 700ms; animation: probe-fade 700ms; }
    `;
    document.head.append(style);

    const probe = document.createElement('div');
    probe.id = 'motion-probe';
    document.body.append(probe);

    const computed = getComputedStyle(probe);
    return {
      transitionDuration: computed.transitionDuration,
      animationName: computed.animationName,
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
}

test.describe('com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('transições, animações e rolagem suave ficam desligadas', async ({ page }) => {
    const styles = await motionStyles(page);

    expect(styles.transitionDuration.split(',').map((value) => value.trim())).toEqual(['0s']);
    expect(styles.animationName).toBe('none');
    expect(styles.scrollBehavior).toBe('auto');
  });
});

test.describe('sem preferência de movimento', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('transições, animações e rolagem suave funcionam', async ({ page }) => {
    const styles = await motionStyles(page);

    expect(styles.transitionDuration).toContain('0.7s');
    expect(styles.animationName).toBe('probe-fade');
    expect(styles.scrollBehavior).toBe('smooth');
  });
});
