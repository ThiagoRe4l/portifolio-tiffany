# 002 — Site público

> Status: **aprovada no Gate 1** (2026-11-07), com os ajustes do Thiago incorporados (header desktop, design de referência). Os ajustes A1–A3 foram aprovados com o Gate 2 (2026-11-07).
> Data: 2026-11-07 · Depende de: 000 (concluída, exceto CA-13) e 001 (concluída)
> Referência visual: `docs/design/` (prints + HTML). Em conflito: CLAUDE.md/spec > conteúdo > design.

## Contexto

A 001 entregou o conteúdo validado e o caminho até o navegador: o build gera o HTML a partir do conteúdo, e o React reaproveita esse HTML com o `useContent()`. O site, porém, ainda é um `<main>` vazio.

Esta spec constrói **o que o visitante vê**: as 10 partes da página (CLAUDE.md §8), na ordem do design, **mobile primeiro**, com as animações leves, os botões de contato e o botão flutuante do WhatsApp. Cada texto vem do conteúdo (regra central, CLAUDE.md §6), e o teste obrigatório "sem texto fixo no site" passa a valer de verdade.

## Objetivo

Ao final da 002:
- o `npm run dev` e o site publicado mostram a página completa com o conteúdo padrão (ou o do banco);
- tudo funciona em 390px primeiro e se adapta a 768, 1024 e 1280px;
- os botões de contato abrem WhatsApp, Instagram, e-mail e telefone, e os opcionais vazios somem;
- as animações rodam uma vez e ficam desligadas com movimento reduzido;
- o site passa no axe, nas metas de performance do CLAUDE.md §7 e no teste "sem texto fixo no site".

## Fora de escopo

- Upload, redimensionamento, WebP e `srcset` das fotos (005). Aqui a foto já tem endereço ou mostra o bloco de espera.
- Login e editor (003 e 004).
- Domínio próprio, analytics e formulários (não previstos).
- Mudanças no contrato do conteúdo. Se faltar algum texto, a correção vem como proposta de mudança na spec 001, nunca como texto fixo no componente.

## Requisitos funcionais

### Estrutura
- **RF-01 — Ordem e marcos.** A página tem, nesta ordem: header, início, sobre mim, meu trabalho, área de atuação, como funciona, o espaço, contato, rodapé e botão flutuante. Usa HTML semântico: `header`, `main` com uma `section` por parte (cada uma com seu título), `footer` e `nav`. Há um único `h1`, o título do hero.
- **RF-02 — Âncoras.** Cada seção tem um `id` técnico fixo (`sobre`, `trabalho`, `atuacao`, `como-funciona`, `espaco`, `contato`), usado pelos links do menu e pelo botão secundário do hero. Os ids não aparecem como texto. A rolagem até a âncora desconta a altura do header fixo.
- **RF-03 — Pular para o conteúdo.** O primeiro elemento focável é um link "pular para o conteúdo", visível só com o foco do teclado.

### Partes da página
- **RF-04 — Header.**
  - Mostra o monograma (iniciais), o nome e a linha "profissão · CRP". O monograma e o nome são um link para o topo.
  - Fica fixo no topo e ganha fundo sólido e sombra depois de 40px de rolagem.
  - **Menu (painel):** um botão abre o painel com os 6 links de âncora, com os rótulos de `geral.menu`, e o botão `geral.headerCta`. O painel fecha ao escolher um link, com `Esc` ou com o botão de fechar. O foco vai para o painel ao abrir e volta para o botão ao fechar.
  - **Por largura**, sempre numa linha só, sem cortar nem quebrar texto:

    | Largura | O que aparece |
    |---|---|
    | < 768px | marca + botão de menu |
    | 768–1279px | marca + botão `headerCta` (WhatsApp) + botão de menu |
    | ≥ 1280px | marca + os 6 links + botão `headerCta`; sem botão de menu |

    Os 6 links não cabem em 1024px: com os textos padrão, o header precisa de cerca de 1060px úteis, e em 1024px sobram 960px. O design mostra 4 links porque escondeu 2.
  - **Textos editados maiores que o padrão:** se os rótulos, o nome ou o botão não couberem na linha em ≥ 1280px, o header volta para "marca + botão + menu". A medição é feita depois de carregar e quando a largura muda. Nada é cortado nem quebra linha. No HTML do build vale a versão "cabe" (o caso do conteúdo padrão), para não haver diferença na hidratação.
- **RF-05 — Início (hero).** Mostra etiqueta, título (`h1`), texto, botão principal (WhatsApp) e botão secundário (âncora para "Meu trabalho"). A foto tem formato de arco (topo totalmente arredondado) e o selo flutuante tem título e linha. No mobile, a foto fica abaixo do texto; no desktop, as duas colunas ficam lado a lado.
- **RF-06 — Sobre mim.** Mostra etiqueta, título, foto, os dois parágrafos e a formação: o título só aparece se estiver preenchido, e cada item da lista leva um ícone de check.
- **RF-07 — Meu trabalho.** Mostra etiqueta, título e os cards (ícone, título e texto), em quantidade variável (1 a 8). No mobile fica um card por linha; no desktop, uma grade automática.
- **RF-08 — Área de atuação.** Fundo verde, com etiqueta (cor `--color-accent-on-dark`), título, texto, etiquetas de foco em pílulas (com o título acima, se preenchido) e os blocos de público atendido (título e, se preenchido, texto, conforme A3; o título do grupo fica acima, se preenchido). No desktop, texto à esquerda e pílulas e blocos à direita, como no design.
- **RF-09 — Como funciona.** Mostra etiqueta, título e os passos (2 a 5). A numeração é gerada pela posição e vale como decoração; leitores de tela recebem a lista ordenada. **Formato do design:** no mobile, um círculo verde com "1", "2", "3"; no desktop (≥ 1024px), "01", "02", "03" grandes, com uma linha verde em cima, em colunas.
- **RF-10 — O espaço.** Mostra etiqueta, título e a galeria (1 a 9 fotos, legenda opcional). No mobile, a primeira foto é grande e as próximas ficam em pares; no desktop, a galeria tem 3 colunas.
- **RF-11 — Contato.**
  - Mostra etiqueta, título e texto, e um botão grande do WhatsApp.
  - Os botões de Instagram, e-mail e ligar aparecem **só quando o contato respectivo está preenchido**. **Layout do design:**
    - **mobile:** os três ficam numa grade de 3 cartões, com ícone em cima e texto embaixo;
    - **desktop (≥ 1024px):** Instagram e e-mail viram botões em pílula ao lado do WhatsApp; o telefone vira uma linha de informação, com ícone e o número formatado, como link `tel:`, e não um botão;
    - o número formatado, ex. `(11) 91234-5678`, é gerado a partir dos dígitos do conteúdo.
  - Endereço e horários aparecem com ícone e texto, **preservando as quebras de linha**. Os títulos (`address.title`, `hours.title`) não aparecem na tela, como no design: eles dão o nome acessível de cada linha, para leitores de tela.
  - **Desktop:** tudo fica num cartão areia, com o mapa à direita. **Mobile:** endereço, horários e mapa ficam num bloco areia abaixo dos botões.
  - O mapa é um `iframe` de incorporação, com título acessível, carregado só quando chega perto da tela (`loading="lazy"`). Some quando o link estiver vazio.
- **RF-12 — Rodapé.** Fundo escuro, com nome, "profissão · CRP", a linha de direitos (com o ano já resolvido no build) e o texto do rodapé, que só aparece se estiver preenchido (A2). Tem o link discreto `geral.restrictedAreaLink`, que leva para `/admin/login` com recarregamento completo (o admin é outro pacote, carregado sob demanda).
- **RF-13 — Botão flutuante do WhatsApp.**
  - Fica no canto inferior direito e só aparece se `contato.floatingButton.enabled` estiver ligado.
  - **Mobile:** só o ícone, com 60px, e o nome acessível vem do conteúdo (`floatingButton.text`). **Desktop:** ícone mais o texto.
  - Entra 600ms depois do carregamento, com um pequeno "pop", uma vez só.
  - Não pode cobrir o botão principal do contato nem o rodapé de forma que impeça o toque.

### Links de contato
- **RF-14 — Destinos.**
  - **WhatsApp:** `buildWhatsAppLink` (001).
  - **Instagram:** `https://www.instagram.com/<usuário>`.
  - **E-mail:** `mailto:<endereço>`.
  - **Telefone:** `tel:+<número>`.
  - WhatsApp e Instagram abrem em nova aba, com `rel="noopener noreferrer"`. Links que abrem em nova aba avisam isso aos leitores de tela.

### Fotos e ícones
- **RF-15 — Foto.**
  - Toda foto tem `width`, `height` e `alt` do conteúdo.
  - Com endereço, é um `<img>`: `loading="lazy"`, exceto a foto do hero, que usa `fetchpriority="high"` e `loading="eager"`.
  - Sem endereço, vira um bloco na cor `--color-placeholder`, com a mesma proporção e o `alt` como nome acessível (`role="img"`). O layout não pula quando a foto chegar.
- **RF-16 — Ícones.**
  - SVG de linha (traço 1.8), sem emoji, com `aria-hidden` (o texto ao lado dá o significado).
  - São os 12 ícones dos cards (`src/content/icons.ts`), mais os de interface: check, menu, fechar, WhatsApp, Instagram, e-mail e telefone.
  - Um ícone desconhecido nunca quebra a página: na prática não acontece, porque o schema barra.

### Animações (CLAUDE.md §8)
- **RF-17 — Entrada do hero.** Etiqueta, título, texto, botões e foto sobem 24px com fade, em 700ms, com `cubic-bezier(.2,.7,.2,1)` e 90ms de intervalo entre eles.
- **RF-18 — Revelar ao rolar.** Os elementos marcados entram com fade-up quando 15% ficam visíveis (`IntersectionObserver`), **uma única vez**. Cards e fotos entram em sequência de 80ms.
- **RF-19 — Hover no desktop.** Cards sobem 4px com sombra, e as fotos da galeria ganham zoom de 1.03. Isso só vale para ponteiro com hover, não no toque.
- **RF-20 — Movimento reduzido.** Com `prefers-reduced-motion: reduce`, nenhuma animação nem transição roda, a rolagem das âncoras é instantânea e tudo aparece no estado final. É um teste obrigatório do projeto.
- **RF-21 — Sem JavaScript.** O HTML pré-renderizado mostra todo o conteúdo visível. O estado "escondido, esperando animar" só é aplicado quando o JavaScript está pronto. Assim, sem JS, com JS lento ou para buscadores, nada fica invisível.

### Regra central
- **RF-22 — Sem texto fixo.** Todo texto visível e todo nome acessível vêm do conteúdo. A única exceção são os rótulos de interface centralizados em `src/site/a11yLabels.ts` (CLAUDE.md §6.7), listados nas perguntas em aberto. Teste obrigatório: renderizar o site com `makeUniqueContent()`, coletar todo o texto visível e os nomes acessíveis, e confirmar que cada um vem do conteúdo ou de `a11yLabels`.
- **RF-23 — Ética.** O nome e o CRP ficam visíveis no header e no rodapé.

## Requisitos não funcionais

- **Performance** (CLAUDE.md §7, Lighthouse mobile com 4G simulado): Performance ≥ 90, LCP < 2,5 s, CLS < 0,1, JS inicial < 150 KB gzip (hoje 67,7 KB). Sem bibliotecas de animação nem de ícones. As fontes continuam com preload e só os pesos usados. O CSS do site tem que ser pequeno, e o CSS do admin não entra no site.
- **Acessibilidade** (≥ 95):
  - axe sem violações em mobile e desktop;
  - contraste AA, com o par terracota sobre areia proibido (medido na 000);
  - áreas de toque ≥ 48px e foco visível em tudo;
  - menu operável por teclado;
  - a ordem do foco segue a ordem visual;
  - zoom de 200% sem cortar conteúdo.
- **Boas práticas e SEO** (≥ 95): já atendidos em boa parte pela 001; aqui sem erros no console e com links rastreáveis.
- **Mobile primeiro**: o CSS é escrito para 390px, com `min-width` em 768, 1024 e 1280px. Sem rolagem horizontal em nenhuma largura a partir de 320px.
- **Hidratação**: o HTML do build e o do navegador são idênticos (o teste da 001 continua valendo). Nada que dependa da largura da tela ou da hora é decidido na renderização; isso fica no CSS ou em efeitos depois de montar.
- **Segurança**: conteúdo sempre como texto, sem `dangerouslySetInnerHTML`; o `iframe` do mapa só aceita o domínio do Google (garantido pelo schema).

## Critérios de aceite

- **CA-01 (RF-01)** — Dado o site com o conteúdo de teste, quando listo os marcos e os títulos, então a ordem é a do RF-01, há um único `h1` (o título do hero) e cada seção tem o seu título.
- **CA-02 (RF-02)** — Dado o menu, quando clico em cada link, então a página rola até a seção do mesmo `id`, e o título dela não fica escondido atrás do header.
- **CA-03 (RF-03)** — Dado o teclado, quando aperto `Tab` na página recém-aberta, então o primeiro foco é o "pular para o conteúdo", e ativá-lo leva o foco ao `main`.
- **CA-04 (RF-04)** — Dado o mobile, quando abro o menu, então os 6 links e o botão do topo, com os rótulos do conteúdo, aparecem e o foco entra no painel; quando aperto `Esc` ou escolho um link, então o painel fecha e o foco volta ao botão. Dadas as larguras 390, 768, 1024 e 1440px, então o header mostra o que a tabela do RF-04 manda, numa linha só, sem nenhum texto cortado. Dados rótulos de menu com 24 caracteres em 1440px, então o header volta ao botão de menu, sem cortar nem quebrar. Dado 41px de rolagem, então o header tem fundo sólido e sombra; dado 0px, então não tem.
- **CA-05 (RF-05)** — Dado o conteúdo de teste, então o hero mostra todos os campos de `inicio`, o botão principal aponta para o link do WhatsApp e o secundário para `#trabalho`.
- **CA-06 (RF-06)** — Dado `educationTitle` vazio, então o título da formação não aparece e a lista continua; cada item tem um ícone de check escondido de leitores de tela.
- **CA-07 (RF-07)** — Dados 1, 4 e 8 cards, então aparece essa quantidade, cada um com o ícone escolhido; no mobile ficam em uma coluna e no desktop em mais de uma.
- **CA-08 (RF-08)** — Dados os títulos opcionais vazios, então eles não aparecem; as etiquetas de foco viram pílulas e os blocos de público mostram título e texto.
- **CA-09 (RF-09)** — Dados 2 e 5 passos, então a numeração vai até 2 ou 5 ("1…5" no mobile, "01…05" no desktop), escondida de leitores de tela, e a lista é ordenada (`<ol>`).
- **CA-10 (RF-10)** — Dadas 1, 3 e 9 fotos, então todas aparecem, com legenda só quando preenchida.
- **CA-11 (RF-11)** — Dados todos os contatos preenchidos, então no mobile aparecem o WhatsApp, os 3 cartões e o mapa, e no desktop aparecem o WhatsApp, as pílulas de Instagram e e-mail, a linha do telefone formatado e o mapa. Dados Instagram, e-mail, telefone e mapa vazios, então só fica o WhatsApp, sem buracos no layout. As quebras de linha do endereço e dos horários aparecem como no conteúdo, e cada linha tem como nome acessível o título do conteúdo.
- **CA-12 (RF-12)** — Dado o rodapé, então mostra nome, "profissão · CRP" e os direitos com o ano do build, e o texto do rodapé só quando preenchido; o link "Área restrita" aponta para `/admin/login` como link comum (recarrega a página).
- **CA-13 (RF-13)** — Dado `enabled` ligado, então o botão aparece depois de cerca de 600ms, com nome acessível formado por `floatingButton.text` e o aviso de nova aba do CA-14 (decisão do Thiago, 2026-11-08); no mobile mede 60px e mostra só o ícone, e no desktop mostra o texto. Dado `enabled` desligado, então o botão não existe.
- **CA-14 (RF-14)** — Dado o conteúdo de teste, então cada botão tem exatamente o destino do RF-14; os que abrem em nova aba têm `rel="noopener noreferrer"` e avisam isso no nome acessível.
- **CA-15 (RF-15)** — Dada uma foto com endereço, então o `<img>` tem `src`, `width`, `height`, `alt` e `loading="lazy"` (no hero, `fetchpriority="high"`). Dada uma foto sem endereço, então há um bloco com a proporção certa, `role="img"` e o `alt` como nome. Em nenhum dos casos a página pula quando a imagem carrega (CLS medido no E2E).
- **CA-16 (RF-16)** — Dado cada um dos 12 ícones, então ele renderiza um SVG com `stroke-width` 1.8 e `aria-hidden`.
- **CA-17 (RF-17, RF-18)** — Dado o movimento liberado, então os itens do hero entram em sequência de 90ms, e um elemento marcado só revela quando 15% está visível, uma única vez (sair e voltar não repete); os cards entram em sequência de 80ms.
- **CA-18 (RF-19)** — Dado o desktop com ponteiro, quando passo o mouse num card, então ele sobe 4px com sombra; dado o toque, então não há efeito de hover preso.
- **CA-19 (RF-20)** — Dado `prefers-reduced-motion: reduce`, então nenhuma animação ou transição roda, todos os elementos estão visíveis no estado final e as âncoras rolam sem animação. Teste obrigatório.
- **CA-20 (RF-21)** — Dado o JavaScript desligado, então todo o conteúdo visível aparece; dado o JavaScript ligado, então os elementos fora da tela só ficam escondidos depois de o JavaScript marcar a página como pronta.
- **CA-21 (RF-22)** — Dado o site renderizado com `makeUniqueContent()`, quando coleto todo o texto visível, os `alt`, `title`, `aria-label` e os textos de links, então cada um é um texto do conteúdo, um rótulo de `a11yLabels` ou um texto gerado declarado (numeração dos passos, telefone formatado, separador " · " entre profissão e CRP). Teste obrigatório.
- **CA-22 (RF-23)** — Dado o site, então o nome e o CRP do conteúdo aparecem no header e no rodapé.
- **CA-23 (RNF)** — Dado o build, então o axe não aponta violações em mobile (Pixel 7, iPhone 13) e desktop (1440px), não há rolagem horizontal de 320 a 1440px, o JS inicial fica abaixo de 150 KB gzip e o console fica limpo.

## Casos de borda

- **Textos longos** (no limite do schema): quebram linha sem estourar a largura, inclusive palavras longas como e-mails e nomes de usuário.
- **Só o WhatsApp preenchido:** a área de contato fica arrumada, sem espaços de botões ausentes.
- **Número do WhatsApp ainda fictício** (`5500000000000`): os links funcionam, mas levam a um número inexistente. O build de produção já avisa (001). O site não esconde o botão.
- **Nenhuma foto enviada:** todos os blocos de espera aparecem com as proporções certas; o hero não tem imagem de LCP e o texto vira o LCP.
- **Botão flutuante desligado:** nenhum espaço reservado nem script de animação para ele.
- **Menu aberto e a tela cresce para desktop:** o menu fecha e a rolagem da página volta.
- **Âncora na URL ao abrir** (ex.: `/#contato`): a página abre na seção certa, com o header descontado.
- **Rolagem já passada dos 40px ao recarregar:** o header já começa com fundo sólido, sem piscar depois da hidratação.
- **Movimento reduzido ligado no meio da visita:** as animações seguintes deixam de rodar.

## Decisões do Gate 1 (Thiago, 2026-11-07)

1. **Design:** a referência está em `docs/design/` (prints e HTML das 5 telas, com valores exatos em `style` inline; o `README` lista as diferenças conhecidas). Em conflito, vale CLAUDE.md/spec > conteúdo > design. `docs/design` está no `.prettierignore`.
2. **CSS Modules + tokens:** aprovado. CLAUDE.md §5 diz "Definido (spec 002)".
3. **Hook próprio com `IntersectionObserver`:** aprovado. CLAUDE.md §5 diz "Definido (spec 002)".
4. **`a11yLabels`:** aprovados "Abrir menu", "Fechar menu", "Menu", "Pular para o conteúdo" e "(abre em nova aba)".
5. **Ícones de WhatsApp e Instagram:** linha simples, no estilo dos demais (traço 1.8). Os SVGs do design são a base.
6. **Lighthouse:** medição manual no PageSpeed Insights ao fim da spec, com os números registrados no `tasks.md`. Sem dependência nova.
7. **Fotos:** blocos de espera até a 005. O texto "Foto: …" dos prints é só do design: no site, o bloco não tem texto visível, e o `alt` do conteúdo é o nome acessível.
8. **Header desktop:** a proposta está no RF-04 (links só a partir de 1280px, com volta automática ao menu se não couberem).

## Ajustes ao conteúdo (001), aprovados com o Gate 2 (2026-11-07)

Comparando o design com o conteúdo padrão da 001, apareceram diferenças. Pela regra do projeto, elas não podem ser contornadas no componente: precisam mudar o conteúdo. Mudam o contrato aprovado na 001, então dependem da sua aprovação.

- **A1 — Textos do design no conteúdo padrão.** O design tem textos para campos que hoje são `[placeholder]`. O CLAUDE.md §8 já aprova "os dois parágrafos do design" do Sobre mim. Proponho adotar **todos** os textos do design como padrão, porque descrevem o serviço que ela mesma aprovou no design. Ela continua podendo editar cada um.

  | Campo | Texto do design |
  |---|---|
  | `sobre.text` | "Sou psicóloga e atuo em uma clínica especializada no atendimento de pessoas com Transtorno do Espectro Autista. Meu trabalho é guiado pela Análise do Comportamento, que olha para cada pessoa de forma individual e constrói o caminho a partir do que ela já sabe fazer." |
  | `sobre.secondaryText` | "Sigo estudando: curso pós-graduação em Análise do Comportamento aplicada ao TEA, porque um bom atendimento depende de atualização constante." |
  | `trabalho.title` | "Como posso ajudar" |
  | `trabalho.cards[0..3].text` | "Observação e levantamento das habilidades e necessidades da criança para definir objetivos claros." · "Planos baseados em Análise do Comportamento, com metas acompanhadas de perto a cada etapa." · "Encontros com a família para levar as estratégias para a rotina de casa." · "Diálogo com a escola e outros profissionais para que todos caminhem na mesma direção." |
  | `atuacao.text` | "O TEA se manifesta de forma diferente em cada pessoa. Por isso o atendimento parte da realidade de cada criança e da sua família, com foco em comunicação, interação social, autonomia e comportamento." |
  | `comoFunciona.title` | "Do primeiro contato ao acompanhamento" |
  | `comoFunciona.steps[0..2].text` | "Você me chama pelo WhatsApp e conversamos sobre a sua necessidade." · "Conheço a criança e a família e definimos juntos os objetivos do atendimento." · "Montamos o plano de intervenção e acompanhamos a evolução com devolutivas à família." |
  | `espaco.title` | "Um ambiente pensado para acolher" |
  | `contato.text` | "Tire suas dúvidas ou agende uma avaliação. Respondo pelo WhatsApp em [horário de resposta]." |
  | `contato.whatsapp.buttonText` | "Chamar no WhatsApp" (hoje "Agendar pelo WhatsApp") |
  | `geral.name` | "[Nome Sobrenome]" |
  | `geral.crp` | "CRP [00/00000]", para a linha "Psicóloga · CRP [00/00000]" do design |
  | `geral.copyright` | "© {ano} · Todos os direitos reservados" |
  | `inicio.badge.subtitle` | "[Cidade] · [presencial]" |
  | `contato.address.text` / `contato.hours.text` | "[Rua, número — Bairro, Cidade]" / "[Seg a sex, 8h às 18h]" |

  O teste "não inventa" da 001 passa a ter esses textos na lista de aprovados.
- **A2 — Campos que o design não mostra.**
  - **`geral.footerText`** é obrigatório hoje, mas não existe no design. Proposta: vira opcional, com padrão vazio, e só aparece no rodapé se preenchido.
  - **`sobre.educationTitle`, `atuacao.focusTitle` e `atuacao.audienceTitle`** já são opcionais, mas não aparecem no design. Proposta: padrão vazio, então não aparecem enquanto ela não preencher.
  - **`address.title`, `hours.title` e `map.title`** continuam obrigatórios, mas só como nome acessível (RF-11).
- **A3 — Público atendido.** O design mostra só o título de cada bloco; na 001, você decidiu título e texto. Proposta: o texto vira **opcional**, com padrão vazio, igual ao design. Quando ela preencher, ele aparece abaixo do título. Isso mantém a sua decisão e o visual do design.

Não há linhas no banco hoje, então nenhuma dessas mudanças exige migração de dados.

## Perguntas em aberto

Nenhuma.
