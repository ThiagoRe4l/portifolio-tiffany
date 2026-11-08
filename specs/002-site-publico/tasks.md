# 002 — Site público: tarefas

> Status: **Gate 2 aprovado** em 2026-11-07
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**O que você vê no `npm run dev`:**
- **depois da T05:** header e hero;
- **depois da T06:** até "Sobre mim";
- **depois da T08:** a página inteira;
- **na T09:** as animações finais.

**Autorizações extras:** nenhuma dependência nova. A T01 mexe no contrato da 001 (ajustes A1–A3), então vale a aprovação deste Gate 2 junto com os ajustes.

---

### T01 — Ajustes no conteúdo (A1–A3 e ícones padrão) `[x] concluída` (2026-11-07)
- **Resultado**: 35 casos que falhavam agora verdes; suíte 626/626; `npm run check`, `format:check` e E2E 51/51 ok. Sem desvios.
- **Faz:**
  - `schema.ts`: `geral.footerText` e `atuacao.audience[].text` viram opcionais;
  - `defaults.ts`: textos do design (A1), títulos opcionais vazios (A2), texto do público vazio (A3) e ícones dos cards conforme o plano (D4);
  - `icons.ts`: rótulos de `family` e `school` conforme os desenhos.
- **Cobre:** ajustes A1–A3 da spec.
- **Testes (atualizações da 001):**
  - `defaults.test.ts`: os textos do design passam a aprovados, com o texto exato por campo, e a regra "não inventa" continua valendo para o resto;
  - `schema.test.ts`: `OPTIONAL_FIELDS` com os 2 novos;
  - `load.test.ts`: o aviso de placeholders ainda lista `geral.name`;
  - `content-fixture.test.ts`: o conteúdo de teste continua preenchendo os opcionais, para o site mostrá-los nos testes.

### T02 — Base: tokens, lint, âncoras, rótulos e contatos `[x] concluída` (2026-11-07)
- **Resultado**: suíte 681/681; `npm run check`, `format:check` e E2E 51/51 ok. Extras: `hrefTo(id)` em `anchors.ts`; `scroll-margin-top` usa `--header-h-lg` a partir de 1024px. A exceção de lint para SVG anotada na 000/T03 não é mais necessária (geometria em variáveis já passa).
- **Faz:**
  - tokens do plano (D7) e estilo do link "pular";
  - `TECHNICAL_ATTRIBUTE_VALUES` (D8);
  - `anchors.ts` e `a11yLabels.ts` com os 5 rótulos;
  - `src/lib/phone.ts` e `src/lib/contactLinks.ts`.
- **Cobre:** RF-02 (ids), RF-14 e a parte de cores do RNF de acessibilidade.
- **Testes:**
  - **`contrast.test.ts`:** os pares novos ≥ 4,5:1, inclusive `--color-accent-on-sand` sobre areia; o par terracota/areia continua proibido;
  - **`tokens.test.ts`:** os valores novos;
  - **`lint-rules.test.ts`:**
    - `role="img"` passa em `src/site`;
    - um texto continua sendo barrado;
    - uma geometria de SVG vinda de variável passa;
  - **`a11yLabels.test.ts`:** exatamente os 5 textos aprovados;
  - **`phone.test.ts`:** celular, fixo, entrada inválida;
  - **`contactLinks.test.ts`:** Instagram, `mailto:`, `tel:+55…`, e e-mail com `+` e `.`.

### T03 — Ícones, foto e botões `[x] concluída` (2026-11-07)
- **Resultado**: suíte 750/750; `npm run check`, `format:check` e E2E 51/51 ok. Extras: `src/site/cx.ts` (`cx` e `VISUALLY_HIDDEN`); exceção do `jsx-no-literals` para `src/site/**/*.test.tsx` (testes usam textos de exemplo), com teste. O espaço antes de "(abre em nova aba)" fica fora do span escondido, senão o nome acessível sai colado.
- **Faz:** `icons/paths.ts`, `Icon`, `Photo`, `ButtonLink` (com `external`) e `SectionHeading` (etiqueta e título), com CSS.
- **Cobre:** CA-15, CA-16 e parte do CA-14.
- **Testes:**
  - **ícones:**
    - cada um dos 12 ícones de card e dos 11 de interface renderiza um SVG com viewBox 24, `aria-hidden` e `focusable="false"`;
    - todos usam traço 1.8, com o check como exceção declarada;
    - a lista de `paths.ts` cobre exatamente os ids de `ICONS`;
  - **foto:**
    - com `src`, sai `<img>` com `width`, `height`, `alt` e `lazy`; com `priority`, sai `eager` e `fetchpriority="high"`;
    - sem `src`, sai `role="img"`, com o nome igual ao `alt`, `aspect-ratio` e nenhum texto visível;
  - **botão externo:** `target="_blank"`, `rel` e o nome acessível termina com "(abre em nova aba)";
  - **título de seção:** etiqueta e `h2` com o nível correto.

### T04 — Animações e movimento reduzido `[x] concluída` (2026-11-07)
- **Resultado**: suíte 770/770; `npm run check`, `format:check` e E2E 51/51 ok; JS inicial 67,8 KB. Prova de mutação: sem a checagem de movimento reduzido no `useReveal`, o teste obrigatório falha. O script inline tem `<!-- prettier-ignore -->` para continuar em uma linha. Nota para a T07: `.reveal[data-revealed]` e `.lift` disputam a propriedade `transition` no mesmo elemento; o card vai usar `.reveal` no wrapper e `.lift` no card.
- **Faz:**
  - o script inline no `index.html` (`data-motion="pending"` e a trava de 3 s);
  - `markMotionReady()` no `bootstrap`;
  - `useReveal` (IO compartilhado, 15%, uma vez, `--i`);
  - `motion.module.css` (`fadeUp`, `pop`, a sequência, o movimento reduzido e o hover só com ponteiro).
- **Cobre:** CA-17, CA-19 (teste obrigatório), CA-20 e a parte de mecanismo do CA-18.
- **Testes:**
  - `useReveal.test.tsx`, com o mock de IO da 000:
    - abaixo de 15%, não revela; ao cruzar 15%, revela e para de observar; sair e voltar não repete;
    - um único observer para vários elementos;
    - com `setReducedMotion(true)`, não observa e marca tudo como revelado;
    - mudar para `reduce` no meio da visita revela tudo;
  - `motion-css.test.ts`: o CSS tem o bloco `prefers-reduced-motion` zerando opacidade, transformação, animação e transição dos seletores animados; o estado escondido só existe sob `[data-motion]`; o hover só existe dentro de `(hover: hover) and (pointer: fine)`;
  - `bootstrap.test.tsx`: depois de hidratar, `data-motion="ready"`;
  - `global-styles.test.ts`: o script inline existe, é uma linha curta e fica no `<head>` antes dos estilos.

### T05 — Header e menu `[x] concluída` (2026-11-07)
- **Resultado**: suíte 782/782; `npm run check`, `format:check` e E2E 81/81 ok; JS inicial 70,9 KB. Conferido em captura de tela a 390 e 1440px, igual ao design. Extras: mock de `ResizeObserver` em `tests/setup`; `ButtonLink` ganhou `part` (`data-part`); `src/site/text.ts` (`credentialLine`); `SitePage` já mostra o header, com o `main` abaixo dele. Ajustes de teste: o teste do plugin de dev (001) agora espera o `#root` começando pelo `<header>`; o E2E de "texto cortado" ignora o texto `.visually-hidden`, que é recortado de propósito. Âncoras com título visível ficam para a T09.
- **Faz:** `Header` (marca, links, botão do topo, botão de menu, painel), `useScrolled`, `useNavFits`, `useMenu` e `scroll-margin-top` nas seções.
- **Cobre:** CA-02, CA-04 e parte do CA-22.
- **Testes:**
  - `Header.test.tsx`:
    - marca com iniciais, nome e "profissão · CRP";
    - 6 links com os rótulos do conteúdo e `href` igual a `#id`;
    - o botão do topo leva ao WhatsApp em nova aba;
    - o menu abre com `aria-expanded`, o foco vai ao primeiro link, e `Esc` fecha e devolve o foco;
    - clicar num link fecha o menu;
    - o `data-scrolled` muda em 41px e volta em 0;
    - o `data-nav="compact"` aparece quando o `scrollWidth` passa da largura (ResizeObserver simulado);
  - `tests/e2e/site-header.spec.ts`:
    - nas larguras 390, 768, 1024 e 1440, o que aparece segue a tabela do RF-04, a altura do header é de uma linha e nenhum link tem texto cortado;
    - com os rótulos trocados no navegador por textos de 24 caracteres, o header cai para o menu (o `useNavFits` também observa a própria `nav`, que cresce com o texto);
    - o menu funciona por teclado;
    - cada âncora deixa o `h2` da seção visível abaixo do header.

### T06 — Início e Sobre mim `[x] concluída` (2026-11-08)
- **Resultado**: suíte 799/799; `npm run check`, `format:check` e E2E 81/81 ok; JS inicial 72,0 KB. Conferido em captura de tela a 390, 1024 e 1440px, fiel ao design. Extras: `headingIdFor` em `anchors.ts` (cada seção é nomeada pelo seu título via `aria-labelledby`); `motion/stagger.ts` (`--i`); o raio do arco usa `50cqi` (metade da largura do bloco), para o topo ficar totalmente redondo em qualquer largura; o título da formação, quando preenchido, é um `h3`. Ajuste de teste: o axe do E2E agora espera as animações em andamento terminarem antes de medir (no meio do fade, a opacidade parcial derrubava o contraste calculado). A marcação `reveal` do "Sobre mim" fica para a T09, como planejado.
- **Faz:** `Hero` (arco, selo, os 2 botões, entrada em sequência) e `About` (foto, parágrafos, formação com check).
- **Cobre:** CA-05, CA-06 e parte do CA-15 (foto do hero com prioridade).
- **Testes:**
  - `Hero.test.tsx`:
    - todos os campos de `inicio`;
    - um único `h1`;
    - o principal vai para o link do WhatsApp em nova aba, e o secundário para `#trabalho`;
    - a foto tem prioridade;
    - os itens têm `--i` de 0 a 4;
  - `About.test.tsx`:
    - o título da formação some quando vazio;
    - N itens com check `aria-hidden`;
    - os dois parágrafos aparecem.

### T07 — Meu trabalho, Área de atuação e Como funciona `[x] concluída` (2026-11-08)
- **Resultado**: suíte 815/815; `npm run check`, `format:check` e E2E 81/81 (axe inclusive na seção verde) ok; JS inicial 72,7 KB. Conferido em captura de tela a 390 e 1440px, fiel ao design. Extras: `stepNumbers()` em `text.ts` (o "1"/"01" gerado, declarado para o teste "sem texto fixo"); cards e pílulas são listas (`ul`); títulos de grupo opcionais são `h3`; os títulos de card e de passo usam Inter 600, como no design. A grade de cards começa em 768px (`auto-fit`, mínimo 240px); os blocos de público usam `auto-fit` (mínimo 96px), para caber 1 a 4. O `--i` fica no `li` e o `.lift` no card; a classe `reveal` entra na T09.
- **Faz:** `Work` (cards e grade), `Focus` (fundo verde, pílulas, público) e `HowItWorks` (dois formatos de número).
- **Cobre:** CA-07, CA-08 e CA-09.
- **Testes:**
  - `Work.test.tsx`: 1, 4 e 8 cards; o ícone certo por card (`data-icon`); `--i` em sequência;
  - `Focus.test.tsx`: os títulos opcionais somem; uma pílula por etiqueta; o texto do público só aparece quando preenchido;
  - `HowItWorks.test.tsx`: 2 e 5 passos num `<ol>`; números "1" e "01" `aria-hidden`.

### T08 — O espaço e Contato `[x] concluída` (2026-11-08)
- **Resultado**: suíte 836/836; `npm run check`, `format:check` e E2E 99/99 ok; JS inicial 73,8 KB. Conferido em captura de tela a 390, 1024 e 1440px, com os contatos preenchidos. Extras: `tests/e2e/site-space-contact.spec.ts` (o que aparece em cada largura é CSS) e `tests/e2e/support/content.ts` (`gotoWithContent`, troca o conteúdo embutido no navegador; nenhum acesso externo). Desvio do design, a favor da spec: a coluna de texto do cartão é mais larga (1,45fr, contra 1,1fr) para o e-mail ficar ao lado do WhatsApp em 1440px (no design ele quebra para a linha de baixo); em 1024px os botões ainda quebram em duas linhas. A etiqueta usa `onSand` nas duas larguras. A legenda fica abaixo da foto. Nome acessível da linha do telefone: `phone.buttonText`. Para a T10: o axe de hoje roda com os contatos vazios; incluir um caso com tudo preenchido.
- **Faz:** `Space` (galeria) e `Contact` (WhatsApp, cartões e pílulas, telefone formatado, endereço e horários com quebras de linha, mapa).
- **Cobre:** CA-10, CA-11 e CA-14.
- **Testes:**
  - `Space.test.tsx`: 1, 3 e 9 fotos; a legenda só aparece quando preenchida;
  - `Contact.test.tsx`:
    - **tudo preenchido:** os destinos exatos de cada link;
    - **só o WhatsApp:** nenhum outro botão, linha ou mapa;
    - **quebras de linha:** endereço e horários mantêm as quebras (`white-space: pre-line` no CSS e o texto intacto);
    - **nomes acessíveis:** o título do conteúdo nomeia cada linha;
    - **mapa:** o `iframe` tem `title`, `loading="lazy"` e o `src` do conteúdo;
    - **telefone:** o número aparece formatado na linha.

### T09 — Rodapé, botão flutuante e página completa `[x] concluída` (2026-11-08)
- **Resultado**: suíte 852/852; `npm run check`, `format:check` e E2E 138/138 ok; JS inicial 74,5 KB. Conferido em captura de tela a 390 e 1440px. Prova de mutação do teste obrigatório "sem texto fixo": um texto fixo visível e um `aria-label` fixo fazem o teste falhar. Extras: `tests/e2e/site-page.spec.ts` (botão flutuante, "pular", âncoras pendentes da T05 e revelar ao rolar); o `main` tem `tabIndex={-1}`; o `SectionHeading` revela etiqueta e título juntos. Ajustes de teste: o axe agora mede com movimento reduzido (a página inteira no estado final, inclusive o que está fora da tela); o teste do plugin de dev (001) espera o `#root` começando pelo link "pular". Desvio do design: o rodapé ganha folga embaixo (96px no mobile, 112px no desktop) só quando o botão flutuante existe, para ele não cobrir "Área restrita". **Pendente de decisão:** o CA-13 pede o nome acessível "igual a `floatingButton.text`", e o RF-14/CA-14 manda avisar nova aba no nome; ficou `floatingButton.text` + "(abre em nova aba)".
- **Faz:** `Footer`, `FloatingWhatsApp`, link "pular para o conteúdo", composição final do `SitePage` (ordem, `main` com id) e marcação `reveal` nas seções.
- **Cobre:** CA-01, CA-03, CA-12, CA-13, CA-21 (teste obrigatório) e CA-22.
- **Testes:**
  - **`Footer.test.tsx`:**
    - nome, "profissão · CRP" e direitos aparecem;
    - o texto do rodapé só aparece se preenchido;
    - "Área restrita" é um `<a href="/admin/login">` comum;
  - **`FloatingWhatsApp.test.tsx`:**
    - existe só com `enabled`;
    - o nome acessível é `floatingButton.text`;
    - o destino é o link do WhatsApp;
  - **`SitePage.test.tsx`:**
    - ordem dos marcos;
    - um único `h1`;
    - cada seção tem `id` e título;
    - o primeiro elemento focável é o link "pular";
    - **teste obrigatório "sem texto fixo"**;
    - nome e CRP aparecem no header e no rodapé;
  - **E2E `site-page.spec.ts`:**
    - o botão flutuante aparece por volta de 600ms, mede 60px no mobile e mostra o texto no desktop.

### T10 — Verificação no navegador e performance `[x] concluída` (2026-11-08)
- **Resultado:** Vitest 852/852; E2E 181 passando e 5 pulados de propósito (CLS no WebKit, hover por tipo de tela); JS inicial 74,5 KB gzip.
- **Ajuste revelado:** textos longos sem espaço estouravam a largura; `overflow-wrap` em `global.css` e `ButtonLink.module.css`.
- **Limite:** a medida de CLS só existe no Chromium (Pixel 7 e 1440px).
- **Faz:** E2E de qualidade e ajustes que eles revelarem.
- **Cobre:** CA-18, CA-19 (no navegador), CA-20 e CA-23; também o formato por largura de CA-07 e CA-09, e o CLS de CA-15.
- **Testes (`tests/e2e/site-quality.spec.ts`, em Pixel 7, iPhone 13 e 1440px):**
  - axe sem violações;
  - sem rolagem horizontal em 320, 390, 768, 1024, 1280 e 1440px;
  - CLS < 0,1 no carregamento e na rolagem até o fim;
  - com movimento reduzido, `document.getAnimations()` fica vazio e todos os `.reveal` estão com `opacity` 1;
  - sem JS, todo o texto do conteúdo está visível;
  - hover de card só no desktop;
  - console limpo;
  - JS inicial < 150 KB (`npm run size`).

### T11 — Lighthouse e fechamento `[ ] pendente`
- **Faz:**
  - depois do seu push e do deploy, medição no PageSpeed Insights (mobile) do `*.pages.dev`, com Performance, Acessibilidade, Boas práticas, SEO, LCP e CLS registrados aqui;
  - ajustes, se alguma meta falhar;
  - quadro de CAs e pendências para 003–005.
- **Verificação:** `npm run check`, `format:check` e E2E completos verdes; resumo para você decidir o commit.
