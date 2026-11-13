import { expect, test, type Page } from '@playwright/test';
import { defaultContent } from '../../src/content/defaults';
import { checkA11y } from './support/a11y';
import { tabTo, watchConsole } from './support/browser';
import { mockSupabase, seedSession } from './support/supabase';

// Spec 004, T08 (CA-16 e os fluxos de CA-01, CA-02, CA-05, CA-08 e CA-14 no navegador).
// O Supabase falso guarda as seções em memória: salvar e recarregar funciona de verdade.

const SECTIONS = [
  'geral',
  'inicio',
  'sobre',
  'trabalho',
  'atuacao',
  'comoFunciona',
  'espaco',
  'contato',
] as const;

const field = (page: Page, path: string) => page.locator(`[data-field-path="${path}"]`);
const status = (page: Page) => page.locator('header [data-part="status"]');
const saveButton = (page: Page) => page.getByRole('button', { name: 'Salvar e publicar' });
const picker = (page: Page) => page.getByRole('combobox', { name: /Seção do site/ });
const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Descartar alterações?' });

async function openEditor(page: Page, section?: string) {
  const mock = await mockSupabase(page);
  await seedSession(page);
  await page.goto(section ? `/admin?secao=${section}` : '/admin');
  await expect(page.locator('[data-field-path]').first()).toBeVisible();
  return mock;
}

test.describe('fluxos do editor', () => {
  test('editar, salvar, ver "agora" e recarregar com o texto salvo', async ({
    page,
    browserName,
  }) => {
    const problems = watchConsole(page, browserName);
    const mock = await openEditor(page);

    await field(page, 'name').fill('  Ana Souza  ');
    await expect(status(page)).toHaveText('Alterações não salvas');
    await saveButton(page).click();

    await expect(page.getByText('Publicado. O site atualiza em alguns minutos.')).toBeVisible();
    await expect(status(page)).toHaveText('Última publicação: agora');
    await expect(saveButton(page)).toBeDisabled();
    expect(mock.writes).toHaveLength(1);
    expect((mock.writes[0]?.body.data as { name: string }).name).toBe('Ana Souza');

    await page.reload();

    await expect(field(page, 'name')).toHaveValue('Ana Souza');
    await expect(status(page)).toHaveText(
      /^Última publicação: \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/,
    );
    expect(mock.outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('erro de validação: nada é gravado e o foco vai ao campo', async ({ page }) => {
    const mock = await openEditor(page);

    await field(page, 'name').fill('');
    await saveButton(page).click();

    await expect(page.getByText('1 campo precisa de ajuste.')).toBeVisible();
    await expect(field(page, 'name')).toBeFocused();
    await expect(page.getByText('Campo obrigatório')).toBeVisible();
    expect(mock.writes).toEqual([]);
  });

  test('lista só com o teclado: mover e adicionar, com o foco acompanhando', async ({
    page,
    browserName,
  }) => {
    await openEditor(page, 'sobre');
    const [first, second] = defaultContent.sobre.education;

    await tabTo(
      page,
      page.getByRole('button', { name: 'Mover Item da formação 2 para cima' }),
      browserName,
    );
    await page.keyboard.press('Enter');

    await expect(field(page, 'education.0')).toHaveValue(second ?? '');
    await expect(field(page, 'education.1')).toHaveValue(first ?? '');
    await expect(
      page.getByRole('button', { name: 'Mover Item da formação 1 para baixo' }),
    ).toBeFocused();

    await tabTo(page, page.getByRole('button', { name: 'Adicionar item: Formação' }), browserName);
    await page.keyboard.press('Enter');

    const count = defaultContent.sobre.education.length + 1;
    await expect(page.getByText(`Item da formação ${count}`, { exact: true })).toBeFocused();
    await expect(field(page, `education.${count - 1}`)).toHaveValue('');
  });

  test('alterações não salvas: a janela prende o foco, Esc continua editando', async ({
    page,
    browserName,
  }) => {
    await openEditor(page);
    await field(page, 'name').fill('Rascunho');

    await picker(page).selectOption('contato');

    await expect(confirmDialog(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar editando' })).toBeFocused();
    for (let presses = 0; presses < 4; presses += 1) {
      await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
      const escaped = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('dialog');
        return Boolean(active && active !== document.body && !dialog?.contains(active));
      });
      expect(escaped, 'o foco saiu da janela').toBe(false);
    }

    await page.keyboard.press('Escape');

    await expect(confirmDialog(page)).toBeHidden();
    await expect(picker(page)).toHaveValue('geral');
    await expect(field(page, 'name')).toHaveValue('Rascunho');
  });

  test('alterações não salvas: "Descartar" troca de seção e perde o rascunho', async ({ page }) => {
    await openEditor(page);
    await field(page, 'name').fill('Rascunho');
    await picker(page).selectOption('contato');

    await confirmDialog(page).getByRole('button', { name: 'Descartar' }).click();

    await expect(page).toHaveURL(/\?secao=contato$/);
    await expect(field(page, 'whatsapp.number')).toBeVisible();
    await picker(page).selectOption('geral');
    await expect(confirmDialog(page)).toBeHidden();
    await expect(field(page, 'name')).not.toHaveValue('Rascunho');
  });

  test('fechar a aba com alterações: o navegador pergunta', async ({ page }) => {
    await openEditor(page);
    await field(page, 'name').fill('Rascunho');
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.type());
      void dialog.dismiss();
    });

    await page.close({ runBeforeUnload: true });

    await expect.poll(() => dialogs).toEqual(['beforeunload']);
  });

  test('fechar a aba sem alterações: o navegador não pergunta', async ({ page }) => {
    await openEditor(page);
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.type());
      void dialog.dismiss();
    });

    await page.close({ runBeforeUnload: true });

    expect(dialogs).toEqual([]);
  });
});

type Screen = { name: string; open: (page: Page) => Promise<void> };

const SCREENS: Screen[] = [
  ...SECTIONS.map((key) => ({
    name: `seção ${key}`,
    open: async (page: Page) => {
      await openEditor(page, key);
    },
  })),
  {
    name: 'resumo de erros',
    open: async (page: Page) => {
      await openEditor(page);
      await field(page, 'name').fill('');
      await saveButton(page).click();
      await expect(page.getByText('1 campo precisa de ajuste.')).toBeVisible();
    },
  },
  {
    name: 'janela de alterações não salvas',
    open: async (page: Page) => {
      await openEditor(page);
      await field(page, 'name').fill('Rascunho');
      await picker(page).selectOption('contato');
      await expect(confirmDialog(page)).toBeVisible();
    },
  },
];

test.describe('qualidade do editor (CA-16)', () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: axe sem violações`, async ({ page }) => {
      await screen.open(page);

      await checkA11y(page);
    });

    test(`${screen.name}: sem rolagem horizontal de 320 a 1440px`, async ({ page }) => {
      await screen.open(page);

      const overflows: string[] = [];
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 800 });
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        if (scrollWidth > width) overflows.push(`${width}px: ${scrollWidth}px`);
      }

      expect(overflows).toEqual([]);
    });

    test(`${screen.name}: áreas de toque com pelo menos 48px`, async ({ page }) => {
      await screen.open(page);

      const small = await page
        .locator('a:visible, button:visible, input:visible, select:visible')
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              // A caixa de marcar é tocada pela linha inteira do rótulo.
              const target =
                element instanceof HTMLInputElement && element.type === 'checkbox'
                  ? (element.closest('label') ?? element)
                  : element;
              const { width, height } = target.getBoundingClientRect();
              const name =
                element.getAttribute('aria-label') ??
                element.getAttribute('data-field-path') ??
                element.textContent?.trim();
              return { name: name || element.tagName, width, height };
            })
            .filter(({ width, height }) => width < 47.5 || height < 47.5)
            .map(
              ({ name, width, height }) => `${name}: ${Math.round(width)}x${Math.round(height)}`,
            ),
        );

      expect(small).toEqual([]);
    });
  }
});
