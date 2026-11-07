# CLAUDE.md — Landing page da psicóloga

Este arquivo define como você (Claude Code) trabalha neste repositório. **Leia tudo antes de qualquer ação.** Em caso de conflito, a ordem de prioridade é: pedido explícito do Thiago na conversa > este arquivo > suas preferências.

Idioma: converse, escreva specs e mensagens de commit em **português**. Código (nomes de variáveis, funções, arquivos) em **inglês**.

---

## 1. O projeto

Landing page de uma psicóloga que atende crianças e adolescentes no Transtorno do Espectro Autista (TEA), com abordagem em Análise do Comportamento.

- **Site público (`/`)**: apresentação, sobre ela, trabalho, área de atuação, como funciona, fotos do espaço, contato. Botões de "entre em contato" (WhatsApp principal, Instagram, e-mail, telefone) e botão flutuante de WhatsApp.
- **Admin (`/admin`)**: login da psicóloga e painel para editar **qualquer texto e qualquer foto** do site, sem mexer em código.
- **Prioridade absoluta: mobile.** A maioria das visitas vem do celular. O desktop é uma adaptação do mobile, nunca o contrário.
- Animações leves no estilo "sites WordPress": conteúdo aparecendo com fade-up ao rolar, entrada em sequência (stagger), transições suaves.

O design de referência está no canvas "Landing Page Psicóloga" (telas: Mobile, Desktop, Admin Login, Admin Editar conteúdo, Admin Editar contato). A especificação visual completa está na seção 8.

---

## 2. Regra de ouro: nada é implementado sem autorização

Você **nunca** escreve ou altera código de produção (`src/**`, config, migrations, infra) sem uma autorização explícita do Thiago **para aquela tarefa específica** ("pode implementar", "aprovado", "segue"). Autorização para uma tarefa não vale para a próxima.

Sem autorização, você pode:
- Ler o repositório e rodar comandos de leitura (`ls`, `git status`, testes existentes).
- Propor e escrever **specs, planos e listas de tarefas** em `specs/`.
- Escrever **testes** de uma tarefa cujo plano já foi aprovado (Gate 2) e rodá-los para mostrar que falham.

Nunca faça sem pedir:
- Instalar ou remover dependências.
- Criar, alterar ou rodar migrations, mexer em políticas de segurança (RLS) ou buckets.
- Commit, push, abrir PR, deploy.
- Apagar arquivos.
- Mudar decisões já aprovadas (stack, estrutura, contrato do conteúdo).

Se uma instrução for ambígua, **pergunte antes**. Se descobrir que a spec aprovada está errada ou incompleta, pare e proponha a correção na spec. Não contorne o problema no código.

---

## 3. Fluxo de trabalho: SDD (Spec-Driven Development)

Toda funcionalidade passa por três documentos em `specs/NNN-nome/`, e cada um tem um portão (gate) de aprovação:

| Etapa | Arquivo | Gate |
|---|---|---|
| 1. Especificação | `spec.md` | **Gate 1**: Thiago aprova a spec |
| 2. Plano técnico + tarefas | `plan.md` + `tasks.md` | **Gate 2**: Thiago aprova o plano |
| 3. Testes (vermelho) | arquivos de teste | **Gate 3**: Thiago autoriza a implementação |
| 4. Implementação (verde) + refatoração | `src/**` | Thiago revisa o resultado |

### `spec.md` (o QUÊ e o PORQUÊ, sem detalhes de implementação)
```
# NNN — Título
## Contexto
## Objetivo
## Fora de escopo
## Requisitos funcionais (RF-01, RF-02…)
## Requisitos não funcionais (performance, acessibilidade, segurança)
## Critérios de aceite (Dado / Quando / Então, um por RF)
## Casos de borda
## Perguntas em aberto
```

### `plan.md` (o COMO)
Arquitetura, arquivos que serão criados ou alterados, contratos (tipos, schemas, tabelas), dependências novas (com justificativa), riscos e alternativas descartadas.

### `tasks.md`
Tarefas pequenas (cabem em uma sessão), numeradas `T01, T02…`. Cada tarefa traz:
- os critérios de aceite que cobre;
- os testes que vão provar que está pronta;
- status: `[ ] pendente`, `[~] testes escritos`, `[x] concluída`.

### Specs iniciais previstas
- `000-fundacao`: setup do projeto, tokens de design, estrutura de pastas, lint, testes, CI.
- `001-modelo-de-conteudo`: schemas do conteúdo, conteúdo padrão, leitura do conteúdo pelo site.
- `002-site-publico`: seções, animações, botões de contato, performance mobile.
- `003-admin-auth`: login, sessão, proteção de rotas.
- `004-admin-editor`: formulários de edição gerados a partir dos schemas, salvar e publicar.
- `005-imagens`: upload, redimensionamento e otimização de fotos.

---

## 4. Testes antes (TDD)

Ciclo obrigatório para cada tarefa: **vermelho → verde → refatorar.**

1. Escreva os testes a partir dos critérios de aceite da spec.
2. Rode e **mostre a saída falhando** (é a prova de que o teste testa algo).
3. Peça autorização para implementar (Gate 3).
4. Implemente o mínimo para os testes passarem.
5. Refatore com os testes verdes.
6. Rode a suíte completa + lint + typecheck antes de dizer que terminou.

### Ferramentas
- **Vitest + React Testing Library + user-event**: unidade e componentes.
- **MSW**: simula a API do backend nos testes (nenhum teste bate no backend real).
- **Playwright**: E2E em **viewport mobile primeiro** (ex.: iPhone 13, Pixel 7) e depois desktop 1440px.
- **@axe-core/playwright**: acessibilidade em todas as páginas.

### Testes obrigatórios do projeto (além dos de cada tarefa)
- **Sem texto fixo no site**: renderizar o site com um conteúdo de teste em que cada string é única, coletar todo o texto visível e confirmar que tudo veio do conteúdo.
- **Cobertura do admin**: para cada campo de cada schema de conteúdo existe um campo editável no admin.
- **Link de WhatsApp**: número e mensagem do conteúdo geram o link `https://wa.me/<número>?text=<mensagem codificada>` corretamente.
- **Rotas protegidas**: sem sessão, `/admin/*` redireciona para o login.
- **Movimento reduzido**: com `prefers-reduced-motion: reduce`, nenhuma animação roda.

### Definição de pronto
Testes da tarefa verdes, suíte completa verde, `lint` e `typecheck` sem erros, critérios de aceite marcados em `tasks.md` e resumo curto do que mudou para o Thiago revisar.

---

## 5. Stack e decisões

| Tema | Decisão | Status |
|---|---|---|
| Framework | React + TypeScript (`strict: true`), Vite | Definido |
| Rotas | React Router (`/`, `/admin/login`, `/admin`) | Proposto |
| Estilo | CSS Modules + variáveis CSS (tokens em `src/styles/tokens.css`) | Proposto |
| Animações | Hook próprio com `IntersectionObserver` + CSS (sem biblioteca pesada) | Proposto |
| Backend | Supabase: Auth (e-mail/senha), Postgres (JSONB) e Storage | Definido (spec 000, 2026-11-05) |
| Validação | Zod (schemas compartilhados entre site e admin) | Proposto |
| Lint/format | ESLint (`react/jsx-no-literals` em `src/site/**`) + Prettier | Proposto |
| Deploy | Cloudflare Pages (plano gratuito permite uso comercial; Vercel Hobby não) | Definido (spec 000, 2026-11-05) |
| SEO | Pré-renderização no build, com novo deploy disparado ao salvar no admin (deploy hook acionado por função segura no Supabase) | Definido (spec 000, 2026-11-05) |

"Proposto" significa: apresente na spec 000 com prós e contras e só siga após aprovação.

---

## 6. Conteúdo 100% editável (regra central)

1. **Nenhum texto visível do site público fica fixo em componente.** Títulos, etiquetas, botões, listas, legendas, textos alternativos de imagem, links de contato: tudo vem do conteúdo.
2. Conteúdo = **um documento JSON por seção**, validado por um **schema Zod**:
   `geral`, `inicio`, `sobre`, `trabalho`, `atuacao`, `comoFunciona`, `espaco`, `contato`.
3. Schemas em `src/content/schema.ts`; conteúdo padrão (com os placeholders `[entre colchetes]`) em `src/content/defaults.ts`.
4. Tabela sugerida: `site_content (section text primary key, data jsonb not null, updated_at timestamptz, updated_by uuid)`.
5. O admin gera os formulários **a partir dos mesmos schemas**. Uma seção ou campo novo no schema já aparece no admin, e o teste de cobertura garante isso.
6. Listas (formação, cards, etiquetas, passos, fotos) podem ser adicionadas, removidas e reordenadas no admin.
7. Única exceção: rótulos de acessibilidade de ícones (ex.: "Abrir menu") centralizados em `src/site/a11yLabels.ts`.
8. Conteúdo é sempre renderizado como **texto**. Nunca use `dangerouslySetInnerHTML`.
9. Não invente textos sobre a psicóloga. Use os textos padrão aprovados (seção 8) ou placeholders `[...]`.

---

## 7. Mobile first, performance e acessibilidade

- Escreva o CSS para **390px primeiro**; breakpoints com `min-width`: 768px, 1024px, 1280px.
- **Metas** (Lighthouse mobile, 4G simulado): Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 95; LCP < 2,5 s; CLS < 0,1; JS inicial do site < 150 KB gzip.
- O admin é carregado sob demanda (code splitting). O visitante do site nunca baixa o código do admin.
- **Imagens**: redimensionar no navegador antes do upload (lado maior até 1600px), salvar em WebP, servir com `srcset`/`sizes`, `width`/`height` sempre definidos, `loading="lazy"` exceto na foto principal (`fetchpriority="high"`).
- **Fontes**: Fraunces e Inter, só os pesos usados, `font-display: swap`, com preload.
- **Animações**: só `opacity` e `transform`, uma vez por elemento, desligadas com `prefers-reduced-motion`.
- Áreas de toque ≥ 48px; contraste mínimo AA (4,5:1 no texto); HTML semântico; navegação por teclado no admin; foco visível.

---

## 8. Especificação de design

### Tokens
| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#FAF6F0` | Fundo (creme) |
| `--color-sand` | `#F1E8DC` | Blocos de destaque claros |
| `--color-surface` | `#FFFFFF` | Seções alternadas, cards |
| `--color-text` | `#1F2D2B` | Texto principal, rodapé |
| `--color-text-muted` | `#56625F` | Texto secundário |
| `--color-primary` | `#2F5D57` | Botões, ícones, seção de atuação |
| `--color-primary-hover` | `#244A45` | Hover/ativo |
| `--color-primary-soft` | `#E4EDE9` | Fundo dos ícones |
| `--color-accent` | `#A9553A` | Etiquetas de seção (terracota) |
| `--color-accent-on-dark` | `#F2C9B5` | Etiqueta sobre fundo verde |
| `--color-line` | `#E6DCCF` | Bordas |
| `--color-input-border` | `#CFC3B4` | Campos do admin |
| `--color-placeholder` | `#E9DFD2` | Fundo de imagem carregando |

- Tipografia: títulos em **Fraunces** 500 (mobile: H1 38px, H2 30px; desktop: H1 60px, H2 44px); texto em **Inter** 400/500/600 (16px mobile, 17px desktop, altura de linha 1.6). Etiquetas: 13px, 600, maiúsculas, espaçamento 0.08em, terracota.
- Raios: cards 16–18px, fotos 20–24px, foto principal em arco (topo totalmente arredondado), botões 999px.
- Espaçamento das seções: 56px vertical no mobile, 104px no desktop; margem lateral 24px no mobile; container máximo de 1200px no desktop.
- Ícones: traço (stroke) 1.8, estilo linha, sem emoji.

### Seções do site (ordem)
1. **Header**: monograma (iniciais), nome, "Psicóloga · CRP". Mobile: botão de menu (abre menu com âncoras). Desktop: links + botão "Agendar consulta". Fica fixo no topo e ganha fundo sólido + sombra após 40px de rolagem.
2. **Início (hero)**: etiqueta, título, texto, botão principal (WhatsApp) e secundário (âncora para Trabalho), foto em arco com selo flutuante ("Clínica especializada em TEA" + cidade/modalidade).
3. **Sobre mim**: etiqueta, título, foto, dois parágrafos, lista de formação com ícones de check.
4. **Meu trabalho**: 4 cards (ícone, título, texto). Mobile: um por linha; desktop: grade automática.
5. **Área de atuação** (fundo verde): título, texto, etiquetas de foco (pílulas), público atendido (3 blocos).
6. **Como funciona**: 3 passos numerados.
7. **O espaço**: galeria de fotos (mobile: uma grande + duas pequenas; desktop: 3 colunas).
8. **Contato**: título, texto, botão grande de WhatsApp, botões de Instagram, e-mail e ligar, endereço, horários e mapa.
9. **Rodapé** (fundo escuro): nome, CRP, ano, link discreto "Área restrita" para `/admin/login`.
10. **Botão flutuante de WhatsApp**: canto inferior direito; mobile só ícone (60px), desktop com texto "Fale comigo". Pode ser desligado no admin.

### Textos padrão (conteúdo inicial; ela edita depois)
- Etiqueta do hero: "Psicologia · TEA · Análise do Comportamento"
- H1: "Cada criança no seu tempo, com acolhimento e ciência."
- Texto do hero: "Atendimento psicológico para crianças e adolescentes no espectro autista, com intervenção baseada em Análise do Comportamento e orientação próxima às famílias."
- Botões do hero: "Agendar pelo WhatsApp" / "Conheça meu trabalho"
- Sobre: "Olá, eu sou a [Nome]." + os dois parágrafos do design + formação (Graduação em Psicologia — [Instituição, ano]; Pós-graduação em Análise do Comportamento aplicada ao TEA — em andamento; Registro CRP [00/00000])
- Trabalho: Avaliação comportamental; Intervenção individualizada; Orientação parental; Parceria com escola e equipe
- Atuação: "Transtorno do Espectro Autista (TEA)"; etiquetas: Comunicação, Habilidades sociais, Autonomia no dia a dia, Manejo de comportamentos, Orientação familiar; público: Crianças, Adolescentes, Famílias
- Como funciona: Primeiro contato; Avaliação inicial; Plano e acompanhamento
- Contato: "Vamos conversar?"; mensagem pronta do WhatsApp: "Olá! Vim pelo site e gostaria de saber mais sobre o atendimento."

### Animações
- Hero: etiqueta, título, texto, botões e foto sobem 24px com fade, 700ms, `cubic-bezier(.2,.7,.2,1)`, intervalo de 90ms entre eles.
- Scroll reveal: elementos com fade-up quando 15% visíveis (`IntersectionObserver`), uma única vez; cards e fotos em sequência de 80ms.
- Desktop: cards sobem 4px com sombra no hover; fotos da galeria com zoom 1.03.
- Âncoras com rolagem suave (desligada com movimento reduzido).
- Botão flutuante entra após 600ms com um pequeno "pop" (uma vez).

### Admin
- **Login** (`/admin/login`): "Voltar ao site", monograma, "Área administrativa", e-mail, senha (com mostrar/ocultar), "Entrar", "Esqueci minha senha" (reset por e-mail).
- **Editor** (`/admin`): header com "Editar site", status ("Última publicação: [data]" / "Alterações não salvas"), "Ver site" e "Sair"; seletor de seção (Geral, Início, Sobre mim, Meu trabalho, Área de atuação, Como funciona, O espaço, Contato); formulário da seção; barra fixa no rodapé com "Descartar" e "Salvar e publicar".
- Avisar antes de sair com alterações não salvas. Mostrar contagem de caracteres onde houver limite. Toast de sucesso/erro ao salvar.
- Fotos: miniatura + "Trocar foto" + campo de texto alternativo obrigatório.

---

## 9. Segurança e privacidade

- Login só por e-mail/senha, **cadastro público desativado**; a conta da psicóloga é criada manualmente.
- Políticas no banco (RLS): leitura pública de `site_content`; escrita só para usuários listados em uma tabela `admins`. Storage: leitura pública, escrita só admin.
- No frontend, só a chave pública (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Nunca use a `service_role` no cliente nem a commite. `.env*` no `.gitignore`.
- Upload: aceitar só JPG/PNG/WebP, limite de tamanho, nome de arquivo gerado (nunca o original).
- O site **não coleta dados de pacientes**: sem formulários com dados de saúde; o contato acontece pelo WhatsApp/e-mail dela.
- Conteúdo de divulgação deve respeitar o Código de Ética do Psicólogo: nome e CRP visíveis, sem promessas de resultado, sem sensacionalismo. Não crie seções de depoimentos, preços ou "resultados" sem aprovação.

---

## 10. Estrutura de pastas

```
specs/                 # SDD: NNN-nome/{spec,plan,tasks}.md
src/
  app/                 # router, providers, layout
  content/             # schema.ts, defaults.ts, api.ts, ContentProvider
  site/                # seções públicas, componentes, hooks (useReveal), a11yLabels.ts
  admin/               # login, editor, formulários gerados por schema (lazy)
  lib/                 # supabase.ts, whatsapp.ts, image.ts
  styles/              # tokens.css, global.css
tests/
  e2e/                 # Playwright (mobile primeiro)
  fixtures/            # conteúdo de teste
supabase/              # migrations e políticas (só com autorização)
```

## 11. Comandos

```
npm run dev          # desenvolvimento
npm run test         # Vitest
npm run test:e2e     # Playwright (mobile + desktop)
npm run lint
npm run typecheck
npm run build
```

## 12. Ao terminar cada tarefa, responda com
1. O que mudou (arquivos, em uma linha cada).
2. Resultado dos testes, lint e typecheck.
3. O que ficou pendente ou qualquer desvio da spec.
4. A próxima tarefa sugerida, **aguardando autorização**.
