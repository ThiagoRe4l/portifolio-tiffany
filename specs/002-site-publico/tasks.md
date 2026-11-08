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

### T01 — Ajustes no conteúdo (A1–A3 e ícones padrão) `[ ] pendente`
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

### T02 — Base: tokens, lint, âncoras, rótulos e contatos `[ ] pendente`
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

### T03 — Ícones, foto e botões `[ ] pendente`
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

### T04 — Animações e movimento reduzido `[ ] pendente`
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

### T05 — Header e menu `[ ] pendente`
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

### T06 — Início e Sobre mim `[ ] pendente`
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

### T07 — Meu trabalho, Área de atuação e Como funciona `[ ] pendente`
- **Faz:** `Work` (cards e grade), `Focus` (fundo verde, pílulas, público) e `HowItWorks` (dois formatos de número).
- **Cobre:** CA-07, CA-08 e CA-09.
- **Testes:**
  - `Work.test.tsx`: 1, 4 e 8 cards; o ícone certo por card (`data-icon`); `--i` em sequência;
  - `Focus.test.tsx`: os títulos opcionais somem; uma pílula por etiqueta; o texto do público só aparece quando preenchido;
  - `HowItWorks.test.tsx`: 2 e 5 passos num `<ol>`; números "1" e "01" `aria-hidden`.

### T08 — O espaço e Contato `[ ] pendente`
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

### T09 — Rodapé, botão flutuante e página completa `[ ] pendente`
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

### T10 — Verificação no navegador e performance `[ ] pendente`
- **Faz:** E2E de qualidade e ajustes que eles revelarem.
- **Cobre:** CA-18, CA-19 (no navegador), CA-20 e CA-23.
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
