import type { Page } from '@playwright/test';
import type { SiteContent } from '../../../src/content/types';

const ROOT_AND_DATA =
  /<div id="root">[\s\S]*?<\/div>(\s*<script id="site-content"[^>]*>)([\s\S]*?)<\/script>/;

/** Preenche os contatos opcionais, que o conteúdo padrão deixa vazios. */
export function fillContacts(content: SiteContent) {
  content.contato.instagram.handle = 'perfil.de.teste';
  content.contato.email.address = 'contato@exemplo-teste.com.br';
  content.contato.phone.number = '5511912345678';
  content.contato.map.embedUrl = 'https://www.google.com/maps/embed?pb=fixture';
}

const unbroken = (length: number) => 'Palavra'.repeat(Math.ceil(length / 7)).slice(0, length);

/** Textos no limite do schema, sem espaços: o pior caso para a largura da tela. */
export function fillLongTexts(content: SiteContent) {
  fillContacts(content);
  const { geral, inicio, trabalho, atuacao, contato } = content;
  geral.name = unbroken(60);
  geral.crp = unbroken(20);
  geral.restrictedAreaLink = unbroken(30);
  geral.headerCta = unbroken(30);
  inicio.title = unbroken(90);
  inicio.primaryCta = unbroken(30);
  inicio.secondaryCta = unbroken(30);
  for (const card of trabalho.cards) card.title = unbroken(60);
  atuacao.focusTags = atuacao.focusTags.map(() => unbroken(40));
  contato.instagram.handle = unbroken(30);
  contato.email.address = `${unbroken(60)}@exemplo-teste.com.br`;
  contato.floatingButton.text = unbroken(30);
}

// O E2E usa o build com o conteúdo padrão (contatos opcionais vazios). Para ver os
// outros casos, troca-se o conteúdo embutido e esvazia-se o #root: o app monta do zero.
export async function gotoWithContent(page: Page, change: (content: SiteContent) => void) {
  // Nenhum teste acessa serviço externo: o mapa de teste responde vazio.
  await page.route('https://www.google.com/maps/**', (route) => route.fulfill({ body: '' }));
  await page.route('/', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const body = html.replace(ROOT_AND_DATA, (_, open: string, data: string) => {
      const content = JSON.parse(data) as SiteContent;
      change(content);
      const json = JSON.stringify(content).replace(/</g, '\\u003c');
      return `<div id="root"></div>${open}${json}</script>`;
    });
    await route.fulfill({ response, body });
  });
  await page.goto('/');
}
