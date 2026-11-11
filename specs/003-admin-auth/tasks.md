# 003 — Admin: autenticação · tarefas

> Status: **concluída** (2026-11-10) · Gate 2 aprovado em 2026-11-08
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Autorizações incluídas ao aprovar este Gate 2:** instalar `@supabase/supabase-js` 2.119.0 (T01), escrever a migration (T02, sem aplicar) e mudar o script `test:e2e` (T09). Aplicar a migration e configurar o Supabase ficam com o Thiago (T10).

**Ritmo:** em cada tarefa, testes, vermelho, implementação e verificação completa; parar entre tarefas.

---

### T01 — SDK e cliente `[x] concluída`
- **Faz:** instala o SDK; `src/lib/supabase.ts`; regra `@supabase/` no `bundle-budget.ts`.
- **Cobre:** CA-15 e a base do CA-16.
- **Testes:**
  - `supabase.test.ts`: cliente único, opções do D1, erro claro sem variáveis;
  - `bundle-budget.test.ts`: manifest com `@supabase/` no conjunto inicial falha;
  - `npm run size`: JS inicial segue em 74,5 KB.

### T02 — Migration `[x] concluída`
- **Faz:** `supabase/migrations/20261108120000_admins.sql`, sem aplicar.
- **Cobre:** CA-13.
- **Testes (`tests/unit/admins-migration.test.ts`):** tabela e chave; RLS ligado; leitura só da própria linha; nada de escrita em `admins`; inserção e atualização condicionadas a `admins`; sem exclusão; sem `security definer` e sem `service_role`; a migration da 001 continua igual.

### T03 — `authApi`, mensagens e link de recuperação `[x] concluída`
- **Faz:** `authApi.ts`, `authMessages.ts`, `recoveryHash.ts`.
- **Cobre:** parte de CA-05, CA-06 e CA-07.
- **Testes (MSW):**
  - cada resposta do servidor vira o erro classificado certo;
  - `requestPasswordReset` responde igual para conta existente ou não;
  - e-mail normalizado; senha intacta;
  - `recoveryHash`: tokens válidos, `#error_code`, hash alheio, e o hash sai da URL via `replaceState`.

### T04 — Sessão e proteção de rotas `[x] concluída`
- **Faz:** `AuthProvider`, `RequireAdmin`, rotas novas, `AdminApp`.
- **Cobre:** CA-01, CA-08, CA-09 (teste obrigatório), CA-10 e CA-16.
- **Testes:**
  - `AuthProvider.test.tsx`: cada `status`; `denied` encerra a sessão; `checkFailed` mantém a sessão e permite repetir; sem variáveis vira `unconfigured`;
  - `RequireAdmin.test.tsx` e `adminRoutes.test.tsx`: sem sessão não renderiza nada protegido e usa `replace`; com sessão, o login vai para `/admin`; sessão que acaba durante o uso mostra o aviso.

### T05 — Componentes visuais `[x] concluída`
- **Faz:** `AuthLayout`, `TextField`, `PasswordField`, `SubmitButton`, `AdminIcon`.
- **Cobre:** CA-03 e parte do CA-17.
- **Testes:** `label` ligado ao campo; erro com `aria-describedby` e `aria-invalid`; mostrar/ocultar sem perder o valor e sem enviar, com o nome certo; botão ocupado não dispara de novo.

### T06 — Tela de login `[x] concluída`
- **Faz:** `AdminLoginPage` conforme o design, com o monograma (D5).
- **Cobre:** CA-02, CA-04 e CA-05.
- **Testes (MSW):** elementos e ordem; validação sem requisição; duplo clique gera uma requisição; cada erro anunciado; foco no erro; `autocomplete`; monograma e cadeado sem deslocar o layout.

### T07 — Recuperar e criar senha `[x] concluída`
- **Faz:** `RecoverPasswordPage` e `NewPasswordPage`.
- **Cobre:** CA-06 e CA-07.
- **Testes (MSW):** mensagem idêntica nos dois casos; falha de rede permite repetir; senhas curtas ou diferentes não enviam; sucesso vai para `/admin`; link expirado e acesso direto mostram o caminho para pedir outro; `setSession` roda uma vez.

### T08 — Casca do editor e "Sair" `[x] concluída`
- **Faz:** `AdminEditorPage` com "Editar site", "Ver site" e "Sair".
- **Cobre:** CA-11 e CA-12.
- **Testes:** elementos e link comum; "Sair" encerra a sessão e não mostra aviso de expiração; com o servidor fora, a sessão local é apagada mesmo assim.

### T09 — E2E `[x] concluída`
- **Faz:** `scripts/e2e-build.ts`, novo `test:e2e`, `tests/e2e/admin-auth.spec.ts`, ajuste do `code-splitting.spec.ts`.
- **Cobre:** CA-17 e os fluxos de CA-04, CA-07, CA-09 e CA-11 no navegador.
- **Testes (Pixel 7, iPhone 13, 1440px, rede interceptada):** login até `/admin` e "Sair"; sem sessão redireciona; recarregar mantém a sessão; link de recuperação limpa o hash e salva a senha; fluxo só com teclado; axe; rolagem de 320 a 1440px; toque ≥ 48px; console limpo; nenhuma requisição para fora do domínio falso.

### T10 — Configuração real e fechamento `[x] concluída`
- **Faz:** o Thiago segue o roteiro do `plan.md`; atualizar o CLAUDE.md §5; quadro de CAs.
- **Cobre:** CA-14.
- **Verificação:** `npm run check`, `format:check` e E2E completos; login real e e-mail de recuperação conferidos no site publicado.
- **Feito (2026-11-09):** CLAUDE.md §5, linha "Rotas", passa a "Definido"; quadro abaixo.
- **Conferido pelo Thiago (2026-11-10):** configuração do Supabase e do Cloudflare; login, "Sair" e `/admin` sem sessão indo ao login no site publicado; CA-14 no SQL Editor (administradora grava; conta fora de `admins`, anônimo, escrita em `admins` e exclusão recusados); recuperação de senha pelo e-mail até a tela de nova senha, depois da T11.
- **Achado no teste real:** a linha em `admins` não tinha sido inserida (o login mostrou a mensagem de acesso negado, como previsto), e o primeiro link de recuperação abriu o login, o que levou à T11.

---

### T11 — Link de recuperação em qualquer endereço `[x] concluída`
- **Origem:** no teste real (2026-11-10), o link do e-mail abriu o login em vez da tela de nova senha. A causa provável é o envio pelo painel do Supabase, que volta para a Site URL. O Thiago aprovou a melhoria.
- **Faz:** o token do link, chegando a qualquer rota do admin, leva a `/admin/nova-senha`; chegando ao site, a página repassa o link para lá, sem carregar o código do admin.
- **Cobre:** o caso de borda novo da spec e o CA-07.
- **Testes:** `resolveEntry.test.ts`, `bootstrap.test.tsx`, `recoveryHash.test.ts`, `AdminApp.test.tsx` e E2E (`/admin#token` e `/#token` abrem a tela de nova senha).
- **Resultado (2026-11-10):** Vitest 1103/1103; E2E 301 aprovados e 5 pulados de propósito; JS inicial do site 74,7 KB gzip, porque o site agora reconhece o retorno do link (`src/lib/authRedirect.ts`), sem código do admin.

---

## Quadro de critérios de aceite

Estado em 2026-11-09: Vitest 1089/1089; `npm run check` e `format:check` sem erros; E2E 292 aprovados e 5 pulados de propósito (site); JS inicial do site 74,6 KB gzip; pacote do admin 91,6 KB gzip.

| CA | Situação | Prova |
|---|---|---|
| CA-01 | ok | `adminRoutes.test.tsx`; E2E |
| CA-02 | ok | `AdminLoginPage.test.tsx` (ordem, link comum, cadeado); conferido no navegador em 390 e 1440px |
| CA-03 | ok | `fields.test.tsx`; `AdminLoginPage.test.tsx` |
| CA-04 | ok | `AdminLoginPage.test.tsx` (validação, duplo clique e dois envios simultâneos); E2E |
| CA-05 | ok | `authApi.test.ts`; `AdminLoginPage.test.tsx` (alerta com foco, sem texto do servidor) |
| CA-06 | ok | `authApi.test.ts`; `RecoverPasswordPage.test.tsx` (tela final idêntica) |
| CA-07 | ok | `recoveryHash.test.ts`; `NewPasswordPage.test.tsx`; E2E (hash sai da URL) |
| CA-08 | ok | `AuthProvider.test.tsx`; E2E (recarregar sem piscar o login) |
| CA-09 | ok (obrigatório) | `RequireAdmin.test.tsx`; `adminRoutes.test.tsx`; `AuthProvider.test.tsx` (resposta atrasada); E2E |
| CA-10 | ok | `AuthProvider.test.tsx`; `AdminLoginPage.test.tsx`; E2E (conta sem acesso, falha na verificação) |
| CA-11 | ok | `AdminEditorPage.test.tsx` (servidor fora e sem rede); E2E |
| CA-12 | ok | `AdminEditorPage.test.tsx` |
| CA-13 | ok | `admins-migration.test.ts` (14 sabotagens pegas) |
| CA-14 | ok | roteiro manual no SQL Editor e teste no site publicado (2026-11-10) |
| CA-15 | ok | `bundle-budget.test.ts`; `npm run size` |
| CA-16 | ok | `adminRoutes.unconfigured.test.tsx` |
| CA-17 | ok, com ressalvas | `admin-auth.spec.ts` nos três aparelhos; ressalvas abaixo |

### Desvios e pendências registrados
- **JS inicial do site, de 74,5 para 74,6 KB gzip:** a lista de arquivos do admin passou a incluir o CSS dele (157 bytes). Nenhum código do admin nem do SDK entra no site. Decisão do Thiago (2026-11-09): aceito, e o RNF passa a "não recebe código do admin nem o SDK".
- **Console no WebKit (CA-17):** o aviso intermitente de fonte pré-carregada é filtrado só no E2E do admin, só no WebKit. Decisão do Thiago (2026-11-09): manter o filtro e investigar só se aparecer num iPhone real.
- **Console com senha errada:** o navegador registra o 400 por conta própria; o "console limpo" é medido nos fluxos sem erro.
- **Recarregar a tela de nova senha** antes de salvar mostra "link expirado": o token sai da URL e da memória de propósito.
- **Complementos ao plano** (registrados no `plan.md`): `weakPassword`, "Sair" com `scope: 'local'`, consulta a `admins` sem repetição automática, aviso no `AuthProvider` em vez do `state` da navegação, `test.env` no Vitest, e o login recomeçando a cada acesso negado.
