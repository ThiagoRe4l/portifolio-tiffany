import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Roda o axe (WCAG 2.1 AA) na página atual e falha listando as violações. */
export async function checkA11y(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();

  const violations = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'sem impacto'}): ${violation.help} — ` +
      violation.nodes.map((node) => node.target.join(' ')).join(', '),
  );

  expect(violations, 'violações de acessibilidade (axe)').toEqual([]);
}
