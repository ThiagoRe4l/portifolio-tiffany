# 002 — Plano técnico

> Status: **Gate 2 aprovado** em 2026-11-07, com os ajustes A1–A3, o token `--color-accent-on-sand` e os ícones padrão (D4)
> Data: 2026-11-07 · Spec: [spec.md](spec.md) · Referência: `docs/design/mobile.html` e `desktop.html`

## Visão geral

```
src/site/
  SitePage.tsx                 compõe a página (header, main com 7 seções, footer, botão flutuante)
  anchors.ts                   ids técnicos das âncoras e do main
  a11yLabels.ts                os 5 rótulos aprovados
  components/                  peças reutilizadas (Icon, Photo, ButtonLink, SectionHeading, NewTabHint)
  icons/paths.ts               geometria dos SVGs (dados, sem JSX)
  motion/                      useReveal, estado "pronto para animar", CSS das animações
  hooks/                       useScrolled, useNavFits, useMenu
  sections/                    Header, Hero, About, Work, Focus, HowItWorks, Space, Contact, Footer, FloatingWhatsApp
                               (cada uma com o seu .module.css)
src/lib/phone.ts, src/lib/contactLinks.ts   formatação e destinos dos contatos (funções puras)
```

- **Sem dependências novas.** CSS Modules já vêm com o Vite. Animações usam `IntersectionObserver`, CSS e um hook próprio. Os ícones são SVG inline.
- **Hidratação determinística.** Nada depende da largura da tela, da rolagem ou da hora durante a renderização. O que muda com isso fica no CSS (media queries) ou em atributos `data-*` definidos em efeitos depois de montar.
- **Cada texto vem do `useContent()`.** Atributos técnicos (ids, geometria dos SVGs) vêm de constantes em arquivos `.ts`, que ficam fora da regra `jsx-no-literals` (ela vale para `.tsx`).

## Decisões técnicas

### D1 — Animações sem esconder conteúdo (RF-17 a RF-21)
1. **Uma linha de script inline no `<head>` do `index.html`** marca `<html data-motion="pending">` antes da primeira pintura. O CSS só esconde os elementos `.reveal` quando existe `[data-motion]`. **Sem JS, nada fica escondido** (RF-21).
2. **O `bootstrap`, depois de hidratar, muda para `data-motion="ready"`.** Uma trava de segurança de 3 s no mesmo script inline remove o atributo se o app não ficar pronto (JS com erro ou lento demais), e o conteúdo aparece.
3. **Hero:** keyframes `fadeUp`, com 700ms, `var(--motion-ease)` e `animation-delay: calc(var(--i) * var(--motion-stagger-hero))`. O índice vai em `style={{ '--i': n }}`.
4. **Ao rolar:** `useReveal()` usa **um único** `IntersectionObserver` compartilhado (`threshold: 0.15`). Ao cruzar o limiar, o elemento recebe `data-revealed` e deixa de ser observado (uma vez só). A sequência usa `--i` × 80ms.
5. **Movimento reduzido:** `@media (prefers-reduced-motion: reduce)` força `opacity: 1`, `transform: none`, `animation: none` e `transition: none` nos elementos animados. A regra global da 000 já cobre o resto e a rolagem suave. O hook não observa nada nesse caso, e reage a mudanças de `matchMedia` durante a visita.
6. **Hover:** só dentro de `@media (hover: hover) and (pointer: fine)`.
7. **Botão flutuante:** keyframes `pop` com `animation-delay: 600ms`, só sob `[data-motion]`.

### D2 — Header (RF-04)
- **Base mobile:** marca e botão de menu. **≥ 768px:** entra o botão `headerCta`. **≥ 1280px:** entram os 6 links e sai o botão de menu, exceto se `data-nav="compact"`.
- **`useNavFits()`:** um `ResizeObserver` no contêiner do header compara a largura que a linha precisa (`scrollWidth`) com a disponível. Se não couber, aplica `data-nav="compact"`. O HTML do build não tem o atributo (padrão "cabe"), e o hook só age depois de montar. Com o conteúdo padrão, a linha precisa de cerca de 1060px e sobram cerca de 1216px em 1280: cabe. Rótulos editados maiores caem para o menu (CA-04).
- **`useScrolled(40)`:** listener de rolagem passivo; aplica `data-scrolled` (fundo 100% opaco e sombra). O fundo base já é quase sólido (`rgba(250,246,240,.94)`, como no design). Assim, a única diferença antes da hidratação é a sombra, e não há "piscada" visível.
- **Menu:** padrão *disclosure*, com o botão `aria-expanded` e `aria-controls` ligado ao painel `nav`.
  - Ao abrir: o foco vai ao primeiro link e a rolagem da página trava.
  - Para fechar: `Esc`, o botão de fechar ou um clique em link. Ao fechar, o foco volta ao botão.
  - O painel também fecha quando a largura passa a mostrar os links (`matchMedia('(min-width: 1280px)')` sem `compact`).
- **Âncoras:** `scroll-margin-top: var(--header-h)` em cada seção, com a altura do header definida como token por faixa de largura.

### D3 — Fotos (RF-15)
`<Photo photo priority? sizes?>` funciona assim:
- **com `src`:** `<img>` com `width`, `height`, `alt`, `decoding="async"`, `loading="lazy"`, ou `fetchpriority="high"` e `loading="eager"` quando `priority`;
- **sem `src`:** `<div role="img" aria-label={alt}>` com `aspect-ratio: width / height`, cor `--color-placeholder` e sem texto visível;
- **forma:** arco, cantos ou altura fixa vêm da seção, via `className`.

`srcset` e `sizes` ficam para a 005.

### D4 — Ícones (RF-16)
- `icons/paths.ts` guarda os elementos de cada ícone como **dados** (`{ tag: 'path' | 'circle' | 'rect', attrs }`), copiados dos SVGs do design. Os ícones do design cobrem `clipboard`, `target`, `family` (casa no design), `school` (pessoas no design), check, menu, seta, WhatsApp, Instagram, e-mail, telefone, mapa e relógio.
- Faltam: `puzzle`, `chat`, `heart`, `star`, `calendar`, `book`, `sprout`, `hand` e fechar. Eu desenho no mesmo estilo (viewBox 24, traço 1.8, pontas redondas).
- **Ajuste de nomes, a confirmar.** No design, o card "Intervenção individualizada" usa o alvo, "Orientação parental" a casa e "Parceria" as pessoas. Proponho mudar os ícones padrão desses cards para `target`, `family` (desenhada como casa, "Família") e `school` (desenhada como pessoas). Assim o padrão fica igual ao design, e o `puzzle` fica disponível na lista.
- `<Icon name size? strokeWidth? />` renderiza `<svg aria-hidden="true" focusable="false">`. O check do design tem traço 2; fica como exceção declarada.

### D5 — Contatos (RF-11, RF-14)
- `src/lib/contactLinks.ts`: `instagramUrl(handle)`, `mailtoUrl(address)` e `telUrl(number)` (`tel:+55…`). O WhatsApp continua em `buildWhatsAppLink`.
- `src/lib/phone.ts`: `formatPhoneBR('5511912345678')` devolve `(11) 91234-5678`, e um fixo de 10 dígitos devolve `(11) 3333-4444`.
- Links que abrem em nova aba (WhatsApp, Instagram) usam `<ButtonLink external>`, que acrescenta `target="_blank"`, `rel="noopener noreferrer"` e `<span class="visually-hidden">` com `a11yLabels.newTab`.
- **Mapa:** `<iframe src={embedUrl} title={map.title} loading="lazy" referrerPolicy="no-referrer-when-downgrade">`, numa caixa com proporção fixa (sem CLS).
- **Telefone:** cartão "Ligar" no mobile e linha formatada no desktop. Os dois ficam no HTML e o CSS escolhe qual mostrar (sem diferença na hidratação). O que estiver escondido sai da árvore de acessibilidade com `display: none`.

### D6 — Numeração dos passos (RF-09)
Os dois formatos ficam no HTML, `<span aria-hidden>{n}</span>` e `<span aria-hidden>{pad(n)}</span>`, e o CSS mostra um por faixa de largura. A lista é um `<ol>`.

### D7 — Cores e tokens novos
Valores tirados do design, com o contraste medido (o teste de contraste da 000 ganha os pares):

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--color-on-dark` | `#d9e6e2` | texto sobre verde e no rodapé | 5,80 (verde) · 11,15 (rodapé) |
| `--color-on-dark-muted` | `#afc2bd` | direitos e "Área restrita" no rodapé | 7,68 |
| `--color-on-dark-line` | `rgba(255,255,255,.35)` | borda das pílulas | decorativa |
| `--color-on-dark-surface` | `rgba(255,255,255,.1)` | blocos de público | texto branco 5,78 |
| `--color-footer` | `#1f2d2b` | fundo do rodapé (= `--color-text`) | — |
| `--color-accent-on-sand` | `#934732` | **etiqueta sobre areia** (cartão de contato no desktop) | 5,43 |
| `--shadow-badge`, `--shadow-card-hover`, `--shadow-float`, `--shadow-header` | do design | — | — |
| `--gutter-lg: 32px`, `--header-h`, `--header-h-lg` | do design | — | — |

- **Conflito com o design:** no cartão de contato do desktop, o design põe a etiqueta terracota sobre areia (4,28:1), o par proibido desde a 000. Proponho `--color-accent-on-sand`, uma terracota um pouco mais escura que só aparece ali.
- Os tokens de desktop da 000 não mudam. O teste "o desktop só redefine…" continua valendo; os valores de desktop novos são tokens separados (`--gutter-lg`).

### D8 — Lint
- `TECHNICAL_ATTRIBUTE_VALUES` ganha `img` (para `role="img"`), `async` (já existe) e `no-referrer-when-downgrade`. O teste de lint da 000 ganha os casos.
- A exceção para SVG, anotada na 000/T03, deixa de ser necessária: a geometria fica em `paths.ts` e entra no JSX como variável.

### D9 — Conteúdo (ajustes A1–A3 da spec)
- **`schema.ts`:** `geral.footerText` e `atuacao.audience[].text` passam a opcionais.
- **`defaults.ts`:** recebe os textos do design (A1), os títulos opcionais vazios (A2) e os ícones dos cards conforme o D4.
- **Testes da 001:**
  - `defaults.test.ts`: a lista de aprovados ganha os textos do design;
  - `schema.test.ts`: os 2 novos opcionais;
  - `load.test.ts`: o aviso de placeholders continua listando `geral.name`.
- Como o banco está vazio, não há migração de dados.

## Arquivos

### Novos
| Arquivo | Conteúdo |
|---|---|
| `src/site/anchors.ts` | `SECTION_IDS` (`inicio`, `sobre`, `trabalho`, `atuacao`, `como-funciona`, `espaco`, `contato`) e `MAIN_ID` |
| `src/site/components/{Icon,Photo,ButtonLink,SectionHeading}.tsx` + `.module.css` | peças da página |
| `src/site/icons/paths.ts` | geometria dos 12 ícones de card e dos 11 de interface |
| `src/site/motion/{useReveal.ts,motion.module.css,motionState.ts}` | D1 |
| `src/site/hooks/{useScrolled,useNavFits,useMenu}.ts` | D2 |
| `src/site/sections/*.tsx` + `.module.css` | as 10 partes |
| `src/lib/{phone,contactLinks}.ts` | D5 |
| Testes | ao lado de cada arquivo, mais `src/site/SitePage.test.tsx` (sem texto fixo) e `tests/e2e/site-*.spec.ts` |

### Alterados
| Arquivo | Mudança |
|---|---|
| `src/site/SitePage.tsx`, `a11yLabels.ts` | composição e os 5 rótulos |
| `src/styles/tokens.css`, `global.css` | tokens do D7, `.visually-hidden` (já existe) e o estilo do link "pular" |
| `index.html` | o script inline do D1 |
| `src/app/bootstrap.tsx` | `markMotionReady()` depois de hidratar |
| `src/content/schema.ts`, `defaults.ts` e testes da 001 | D9 |
| `eslint.config.js` + `tests/unit/lint-rules.test.ts` | D8 |
| `tests/unit/contrast.test.ts`, `tokens.test.ts` | pares e tokens novos |

## Testes

| Tipo | Onde | O quê |
|---|---|---|
| Unidade e componente (Vitest + RTL) | cada seção | o que cada CA exige: campos renderizados, opcionais somem, destinos dos links, `aria-*`, quantidades variáveis, uso de `matchMedia` e IO com os mocks da 000 |
| **Obrigatório: sem texto fixo** | `SitePage.test.tsx` | renderiza com `makeUniqueContent()`, percorre o DOM (nós de texto fora de `aria-hidden`, `alt`, `title`, `aria-label`) e confere cada texto contra o conteúdo, os `a11yLabels` e os textos gerados declarados |
| **Obrigatório: movimento reduzido** | `motion/*.test.ts` + E2E | com `reduce`, o hook não observa, o CSS zera animações e transições, e no navegador `getAnimations()` fica vazio e tudo fica visível |
| E2E (Playwright) | `tests/e2e/site-*.spec.ts` | axe em mobile e desktop; header por largura (390, 768, 1024, 1440); rótulos longos caindo para o menu; menu por teclado; âncoras com o título visível; sem rolagem horizontal de 320 a 1440px; CLS < 0,1 medido com `PerformanceObserver('layout-shift')`; botão flutuante; sem JS tudo visível; console limpo |
| Orçamento | `npm run size` | JS inicial < 150 KB (hoje 67,7 KB; previsão de +10 a 15 KB) |
| Lighthouse | manual | PageSpeed Insights no `*.pages.dev`, com os números no `tasks.md` |

## Riscos e mitigação
| Risco | Mitigação |
|---|---|
| Diferença na hidratação por algo que depende da tela | Regra do D1/D2: só CSS ou `data-*` depois de montar; o E2E da 001 ("sem avisos de hidratação") continua valendo |
| Conteúdo escondido se o JS falhar | Estado escondido só sob `data-motion`, com trava de 3 s no script inline; E2E com JS desligado |
| Header com textos editados longos | `useNavFits` + CA-04 com rótulos de 24 caracteres |
| CLS por fontes ou mapa | Fontes já têm preload desde a 000; o mapa e as fotos têm proporção fixa; o CLS é medido no E2E |
| Script inline e uma futura CSP | É uma linha só; se um dia houver CSP, entra por hash. Anotado |
| Testes de layout frágeis | O E2E mede regras (sem corte, sem quebra, sem rolagem horizontal), não pixels |

## Alternativas descartadas
- **Bibliotecas de animação (Framer Motion, AOS):** dezenas de KB para o que CSS e um IO resolvem.
- **Bibliotecas de ícones (lucide-react etc.):** os SVGs do design já estão prontos, e uma biblioteca traria peso e estilo diferentes.
- **Esconder com CSS desde o HTML do build:** sem JS ou com erro, a página ficaria vazia (pior para SEO e para acessibilidade).
- **Decidir mobile ou desktop no React (`useMediaQuery` na renderização):** quebraria a hidratação e causaria CLS.
- **Header desktop com 4 links, como no design:** a spec pede os 6, e cortar 2 esconderia seções do menu.
