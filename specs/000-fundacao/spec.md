# 000 — Fundação do projeto

> Status: **Gate 1 aprovado** em 2026-11-05. Decisões: Supabase, Cloudflare Pages, pré-renderização no build (D3-b).
> Data: 2026-11-05

## Contexto

O repositório hoje contém apenas o `CLAUDE.md`. Não existe código, `package.json` nem repositório git. Antes de construir qualquer seção do site ou do admin, precisamos de uma base que já imponha as regras do projeto: mobile first, TypeScript estrito, nenhum texto fixo no site público, testes antes da implementação, acessibilidade e orçamento de performance verificados automaticamente.

Esta spec também fecha as três decisões de arquitetura que o `CLAUDE.md` deixou como "Proposto" ou "Em aberto" (backend, deploy e estratégia de SEO), porque elas mudam a estrutura da fundação, o CI e as specs seguintes.

## Objetivo

Ao final da spec 000 teremos um projeto que roda (`dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`), com tokens de design prontos, a estrutura de pastas definida, as regras de lint que protegem o conteúdo editável, a infraestrutura de testes (unidade, componentes, E2E mobile primeiro e acessibilidade) e um CI que roda tudo isso a cada push. Nenhuma seção do site é construída aqui.

## Fora de escopo

- Schemas de conteúdo, conteúdo padrão e leitura do conteúdo (spec 001).
- Qualquer seção visual do site, animações de reveal, botões de contato (spec 002).
- Login, sessão e rotas protegidas de verdade (spec 003).
- Editor do admin (spec 004) e upload de imagens (spec 005).
- Criar o projeto no Supabase, migrations, RLS, buckets (só com autorização, a partir da spec 001/003).
- Configurar domínio, DNS e o deploy de produção (será feito quando houver algo para publicar; aqui só fica decidido **onde**).

## Requisitos funcionais

- **RF-01 — Projeto base.** Vite + React + TypeScript com `strict: true` (e `noUncheckedIndexedAccess`), versão do Node fixada (`.nvmrc` + `engines` no `package.json`), finais de linha LF garantidos (`.gitattributes` + Prettier), já que o desenvolvimento acontece no Windows.
- **RF-02 — Estrutura de pastas.** Criar a estrutura da seção 10 do `CLAUDE.md` (`src/app`, `src/content`, `src/site`, `src/admin`, `src/lib`, `src/styles`, `tests/e2e`, `tests/fixtures`, `supabase/`). Alias de importação `@/` apontando para `src/`.
- **RF-03 — Roteamento mínimo com admin separado.** Rotas `/`, `/admin/login` e `/admin` com componentes vazios (sem texto visível no site). O código de `src/admin/**` é carregado sob demanda (chunk separado) e nunca entra no bundle inicial do site.
- **RF-04 — Tokens de design.** `src/styles/tokens.css` com todas as cores da seção 8, tipografia (famílias, tamanhos mobile e desktop, pesos, altura de linha), raios, espaçamentos de seção, margem lateral, largura do container, breakpoints de referência (768/1024/1280), tokens de movimento (duração 700ms, easing `cubic-bezier(.2,.7,.2,1)`, intervalos 90ms e 80ms) e tamanho mínimo de alvo de toque (48px). `src/styles/global.css` com reset leve, CSS escrito para 390px primeiro, `min-width` nos breakpoints, foco visível e uma regra global que zera animações, transições e rolagem suave com `prefers-reduced-motion: reduce`.
- **RF-05 — Fontes.** Fraunces 500 e Inter 400/500/600 auto-hospedadas (sem Google Fonts em tempo de execução), em WOFF2, só com subconjunto latino, `font-display: swap` e preload das fontes usadas acima da dobra.
- **RF-06 — Lint e formatação.** ESLint (flat config) com regras para TypeScript, React, hooks e `jsx-a11y`; `react/jsx-no-literals` ativo em `src/site/**` (texto literal em JSX vira erro); `react/no-danger` ativo em todo o projeto (proíbe `dangerouslySetInnerHTML`); Prettier integrado. `src/site/a11yLabels.ts` é a única exceção permitida para strings fixas.
- **RF-07 — Testes de unidade e componentes.** Vitest + React Testing Library + user-event + ambiente jsdom + matchers do jest-dom. MSW configurado no setup global, com a regra de **falhar** qualquer requisição que não tenha handler (nenhum teste bate no backend real). Utilitários prontos para simular `IntersectionObserver` e `matchMedia` (necessários para os testes de animação e movimento reduzido das specs seguintes).
- **RF-08 — Testes E2E e acessibilidade.** Playwright com projetos nesta ordem: `mobile-chromium` (Pixel 7), `mobile-webkit` (iPhone 13) e `desktop` (Chromium, 1440×900). Helper `checkA11y(page)` usando `@axe-core/playwright` com regras WCAG 2.1 AA. O Playwright sobe o build de produção (`preview`) para os testes, não o servidor de desenvolvimento.
- **RF-09 — Orçamento de performance automatizado.** Um comando verifica que o JS inicial do site (sem admin) fica abaixo de 150 KB gzip e falha se passar.
- **RF-10 — Teste de contraste dos tokens.** Um teste calcula o contraste das combinações de cor de texto previstas no design e falha se alguma ficar abaixo de 4,5:1 (texto normal).
- **RF-11 — Variáveis de ambiente.** `.env.example` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (valores vazios), `.env*` no `.gitignore` (exceto `.env.example`) e leitura tipada das variáveis em `src/lib/env.ts`, com erro claro se faltar alguma.
- **RF-12 — Scripts npm.** `dev`, `build`, `preview`, `test`, `test:watch`, `test:e2e`, `lint`, `format`, `typecheck`, `size` e `check` (roda lint + typecheck + test + build + size em sequência).
- **RF-13 — CI básico.** GitHub Actions disparado em push e pull request: instala dependências com `npm ci` e cache, roda `lint`, `typecheck`, `test`, `build`, `size` e `test:e2e` (com os navegadores do Playwright instalados no runner) e publica o relatório do Playwright como artefato quando falha.

## Requisitos não funcionais

- **Performance**: a fundação não pode consumir o orçamento do site; o bundle inicial com a página vazia deve ficar bem abaixo de 150 KB gzip (referência: React + React DOM + roteador ≈ 60–70 KB).
- **Acessibilidade**: a página vazia já passa no axe sem violações; foco visível definido globalmente; `lang="pt-BR"` no HTML.
- **Segurança**: nenhum segredo no repositório; só a chave pública do Supabase existe no frontend; `service_role` nunca aparece no código nem no CI do frontend.
- **Privacidade**: nada de fontes, scripts ou analytics de terceiros carregados pelo site nesta fase.
- **Manutenção**: dependências com versões fixadas no `package-lock.json`; nenhuma biblioteca de animação, UI kit ou CSS-in-JS.
- **Portabilidade**: todos os comandos funcionam no Windows (PowerShell/Git Bash) e no Linux do CI.

## Critérios de aceite

- **CA-01 (RF-01)** — Dado um clone limpo, quando rodo `npm ci && npm run build`, então o build termina sem erros; e dado um arquivo com um `any` implícito ou acesso indexado sem checagem, quando rodo `npm run typecheck`, então ele falha.
- **CA-02 (RF-02)** — Dado o repositório, quando listo `src/` e `tests/`, então todas as pastas da seção 10 existem, e uma importação `@/lib/env` resolve no app, no Vitest e no typecheck.
- **CA-03 (RF-03)** — Dado o build de produção, quando inspeciono os chunks carregados ao abrir `/`, então nenhum arquivo de `src/admin/**` está entre eles; quando navego para `/admin/login`, então o chunk do admin é baixado nesse momento.
- **CA-04 (RF-04)** — Dado `tokens.css`, quando um teste lê as variáveis, então cada token da tabela da seção 8 existe com o valor exato; e dado `prefers-reduced-motion: reduce`, quando um teste E2E inspeciona um elemento com transição, então a duração efetiva é zero.
- **CA-05 (RF-05)** — Dado o build, quando abro `/` com a rede monitorada, então nenhuma requisição sai para `fonts.googleapis.com`/`fonts.gstatic.com`, as fontes são WOFF2 servidas pelo próprio site e existem `<link rel="preload">` para elas.
- **CA-06 (RF-06)** — Dado um componente de teste em `src/site/` com texto literal em JSX, quando rodo o lint, então ele falha com `react/jsx-no-literals`; dado o mesmo texto em `src/admin/`, então passa; dado `dangerouslySetInnerHTML` em qualquer pasta, então falha. (Verificado por um teste que chama a API do ESLint com trechos de código, sem deixar arquivos “ruins” no repositório.)
- **CA-07 (RF-07)** — Dado um teste que faz `fetch` para uma URL sem handler do MSW, quando rodo `npm run test`, então o teste falha com mensagem indicando a requisição não tratada.
- **CA-08 (RF-08)** — Dado o comando `npm run test:e2e`, quando ele roda, então os projetos mobile executam antes do desktop e um teste de fumaça abre `/` em cada viewport e chama `checkA11y` sem violações.
- **CA-09 (RF-09)** — Dado o build, quando rodo `npm run size`, então ele mostra o tamanho gzip do JS inicial e falha se passar de 150 KB.
- **CA-10 (RF-10)** — Dada a lista de pares texto/fundo do design, quando o teste de contraste roda, então todos os pares permitidos ficam ≥ 4,5:1 e o teste documenta os pares proibidos (ver casos de borda).
- **CA-11 (RF-11)** — Dado um ambiente sem `VITE_SUPABASE_URL`, quando o código chama a leitura de env, então é lançado um erro que nomeia a variável ausente; e `git check-ignore .env.local` confirma que o arquivo é ignorado.
- **CA-12 (RF-12)** — Dado o `package.json`, quando rodo `npm run check`, então lint, typecheck, test, build e size rodam em sequência e o comando falha se qualquer etapa falhar.
- **CA-13 (RF-13)** — Dado um push para o GitHub, quando o workflow roda, então todas as etapas aparecem separadas no log e um erro de lint proposital faz o workflow falhar.

## Casos de borda

- **Terracota sobre areia não passa no contraste.** Pelas minhas contas, `#A9553A` sobre `#F1E8DC` dá ≈ 4,3:1, abaixo de 4,5:1 para os 13px da etiqueta. Sobre o creme (≈ 4,8:1) e o branco (≈ 5,2:1) passa. Regra proposta: **etiqueta terracota nunca sobre fundo areia** (no design ela não aparece lá, mas o teste deixa isso registrado). Os demais pares conferidos passam: texto suave sobre areia ≈ 5,2:1, branco sobre verde ≈ 7,4:1, `#F2C9B5` sobre verde ≈ 4,9:1.
- **Windows x Linux.** Finais de linha CRLF quebrando Prettier e snapshots: resolvido com `.gitattributes` e `endOfLine: lf`. Caminhos com `\` em configs: usar sempre `/` e `path`/`URL`.
- **WebKit no Windows.** O projeto `mobile-webkit` pode ser instável localmente no Windows; no CI (Linux) ele é obrigatório. Localmente, dá para rodar só `--project=mobile-chromium`.
- **jsdom não tem `IntersectionObserver` nem `matchMedia`.** Por isso os mocks entram já na fundação (RF-07).
- **`react/jsx-no-literals` e espaços/pontuação.** A regra pode reclamar de `{' '}` ou de símbolos como “·”. Separadores visíveis também devem vir do conteúdo; espaços em branco puros ficam liberados na configuração.
- **Primeiro push sem git.** O projeto ainda não é um repositório git; o CI só funciona depois do `git init` e de um remoto no GitHub (ver perguntas em aberto).

---

## Decisões em aberto (preciso da sua escolha no Gate 1)

> Observação: as condições dos planos gratuitos abaixo são as que conheço; vou reconfirmar nas páginas oficiais antes do Gate 2, porque elas mudam com frequência.

### D1 — Backend

| Opção | Prós | Contras |
|---|---|---|
| **Supabase** (Auth + Postgres JSONB + Storage) | Tudo que precisamos em um lugar: login por e-mail/senha com cadastro público desligável, RLS para "leitura pública / escrita só admin", Storage para fotos, SDK pequeno, plano gratuito suficiente para um site deste tamanho, reset de senha por e-mail pronto. | No plano gratuito o projeto **pausa após ~7 dias sem atividade** na API; como ela vai editar raramente, isso vai acontecer. Precisa de mitigação (ver recomendação). O SDK completo pesa; precisa ficar só no admin. |
| Firebase (Auth + Firestore + Storage) | Maduro, não pausa. | O Storage passou a exigir o plano pago por uso (Blaze, com cartão). Regras de segurança em linguagem própria, SDK mais pesado, modelo de documentos menos natural para validar com Zod no banco. |
| CMS baseado em Git (Decap/Sveltia + GitHub) | Sem banco; conteúdo versionado como JSON no repositório; gratuito. | Ela precisaria de conta no GitHub para logar; o editor é o do CMS, não o admin desenhado no Claude Design; menos controle de UX. |
| PocketBase ou backend próprio | Controle total, sem pausas. | Precisa de servidor para hospedar, manter, atualizar e fazer backup. Custo e manutenção desproporcionais ao projeto. |

**Recomendação: Supabase**, com duas mitigações para a pausa:
1. Com a estratégia de SEO (b) abaixo, o site público **não depende do Supabase para funcionar**: se o projeto pausar, o site continua no ar; só o admin fica indisponível até reativar.
2. Um job agendado no GitHub Actions (semanal) faz uma leitura simples na API para manter o projeto ativo.

A chave `anon` fica no frontend; o SDK do Supabase só é importado no código do admin (e no script de build), nunca no bundle do site.

### D2 — Deploy

| Opção | Prós | Contras |
|---|---|---|
| Vercel (Hobby) | Experiência excelente, previews por PR, deploy hooks. | **Os termos do plano gratuito proíbem uso comercial.** O site de um consultório é uso comercial; o correto seria o plano Pro (≈ US$ 20/mês). |
| **Cloudflare Pages** | Gratuito com uso comercial permitido, banda ilimitada, CDN muito rápida no Brasil, deploy hooks, previews por branch, headers e redirects por arquivo. | Painel um pouco menos amigável que o da Vercel; build com limite de tempo/quantidade no plano gratuito (folgado para este projeto). |
| Netlify (gratuito) | Uso comercial permitido, deploy hooks, previews. | Plano gratuito com limite de banda e minutos de build mais apertados; cobrança por créditos em alguns planos. |

**Recomendação: Cloudflare Pages.** Gratuito sem ferir os termos, rápido no Brasil e com deploy hook (necessário para a opção de SEO recomendada). Se você preferir a Vercel pela experiência, vale ir direto ao plano Pro. Isso muda o `CLAUDE.md` (seção 5), então só altero lá com sua aprovação.

### D3 — SEO e entrega do conteúdo

| Opção | Prós | Contras |
|---|---|---|
| **(a) Conteúdo em tempo de execução, com cache** | Publicar é instantâneo; arquitetura mais simples (SPA pura). | O HTML que chega ao celular está vazio: o texto só aparece depois de baixar o JS **e** buscar o conteúdo no Supabase, o que piora o LCP no 4G. Prévias de link no **WhatsApp e Instagram não executam JS**, então título, descrição e imagem de compartilhamento ficariam fixos no `index.html` (não editáveis). Se o Supabase pausar, o site fica sem conteúdo. O Google indexa JS, mas com atraso e menos garantia. |
| **(b) Pré-renderização no build + novo deploy ao salvar** | HTML completo com todo o texto já na primeira resposta: melhor LCP, melhor SEO, prévias corretas no WhatsApp com título/descrição/imagem editáveis no admin. Site 100% estático na CDN: rápido, barato e de pé mesmo se o Supabase pausar. Dá para copiar as fotos para o próprio deploy e servi-las pela CDN. | Ao clicar em "Salvar e publicar", as mudanças levam ~1–3 min para aparecer (tempo do build). O build fica um pouco mais complexo (script de pré-renderização com `renderToString`). O deploy hook precisa ficar secreto, então o disparo passa por uma função no Supabase (Edge Function ou webhook do banco), não pelo navegador. |

**Recomendação: (b) pré-renderização.** Para este projeto, a velocidade no celular e as prévias corretas no WhatsApp (onde o link dela vai circular) pesam mais do que publicar instantaneamente. Para compensar a espera:
- o admin mostra o status "Publicando… (pode levar até 3 minutos)" e depois "Última publicação: [data]";
- o admin pode ter uma **pré-visualização** que renderiza os componentes do site com o rascunho, antes de publicar (a decidir na spec 004).

Detalhe técnico (fica para o `plan.md`): o HTML pré-renderizado é "hidratado" pelo React no cliente usando o mesmo conteúdo embutido no build, sem nova busca ao Supabase. As animações continuam funcionando.

---

## Perguntas em aberto (respondidas em 2026-11-05)

1. **D1, D2 e D3**: aprovados Supabase, Cloudflare Pages e pré-renderização (b).
2. **Git e GitHub**: repositório criado em https://github.com/ThiagoRe4l/portifolio-tiffany (vazio em 2026-11-05). O CA-13 é verificado no primeiro push.
3. **Node**: Node 24 (LTS) fixado no projeto e no CI.
4. **Contas**: Supabase e hospedagem ficam na conta do Thiago.
5. **Domínio**: ainda não existe. URLs canônicas e Open Graph usam uma variável de build (`SITE_URL`), definida quando houver domínio.
6. **Analytics**: nenhuma ferramenta de métricas nesta fase.

---

## Próximas specs (escopo resumido)

**001 — Modelo de conteúdo.** Define os 8 schemas Zod (`geral`, `inicio`, `sobre`, `trabalho`, `atuacao`, `comoFunciona`, `espaco`, `contato`) com limites de caracteres, campos obrigatórios, tipos de imagem (URL + largura + altura + texto alternativo obrigatório), listas ordenáveis e a lista fixa de ícones dos cards. Cria `defaults.ts` com os textos aprovados da seção 8 e os placeholders `[...]`, a tabela `site_content` e suas políticas (com autorização), a camada `api.ts` de leitura/gravação e o `ContentProvider`. Implementa a estratégia de SEO escolhida em D3 (script de pré-renderização que lê o conteúdo e gera o HTML com título, descrição e Open Graph) e o gerador de link do WhatsApp com seu teste obrigatório.

**002 — Site público.** Constrói, mobile primeiro, header (fixo com fundo após 40px, menu mobile acessível), hero, Sobre mim, Meu trabalho, Área de atuação, Como funciona, O espaço, Contato (WhatsApp, Instagram, e-mail, telefone, endereço, horários, mapa opcional), rodapé e botão flutuante de WhatsApp (desligável). Inclui o hook `useReveal` com `IntersectionObserver`, as animações da seção 8, rolagem suave e o desligamento total com movimento reduzido. Traz os testes obrigatórios "sem texto fixo no site" e "movimento reduzido", os E2E mobile/desktop com axe e a verificação das metas de Lighthouse.

**003 — Admin: autenticação.** Tela `/admin/login` conforme o design (voltar ao site, mostrar/ocultar senha, "Esqueci minha senha" com reset por e-mail, mensagens de erro claras), sessão persistente com o Supabase Auth, tabela `admins`, cadastro público desligado, logout e proteção de `/admin/*` com redirecionamento para o login. Garante que o admin é carregado sob demanda. Traz o teste obrigatório de rotas protegidas.

**004 — Admin: editor.** Painel `/admin` com header (status de publicação, "Ver site", "Sair"), seletor de seção ("3 de 8"), formulários **gerados a partir dos schemas** (texto, texto longo com contador de caracteres, liga/desliga, seleção de ícone, listas com adicionar/remover/reordenar), validação com Zod, barra fixa "Descartar" / "Salvar e publicar", aviso de alterações não salvas ao sair, toasts de sucesso/erro e o disparo da publicação (deploy hook via função segura). Traz o teste obrigatório de cobertura do admin (todo campo de schema tem campo editável).

**005 — Imagens.** Campo de foto com miniatura, "Trocar foto" e texto alternativo obrigatório; aceita só JPG/PNG/WebP com limite de tamanho; redimensiona no navegador (lado maior até 1600px) e converte para WebP, gerando as larguras do `srcset`; envia ao Storage com nome gerado; políticas do bucket (leitura pública, escrita só admin, com autorização); no site, `srcset`/`sizes`, `width`/`height`, `loading="lazy"` e `fetchpriority="high"` na foto do hero. Define também se as fotos são copiadas para o deploy estático no build (caso D3 = b).
