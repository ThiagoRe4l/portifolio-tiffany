# 000 — Fundação: plano técnico

> Status: **Gate 2 aprovado** em 2026-11-05
> Spec: [spec.md](./spec.md) (Gate 1 aprovado em 2026-11-05)

## 1. Visão geral

SPA em Vite + React, já organizada para receber a pré-renderização na spec 001. Na 000 o site é só uma casca: `/` renderiza um `<main>` vazio e o admin é carregado sob demanda. A fundação entrega as ferramentas e as regras automáticas: tipos, lint, testes, E2E, acessibilidade, orçamento de bundle, contraste e CI.

> **Revisão de 2026-11-05 (aprovada pelo Thiago após a T05):** o React Router 8 somava ~31 KB gzip ao bundle inicial (68,6 → 99,9 KB) só para atender o admin. O roteador passou a viver **apenas no chunk do admin**; a entrada do app decide entre site e admin olhando o caminho.

```
index.html ──► src/app/main.tsx ──► bootstrap(pathname, #root)
                                     ├─ "/admin" ou "/admin/…" → import('@/admin/AdminApp')   (chunk do admin)
                                     │                             └─ React Router: "/admin/login", "/admin",
                                     │                                "/admin/…" desconhecido → "/admin"
                                     ├─ "/"                       → <SitePage />                (bundle inicial)
                                     └─ qualquer outro caminho    → history.replaceState("/") + <SitePage />
```

- `src/app/resolveEntry.ts`: função pura `resolveEntry(pathname)` → `{ kind: 'admin' }` ou `{ kind: 'site', redirectTo?: '/' }`. `/administrar` **não** é admin (o prefixo precisa ser `/admin` seguido de `/` ou fim).
- `src/app/bootstrap.tsx`: aplica a decisão (importa o admin sob demanda ou renderiza o site). O `main.tsx` só chama `bootstrap(window.location.pathname, document.getElementById('root'))`.
- `src/admin/AdminApp.tsx` + `src/admin/adminRoutes.tsx`: o roteador do admin. Dentro do admin, links para o site (ex.: "Ver site", "Voltar ao site") precisam recarregar a página (`<a href="/">` ou `reloadDocument`), porque o site não está no roteador. Anotar na spec 003/004.
- Preparação para a spec 001: `bootstrap` é o único ponto que decide a renderização, então a pré-renderização (que só gera `/`) troca `createRoot` por `hydrateRoot` no ramo do site.

## 2. Dependências

Versões conferidas com `npm view` em 2026-11-05. Na instalação, fixo a versão exata no `package-lock.json`.

### Produção (vão para o navegador)
| Pacote | Versão | Por quê |
|---|---|---|
| `react`, `react-dom` | 19.3.x | Stack definida. |
| `react-router` | 8.5.x | Rotas do admin (`/admin/login`, `/admin`). **Só é importado pelo chunk do admin**; o site público não o baixa (revisão de 2026-11-05). Uso no modo "data", **sem** o modo framework (ver alternativas descartadas). |

### Desenvolvimento
| Pacote | Versão | Por quê |
|---|---|---|
| `vite`, `@vitejs/plugin-react` | 8.3.x / 6.2.x | Build e servidor de desenvolvimento. |
| `typescript` | **6.0.x** (não a 7) | O `typescript-eslint` atual só suporta TS `< 6.1`. Subimos para a 7 quando ele suportar. |
| `@types/react`, `@types/react-dom`, `@types/node` | 19.3.x / 19.3.x / 24.x | Tipos (`@types/node` acompanha o Node 24 do projeto). |
| `eslint`, `@eslint/js` | **9.39.x** (não a 10) | `eslint-plugin-react` e `eslint-plugin-jsx-a11y` ainda não declaram suporte ao ESLint 10. |
| `typescript-eslint` | 8.72.x | Regras de TypeScript. |
| `eslint-plugin-react` | 7.37.x | `react/jsx-no-literals` e `react/no-danger`. |
| `eslint-plugin-react-hooks` | 7.1.x | Regras de hooks. |
| `eslint-plugin-jsx-a11y` | 6.10.x | Acessibilidade estática no JSX. |
| `eslint-config-prettier`, `prettier` | 10.1.x / 3.9.x | Formatação sem conflito com o lint. |
| `globals` | 17.x | Globais de browser/node na config flat. |
| `vitest`, `jsdom` | 5.1.x / 31.x | Testes de unidade e componentes. |
| `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event`, `@testing-library/jest-dom` | 16.3 / 10.4 / 14.6 / 7.0 | Testes de componentes. |
| `msw` | 3.0.x | Simular a API (Supabase) nos testes. |
| `@playwright/test`, `@axe-core/playwright` | 1.65.x / 4.14.x | E2E e acessibilidade. |
| `@fontsource-variable/inter`, `@fontsource/fraunces` | 5.3.x | **Só como fonte dos arquivos WOFF2.** Um script copia os arquivos latinos para `public/fonts/`; nada desses pacotes vai para o bundle. |

**Não entram**: biblioteca de animação, UI kit, CSS-in-JS, `size-limit`, `tsx`. O Node 24 executa scripts `.ts` diretamente (remoção de tipos nativa), então o verificador de bundle é um script próprio, sem dependência.

## 3. Arquivos criados

### Raiz
| Arquivo | Conteúdo |
|---|---|
| `package.json` | Scripts (seção 5), `"type": "module"`, `"engines": { "node": ">=24 <25" }`. |
| `.nvmrc` | `24` |
| `.gitattributes` | `* text=auto eol=lf`; `*.woff2 binary`. |
| `.gitignore` | `node_modules`, `dist`, `.env*`, `!.env.example`, `test-results`, `playwright-report`, `coverage`. |
| `.editorconfig` | UTF-8, LF, 2 espaços. |
| `.prettierrc.json` | `singleQuote`, `semi`, `printWidth: 100`, `endOfLine: "lf"`. |
| `.env.example` | `VITE_SUPABASE_URL=` e `VITE_SUPABASE_ANON_KEY=` |
| `index.html` | `lang="pt-BR"`, `viewport`, `theme-color` `#FAF6F0`, preload das fontes, `<title>` provisório `[Nome] · Psicóloga` (a 001 substitui pelo conteúdo), `<div id="root">`. |
| `vite.config.ts` | Plugin React, alias `@` → `src`, `build.manifest: true` (usado pelo verificador de bundle), `build.target: 'es2022'`. |
| `vitest.config.ts` | Ambiente jsdom, `setupFiles: tests/setup/vitest.setup.ts`, alias `@`, inclui `src/**/*.test.{ts,tsx}` e `tests/unit/**`. |
| `playwright.config.ts` | Projetos e servidor (seção 4.5). |
| `eslint.config.js` | Config flat (seção 4.3). |
| `tsconfig.json` | Referências para `tsconfig.app.json` e `tsconfig.node.json`. |
| `tsconfig.app.json` | `src/` e `tests/`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `jsx: react-jsx`, `paths: { "@/*": ["src/*"] }`, `noEmit`. |
| `tsconfig.node.json` | Arquivos de config e `scripts/`. |

### `src/`
| Arquivo | Conteúdo |
|---|---|
| `src/app/main.tsx` | `createRoot` + `<App />`; importa `tokens.css` e `global.css`. |
| `src/app/App.tsx` | `RouterProvider` com as rotas. |
| `src/app/routes.tsx` | Definição das rotas; admin via `lazy: () => import('@/admin/...')`. |
| `src/site/SitePage.tsx` | `<main id="main"></main>` (vazio; a 002 preenche). |
| `src/site/a11yLabels.ts` | Objeto vazio tipado `as const` (a 002 adiciona rótulos). |
| `src/admin/AdminLoginPage.tsx`, `src/admin/AdminEditorPage.tsx` | `<main>` vazio (a 003/004 preenchem). |
| `src/lib/env.ts` | `getEnv()` lê `import.meta.env`, lança `Error("Variável de ambiente ausente: VITE_SUPABASE_URL")`. Leitura sob demanda, para o build não depender das variáveis. |
| `src/styles/tokens.css` | Todas as variáveis (seção 4.1). |
| `src/styles/global.css` | `@font-face`, reset leve, base tipográfica mobile, `:focus-visible`, `.visually-hidden`, regra de movimento reduzido. |
| `src/vite-env.d.ts` | Tipos de `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). |
| `src/content/.gitkeep`, `tests/fixtures/.gitkeep`, `supabase/.gitkeep` | Pastas previstas, vazias. |

### `public/`
| Arquivo | Conteúdo |
|---|---|
| `public/fonts/inter-latin-wght-normal.woff2` | Inter variável (eixo de peso 400–600 coberto por um arquivo só). |
| `public/fonts/fraunces-latin-500-normal.woff2` | Fraunces 500. |
| `public/fonts/LICENSE-OFL.txt` | Licença SIL OFL das duas fontes. |

### `scripts/`
| Arquivo | Conteúdo |
|---|---|
| `scripts/copy-fonts.ts` | Copia os dois WOFF2 de `node_modules/@fontsource*` para `public/fonts/`. Roda uma vez e quando atualizar as fontes. |
| `scripts/bundle-report-plugin.ts` | **(Revisão T06)** O manifest do Vite lista só os chunks, não os módulos dentro deles, então não detecta o `react-router` embutido no chunk inicial. Este plugin do Vite (registrado no `vite.config.ts`) grava `dist/.vite/bundle-report.json` com, para cada chunk: arquivo, se é entrada, imports estáticos, imports dinâmicos e módulos. Função pura `toBundleReport(bundle)`. |
| `scripts/bundle-budget.ts` | Lê o `bundle-report.json`, parte das entradas e segue só os **imports estáticos** (ignora `dynamicImports`), soma o gzip (`node:zlib`) dos JS e falha se passar de 150 KB **ou** se houver no conjunto inicial módulo de `src/admin/` ou do `react-router`. Funções puras exportadas (`collectInitialChunks`, `findForbiddenModules`, `checkBudget`, `runBudget`); a linha de comando só roda quando o arquivo é executado direto (`import.meta.main`). |

### `tests/`
| Arquivo | Conteúdo |
|---|---|
| `tests/setup/vitest.setup.ts` | `jest-dom`, servidor MSW (`onUnhandledRequest: 'error'`), `cleanup`, instalação dos mocks. |
| `tests/setup/msw.ts` | `server = setupServer()` sem handlers padrão; cada teste registra os seus. |
| `tests/setup/intersectionObserver.ts` | Mock controlável: `triggerIntersect(el, ratio)`. |
| `tests/setup/matchMedia.ts` | Mock com `setReducedMotion(true/false)`. |
| `tests/support/contrast.ts` | `contrastRatio(hexA, hexB)` (fórmula WCAG). |
| `tests/support/tokens.ts` | Lê `tokens.css` e devolve um mapa `nome → valor`. |
| `tests/e2e/support/a11y.ts` | `checkA11y(page)` com tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`. |
| Arquivos de teste | Listados em `tasks.md`. |

### CI
| Arquivo | Conteúdo |
|---|---|
| `.github/workflows/ci.yml` | Seção 4.6. |

## 4. Detalhes de configuração

### 4.1 Tokens (`tokens.css`)
- **Cores**: os 13 tokens da seção 8, com os nomes exatos (`--color-bg` … `--color-placeholder`).
- **Tipografia**: `--font-heading: 'Fraunces', Georgia, serif`; `--font-body: 'Inter', system-ui, sans-serif`; `--fs-h1: 38px`, `--fs-h2: 30px`, `--fs-body: 16px`, `--fs-label: 13px`, `--lh-body: 1.6`, `--ls-label: 0.08em`; pesos `--fw-regular/medium/semibold` (400/500/600) e `--fw-heading: 500`. A partir de 1024px: `--fs-h1: 60px`, `--fs-h2: 44px`, `--fs-body: 17px` (redefinidos em `@media (min-width: 1024px)` no próprio `tokens.css`).
- **Forma**: `--radius-card: 16px`, `--radius-card-lg: 18px`, `--radius-photo: 20px`, `--radius-photo-lg: 24px`, `--radius-pill: 999px`, `--radius-arch: 999px 999px 24px 24px`.
- **Espaço**: `--space-section: 56px` (104px a partir de 1024px), `--gutter: 24px`, `--container: 1200px`, `--tap-min: 48px`.
- **Movimento**: `--motion-duration: 700ms`, `--motion-ease: cubic-bezier(.2,.7,.2,1)`, `--motion-stagger-hero: 90ms`, `--motion-stagger: 80ms`, `--motion-distance: 24px`.
- Variáveis CSS não funcionam dentro de `@media`, então os breakpoints (768/1024/1280) ficam documentados em comentário no `tokens.css` e usados literalmente nas media queries.

### 4.2 Movimento reduzido (`global.css`)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto !important; }
}
```
O hook de reveal da 002 também respeita a preferência (os elementos aparecem já visíveis); a regra global é a rede de segurança.

### 4.3 ESLint (`eslint.config.js`)
- Base: `@eslint/js` recommended + `typescript-eslint` recommended (type-checked em `src/`) + `react` (recommended, jsx-runtime) + `react-hooks` + `jsx-a11y` recommended + `eslint-config-prettier` por último.
- Em todos os arquivos: `react/no-danger: error`.
- Só em `src/site/**/*.tsx`:
  ```js
  'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: false, noAttributeStrings: true,
    allowedStrings: [] }]
  ```
  `noAttributeStrings` também bloqueia `alt="..."`, `aria-label="..."` e `title="..."` fixos. Atributos técnicos (`className`, `href="#..."`, `type`, `rel`, `loading` etc.) entram numa lista de exceções na config; se a regra não permitir exceção por nome de atributo, uso `noAttributeStrings: false` e cubro textos em atributos com o teste "sem texto fixo" da 002. **Confirmo o comportamento na T03 e registro aqui.**
- `src/site/a11yLabels.ts` não é JSX, então a regra não se aplica a ele (exceção natural).

### 4.4 Vitest
- Ambiente `jsdom`. Risco conhecido: MSW em jsdom às vezes precisa dos globais de `fetch`/`Request` do Node; se acontecer, uso um ambiente customizado que reexpõe os globais do Node (padrão documentado pelo MSW). Coberto pelo teste da T02.

### 4.5 Playwright
- `webServer`: `npm run preview -- --port 4173 --strictPort`, `reuseExistingServer: !CI`. O script `test:e2e` roda `build` antes.
- Projetos: `mobile-chromium` (`devices['Pixel 7']`), `mobile-webkit` (`devices['iPhone 13']`), `desktop` (Desktop Chrome, 1440×900) com `dependencies: ['mobile-chromium', 'mobile-webkit']`. Assim o desktop só roda depois do mobile passar (CA-08).
- `trace: 'on-first-retry'`, `retries: CI ? 2 : 0`, relatório HTML.

### 4.6 CI (`.github/workflows/ci.yml`)
- Gatilhos: `push` e `pull_request`.
- Job `quality`: `actions/checkout`, `actions/setup-node` (`node-version-file: .nvmrc`, `cache: npm`), `npm ci`, `lint`, `typecheck`, `test`, `build`, `size` (cada um como etapa separada).
- Job `e2e` (`needs: quality`): `npm ci`, `npx playwright install --with-deps chromium webkit`, `npm run test:e2e`; envia `playwright-report/` como artefato se falhar.
- Sem segredos nesta fase. O job agendado que mantém o Supabase ativo entra na spec 001, quando o projeto existir.

## 5. Scripts npm
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "npm run build && playwright test",
  "lint": "eslint . --max-warnings 0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -b --noEmit",
  "size": "node scripts/bundle-budget.ts",
  "fonts:copy": "node scripts/copy-fonts.ts",
  "check": "npm run lint && npm run typecheck && npm run test && npm run build && npm run size"
}
```
`lint` também roda `format:check` no CI (etapa própria).

## 6. Como cada critério de aceite é provado

| CA | Prova |
|---|---|
| CA-01 | `npm ci && npm run build` sem erro; teste `tests/unit/tsconfig.test.ts` confere `strict` e `noUncheckedIndexedAccess` no `tsconfig.app.json`. |
| CA-02 | `tests/unit/structure.test.ts` verifica as pastas; o próprio uso de `@/` nos testes prova o alias em Vitest e typecheck. |
| CA-03 | `tests/unit/bundle-budget.test.ts` (funções puras com manifest de exemplo, incluindo um "vazamento" de admin) + E2E `tests/e2e/code-splitting.spec.ts` (sem chunk do admin em `/`; chunk baixado ao abrir `/admin/login`). |
| CA-04 | `tests/unit/tokens.test.ts` (cada token com valor exato) + E2E `tests/e2e/reduced-motion.spec.ts` (injeta um elemento com transição, emula `reducedMotion: 'reduce'` e confere `transition-duration` = `0s`). |
| CA-05 | E2E `tests/e2e/fonts.spec.ts`: nenhuma requisição a domínios do Google; requisições `.woff2` são da mesma origem; `<link rel="preload" as="font">` presente. |
| CA-06 | `tests/unit/lint-rules.test.ts` usa `new ESLint().lintText(código, { filePath })` com caminhos fictícios em `src/site/` e `src/admin/`. |
| CA-07 | `tests/unit/msw-guard.test.ts`: `fetch` sem handler rejeita; com handler registrado, responde. |
| CA-08 | E2E `tests/e2e/smoke.spec.ts` (`/` em cada projeto + `checkA11y`) + ordem garantida por `dependencies`. |
| CA-09 | `npm run size` imprime o total e sai com código 1 acima de 150 KB (coberto pelas funções puras na T06). |
| CA-10 | `tests/unit/contrast.test.ts`: pares permitidos ≥ 4,5:1; par terracota/areia registrado como proibido (< 4,5:1). |
| CA-11 | `src/lib/env.test.ts` (variável ausente → erro com o nome) + teste que confere `.env*` e `!.env.example` no `.gitignore` (o `git check-ignore` só é possível depois do `git init`). |
| CA-12 | Rodar `npm run check` e ver a falha propagando (etapa manual registrada no resumo da T08). |
| CA-13 | **Bloqueado até existir o repositório no GitHub.** Verificação: primeiro push + um PR com erro de lint proposital. |

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Versões muito novas (Vite 8, React Router 8, Vitest 5, MSW 3) com APIs que mudaram em relação ao que conheço. | Conferir a documentação/changelog de cada uma na instalação; os testes da fundação existem justamente para pegar isso cedo. |
| ESLint 10 e TypeScript 7 ficam de fora por incompatibilidade de plugins. | Fixados em ESLint 9.39 e TS 6.0; revisar a cada spec. |
| `jsx-no-literals` sem exceção por atributo pode exigir ajuste de config. | Decidido e documentado na T03 (seção 4.3). |
| WebKit instável no Windows. | Localmente roda só o Chromium se precisar (`--project=mobile-chromium`); no CI (Linux) os três projetos são obrigatórios. |
| Preload de fontes numa página vazia gera aviso "preloaded but not used" no console. | Esperado na 000; some quando a 002 usar as fontes. O E2E da 000 não falha por avisos de console. |
| Sem repositório git: `.gitattributes`/`.gitignore` e CI não são exercitados. | Testes leem os arquivos; a verificação real acontece no primeiro push. |

## 8. Alternativas descartadas

- **React Router no modo framework (com `prerender` embutido)**: resolveria a pré-renderização, mas impõe convenções de pastas e de build e adiciona peso de configuração para um site com uma única rota pública. Um script de pré-renderização próprio (~50 linhas, na 001) é mais simples e controlável.
- **`size-limit`**: dependência extra e não sabe, sozinho, verificar "nenhum módulo do admin no bundle inicial". O script com o manifest do Vite faz as duas coisas.
- **Google Fonts por link**: requisição a terceiros (privacidade/LGPD) e uma conexão a mais no 4G.
- **Fontsource importado no CSS**: o Vite colocaria hash no nome dos arquivos, dificultando o `preload` estático no `index.html`.
- **`happy-dom` no lugar de `jsdom`**: mais rápido, mas com menos fidelidade; jsdom é o padrão da Testing Library.
- **`exactOptionalPropertyTypes`**: rigor extra que costuma brigar com tipos de bibliotecas; fica de fora.

## 9. Mudanças fora de `src/`

- `CLAUDE.md` seção 5 atualizado com as decisões do Gate 1 (Supabase, Cloudflare Pages, pré-renderização).
- Nenhuma migration, bucket ou política nesta spec.
