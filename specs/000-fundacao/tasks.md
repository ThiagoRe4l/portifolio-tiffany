# 000 — Fundação: tarefas

> Status: **Gate 2 aprovado** em 2026-11-05 · Repositório: https://github.com/ThiagoRe4l/portifolio-tiffany
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Exceção ao TDD na T01:** sem projeto e sem Vitest instalados não há como escrever um teste que falhe. A T01 é verificada por comandos (`npm ci`, `build`, `typecheck`). A partir da T02, todas as tarefas seguem vermelho → verde → refatorar.

**Autorizações necessárias:** a T01 instala dependências (`npm install`), e a T07 baixa os navegadores do Playwright (`npx playwright install`). As duas precisam do seu OK explícito.

---

### T01 — Projeto base e estrutura `[x] concluída` (2026-11-05)
- **Resultado**: `npm ci` ok; `build` ok (JS inicial 68,6 KB gzip); `typecheck` ok e rejeita `any` implícito (TS7006) e acesso indexado sem checagem (TS2322); `dev` serve a página. `vitest.config.ts`, `eslint.config.js` e `playwright.config.ts` ficam para T02, T03 e T07.
- **Desvios do plano**: `typecheck` é `tsc -b` (o `noEmit` já está nos tsconfigs; `tsc -b --noEmit` é redundante). `tsconfig.app.json` cobre só `src/`; os testes ganham um `tsconfig.test.json` próprio na T02, para não expor tipos do Node ao código do navegador. `*.md` fora do Prettier, para não reformatar specs e `CLAUDE.md`.
- **Faz**: `package.json` (scripts, engines), instalação das dependências do plano, `tsconfig*`, `vite.config.ts`, `index.html` (sem preload ainda), `.nvmrc`, `.gitattributes`, `.gitignore`, `.editorconfig`, `.prettierrc.json`, `.env.example`, pastas da seção 10, `src/app/main.tsx` + `App.tsx` mínimos, `SitePage` vazio.
- **Cobre**: CA-01 (parte do build), CA-02 (parte das pastas).
- **Verificação**: `npm ci`, `npm run build` e `npm run typecheck` sem erro; `npm run dev` abre uma página vazia.

### T02 — Vitest, Testing Library, MSW e mocks `[x] concluída` (2026-11-05)
- **Resultado**: 28/28 testes verdes; typecheck e build ok. Verificado à parte que um teste que deixa uma requisição sem handler falha com a URL na mensagem.
- **Desvio**: no jsdom o `URL` global é o do jsdom, então `new URL(relativo, import.meta.url)` resolvia para `C:\`. Os testes passaram a usar `tests/support/paths.ts` (`fromRoot`, com `node:path`); as asserções não mudaram. `tsconfig.app.json` agora exclui `src/**/*.test.*`, que ficam no `tsconfig.test.json`.
- **Nota**: no MSW 3 a opção se chama `onUnhandledFrame` (antes `onUnhandledRequest`). O setup registra cada requisição sem handler; `takeUnhandledRequests()` permite ao teste da guarda provar que foi o MSW que bloqueou, e um `afterEach` falha o teste se sobrar alguma requisição não tratada.
- **Faz**: `vitest.config.ts`, `tests/setup/*` (MSW com `onUnhandledRequest: 'error'`, `IntersectionObserver`, `matchMedia`).
- **Cobre**: CA-07, CA-01 (tsconfig), CA-02.
- **Testes**: `tests/unit/msw-guard.test.ts`, `tests/unit/test-mocks.test.ts` (mock de IO dispara callback; `matchMedia` responde a `prefers-reduced-motion`), `tests/unit/tsconfig.test.ts`, `tests/unit/structure.test.ts`.

### T03 — ESLint e Prettier `[x] concluída` (2026-11-05)
- **Resultado**: 39/39 testes verdes; `lint`, `typecheck`, `build` e `prettier --check` sem problemas.
- **Decisões**: regras de TypeScript sem informação de tipos (as *type-checked* atrapalham a análise em memória dos testes; podem ser ligadas só para arquivos reais depois). Em `src/site/**`, `jsx-no-literals` usa `noStrings` + `ignoreProps: false` + `noAttributeStrings: false` (com `noAttributeStrings: true` cada atributo seria reportado duas vezes) e uma lista explícita de valores técnicos permitidos (`TECHNICAL_ATTRIBUTE_VALUES`).
- **Notas**: `lint-rules.test.ts` roda no ambiente `node`; o setup do Vitest pula as simulações de DOM quando não há `window`. O `id="main"` saiu do `SitePage` (o lint o bloqueou); âncoras e ids de seção ficam para a spec 002.
- **Para a spec 002**: `elementOverrides` do `jsx-no-literals` só aceita componentes (nome com maiúscula), então atributos de SVG (`viewBox`, `d`, `stroke`…) vão exigir uma exceção por pasta (ex.: `src/site/icons/**`) ou valores técnicos extras. Decidir no plano da 002.
- **Faz**: `eslint.config.js` (seção 4.3 do plano), integração com Prettier, ajuste da regra de atributos documentado no plano.
- **Cobre**: CA-06.
- **Testes**: `tests/unit/lint-rules.test.ts`: texto literal em `src/site/x.tsx` → erro `react/jsx-no-literals`; mesmo trecho em `src/admin/x.tsx` → sem erro; `dangerouslySetInnerHTML` em qualquer pasta → erro `react/no-danger`; `aria-label="Abrir menu"` fixo em `src/site/` → erro (ou registrado como coberto pela 002, conforme a decisão da T03).

### T04 — Tokens, estilos globais e fontes `[x] concluída` (2026-11-05)
- **Resultado**: 114/114 testes verdes; lint, typecheck, build e Prettier ok. CSS 1,06 KB gzip; fontes 66 KB no total (Inter variável 48 KB + Fraunces 500 18 KB), copiadas para `dist/fonts/`. Contrastes medidos: terracota/creme 4,82 · terracota/branco 5,19 · **terracota/areia 4,28 (proibido)** · pêssego/verde 4,89 · branco/verde 7,44.
- **Desvios**: `/* prettier-ignore */` no `--motion-ease` (o Prettier reescreveria para `cubic-bezier(0.2, 0.7, 0.2, 1)`, que é equivalente, mas o teste confere o valor da spec). `scripts/` entrou no `tsconfig.node.json` para o typecheck cobrir os scripts.
- **Testes extras além do plano**: `tests/unit/global-styles.test.ts` (ordem dos imports no `main.tsx`, bloco de movimento reduzido, foco visível, `body` usando tokens, `@font-face` com `swap`, arquivos WOFF2 válidos, licença OFL, preload no `index.html`, nada do Google Fonts). Apoio: `tests/support/contrast.ts` e `tests/support/tokens.ts`.
- **Faz**: `tokens.css`, `global.css` (com `@font-face`, foco visível, movimento reduzido), `scripts/copy-fonts.ts`, `public/fonts/*` + licença, preload no `index.html`.
- **Cobre**: CA-04 (parte de tokens), CA-10.
- **Testes**: `tests/unit/tokens.test.ts` (13 cores com valores exatos + tipografia, raios, espaços e movimento), `tests/unit/contrast.test.ts` (pares permitidos ≥ 4,5:1; terracota sobre areia registrado como proibido; função `contrastRatio` validada com preto/branco = 21:1).

### T05 — Rotas, admin sob demanda e variáveis de ambiente `[x] concluída` (2026-11-05)
- **Resultado**: 133/133 testes verdes; lint, typecheck, build e Prettier ok. Admin em chunks separados (`AdminLoginPage-*.js`, `AdminEditorPage-*.js`).
- **Atenção**: o JS inicial subiu de 68,6 KB para **99,9 KB gzip** (+31 KB do React Router 8). O Thiago aprovou mover o roteador para dentro do chunk do admin (T05b).

### T05b — React Router só no admin `[x] concluída` (2026-11-05)
- **Resultado**: 147/147 testes verdes; lint, typecheck, build e Prettier ok. JS inicial **69,7 KB gzip** (era 99,9); chunk do admin `AdminApp-*.js` 30,8 KB gzip, baixado só em `/admin…`. `routes.tsx`, `routes.test.tsx` e `App.tsx` removidos com autorização.
- **Faz**: `src/app/resolveEntry.ts`, `src/app/bootstrap.tsx`, `src/admin/AdminApp.tsx`, `src/admin/adminRoutes.tsx`; `main.tsx` chama `bootstrap`. **Remove** `src/app/routes.tsx`, `src/app/routes.test.tsx` e `src/app/App.tsx` (substituídos).
- **Cobre**: RF-03, CA-03 (parte de comportamento).
- **Testes**: `src/app/resolveEntry.test.ts`, `src/app/bootstrap.test.tsx`, `src/admin/adminRoutes.test.tsx`. Na T06, o verificador de bundle também falha se `react-router` aparecer no conjunto inicial.
- **Notas**: `routes.test.tsx` usa marcadores no lugar das páginas e um espião na fábrica do `vi.mock` para provar que o código do admin só é importado ao navegar. `gitignore.test.ts` usa `git check-ignore` de verdade (o git já existe) e já passa, porque o `.gitignore` foi criado na T01. Teste extra: `getEnv` recusa qualquer variável `*SERVICE_ROLE*` (CLAUDE.md §9).
- **Faz**: `src/app/routes.tsx`, `src/admin/AdminLoginPage.tsx`, `src/admin/AdminEditorPage.tsx`, rota coringa → `/`, `src/lib/env.ts`, `src/vite-env.d.ts`.
- **Cobre**: CA-03 (parte de comportamento), CA-11.
- **Testes**: `src/app/routes.test.tsx` (`/` renderiza o `main` do site; `/admin/login` e `/admin` carregam os componentes lazy; rota desconhecida redireciona para `/`), `src/lib/env.test.ts` (erro com o nome da variável ausente; retorno tipado quando presente), `tests/unit/gitignore.test.ts`.

### T06 — Orçamento de bundle `[x] concluída` (2026-11-06)
- **Resultado**: 161/161 testes verdes; lint, typecheck, Prettier ok. `npm run size` no build real: **JS inicial 67,4 KB gzip**, nada proibido (o react-router aparece só no `AdminApp-*.js`). Simulação de vazamento (admin virando import estático) → 2 problemas apontados e código de saída 1. `npm run check` → código 0; com um `any` proposital → código 1 (CA-12).
- **Nota**: o `npm run size` mede 67,4 KB e o Vite mostra 69,7 KB para o mesmo arquivo; a diferença é o nível de compressão gzip de cada ferramenta. O orçamento usa o valor do script.
- **Revisão**: o manifest do Vite não lista os módulos de cada chunk; entra um plugin (`scripts/bundle-report-plugin.ts`) que grava `dist/.vite/bundle-report.json` (ver plan.md §3).
- **Faz**: `scripts/bundle-budget.ts` (funções puras + CLI), script `size`, script `check`.
- **Cobre**: CA-03 (parte estática), CA-09, CA-12.
- **Testes**: `tests/unit/bundle-budget.test.ts` com manifests de exemplo: soma só imports estáticos; ignora `dynamicImports`; detecta módulo de `src/admin/` no conjunto inicial; falha acima de 150 KB.

### T07 — Playwright e axe `[x] concluída` (2026-11-06)
- **Resultado**: 30/30 E2E verdes (10 testes × `mobile-chromium`, `mobile-webkit`, `desktop`), desktop rodando só depois do mobile; `npm run check` verde (161 unitários, JS inicial 67,4 KB).
- **Prova de que os testes testam algo** (cada comportamento quebrado de propósito e restaurado): sem a regra de movimento reduzido → 1 falha; sem o preload da Fraunces → 1 falha; site pré-carregando o admin → 2 falhas; `<html>` sem `lang` → 3 falhas.
- **Navegadores**: Chromium 158 e WebKit 27.2 instalados com autorização (cache do usuário, fora do projeto).
- **Nota**: os E2E verificam comportamentos já implementados em T04/T05b; o que falta é a configuração do Playwright (servidor, `baseURL`, projetos). Depois dela, cada teste será validado "quebrando" de propósito o comportamento que ele protege.
- **Faz**: `playwright.config.ts` (três projetos, desktop depois do mobile), `tests/e2e/support/a11y.ts`, script `test:e2e`, instalação dos navegadores (**com autorização**).
- **Cobre**: CA-08, CA-05, CA-04 (parte E2E), CA-03 (parte E2E).
- **Testes**: `tests/e2e/smoke.spec.ts`, `tests/e2e/fonts.spec.ts`, `tests/e2e/reduced-motion.spec.ts`, `tests/e2e/code-splitting.spec.ts`.

### T08 — CI no GitHub Actions `[x] concluída` (2026-11-06) — **CA-13 aguardando o primeiro push**
- **Resultado**: `.github/workflows/ci.yml` com jobs `quality` e `e2e` (actions `checkout`, `setup-node` e `upload-artifact` na v7, a major atual), permissões mínimas e cancelamento de execuções antigas. Localmente: `npm run check` verde (166 unitários) e `CI=1 npm run test:e2e` verde (30 E2E, gerando `playwright-report`). Lockfile tem os binários Linux do Rolldown, então o `npm ci` no runner não deve quebrar.
- **Falta (CA-13)**: primeiro push → workflow verde; depois um PR com erro de lint proposital → workflow vermelho.
- **Teste**: `tests/unit/ci-workflow.test.ts` (leitura por texto, sem parser YAML): gatilhos, `permissions: contents: read`, nenhum `secrets.`, ordem das etapas do job `quality`, job `e2e` dependente com Chromium + WebKit e relatório em caso de falha.
- **Faz**: `.github/workflows/ci.yml` (jobs `quality` e `e2e`).
- **Cobre**: CA-13, CA-12 (verificação final).
- **Verificação**: rodar `npm run check` e `npm run test:e2e` localmente. **CA-13 fica pendente até o repositório existir no GitHub** (primeiro push + PR com erro de lint proposital).

---

## Ordem e dependências
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08
(T03 e T04 podem trocar de ordem; T07 precisa de T04 e T05.)
