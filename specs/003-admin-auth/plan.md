# 003 — Admin: autenticação · plano técnico

> Status: **aprovado no Gate 2** (2026-11-08)
> Data: 2026-11-08 · Spec: `spec.md` (Gate 1 aprovado)

## Decisões do Gate 1

1. **E-mail de recuperação:** usar o envio padrão do Supabase, com o e-mail dela na equipe do projeto.
2. **`admins`:** só a psicóloga, e uma conta do Thiago apenas se ele quiser dar suporte.
3. **Migration:** escrita aqui, aplicada pelo Thiago no SQL Editor (roteiro no fim).

## Arquitetura

```
AdminApp (carregado só em /admin…)
├─ consumeRecoveryHash()      lê e limpa o #token da URL antes de criar o roteador
└─ AuthProvider               estado único da sessão
   ├─ /admin/login            público; com administradora conectada, vai para /admin
   ├─ /admin/recuperar-senha  público
   ├─ /admin/nova-senha       público; usa os tokens guardados pelo consumeRecoveryHash
   └─ RequireAdmin → /admin   protegido; outros caminhos → /admin
```

A proteção real é o RLS. O `RequireAdmin` só decide o que mostrar.

## Decisões técnicas

### D1 — Cliente do Supabase (`src/lib/supabase.ts`)
`getSupabase()` cria o cliente uma única vez, sob demanda, com `getEnv()`. Importado só por `src/admin/**`.

Opções: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`, `flowType: 'implicit'` e `storageKey: 'admin-auth'`.

### D2 — Fluxo do link de recuperação (RF-07)
- **Fluxo `implicit`:** o PKCE exige abrir o link no mesmo navegador que fez o pedido, e a spec quer que funcione em outro aparelho.
- **`detectSessionInUrl: false` + `consumeRecoveryHash()`:** a função lê `#access_token`, `#refresh_token`, `#type=recovery` ou `#error_code`, guarda em memória e apaga o hash com `history.replaceState`, antes de o roteador existir. Assim o token não fica no histórico (RNF), o que o tratamento automático do SDK não garante.
- A tela chama `setSession` com esses tokens uma única vez (protegido contra o duplo efeito do `StrictMode`). Sem tokens, ou com `#error_code`, mostra link expirado.

### D3 — Estado da sessão (`AuthProvider`)
`status`: `loading`, `signedOut`, `checking`, `admin`, `denied`, `checkFailed` ou `unconfigured`.

- Acompanha `onAuthStateChange`. O trabalho dentro do callback é adiado com `setTimeout(0)`, porque chamar o SDK lá dentro pode travar.
- A verificação de `admins` é um `select` da própria linha: sem linha é `denied`; erro é `checkFailed`.
- `denied` encerra a sessão e mostra a mensagem no login.
- `SIGNED_OUT` que não veio do botão "Sair" gera o aviso de sessão expirada. O aviso fica no próprio `AuthProvider`, e não no `state` da navegação: a conta negada já está em `/admin/login`, sem navegação que o carregue. Assim, um recarregamento também não repete um aviso antigo.
- A sessão inicial vem do evento `INITIAL_SESSION` do `onAuthStateChange`, sem chamada separada a `getSession()`.
- Duas abas: o SDK avisa as outras pelo `BroadcastChannel`.

### D4 — Camada `authApi` e mensagens
`src/admin/auth/authApi.ts` é o único lugar do admin que fala com o SDK sobre autenticação e devolve erros já classificados: `invalidCredentials`, `network`, `rateLimited`, `unavailable`, `samePassword`, `weakPassword`, `expiredLink` ou `unknown`. As frases ficam em `authMessages.ts`, e nenhum texto do servidor chega à tela.

Ajustes da T03, depois de ler o SDK: `weakPassword` cobre a recusa de senha fraca pelo servidor; "Sair" usa `scope: 'local'`, em que o SDK apaga a sessão antes de chamar a rede (RF-11); a consulta a `admins` desliga a repetição automática, que seguraria o carregamento por cerca de 7 s sem internet.

`requestPasswordReset` trata como sucesso tudo que não seja rede ou limite de tentativas, para não revelar se a conta existe.

### D5 — Monograma (RF-02)
O `admin.html` não traz conteúdo embutido, e um teste da 001 garante isso. A tela de login lê `geral.data->initials` do Supabase, que tem leitura pública. O círculo já ocupa o espaço enquanto carrega; sem resposta, mostra o cadeado.

### D6 — Visual
CSS Modules com os tokens do site (`src/styles/tokens.css`). Componentes em `src/admin/components/`: `AuthLayout`, `TextField`, `PasswordField`, `SubmitButton` e `AdminIcon` (seta, olho, olho cortado, cadeado). Os textos do admin ficam nos componentes, porque a regra de conteúdo editável vale só para o site público.

### D7 — Banco (RF-13)
Migration nova; a da 001 não muda.

```sql
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create policy "admins: ler a própria linha" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create policy "site_content: administradora insere" on public.site_content
  for insert to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));
create policy "site_content: administradora atualiza" on public.site_content
  for update to authenticated
  using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));
revoke delete, truncate on public.site_content from authenticated;
grant insert, update on public.site_content to authenticated;
```

A subconsulta funciona sem `security definer`, porque cada usuário enxerga a própria linha em `admins`.

### D8 — Testes sem backend
- **Vitest:** `test.env` no `vitest.config.ts` fixa o endereço falso, com prioridade sobre o `.env` local. MSW em `https://test.supabase.co` (`/auth/v1/token`, `/recover`, `/user`, `/logout`, `/rest/v1/admins`, `/rest/v1/site_content`).
- **E2E:** novo `scripts/e2e-build.ts` roda o build com `VITE_SUPABASE_URL=https://supabase.e2e.invalid` e chave falsa. Variáveis do processo têm prioridade sobre o `.env`, e o domínio `.invalid` torna impossível tocar o Supabase real. O Playwright intercepta as chamadas.
- **`test:e2e`** passa a chamar esse script. Sessão de teste semeada no `localStorage` (`admin-auth`).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `package.json` | `@supabase/supabase-js` e script `test:e2e` |
| `src/lib/supabase.ts` | novo (D1) |
| `src/admin/auth/*` | `authApi`, `authMessages`, `recoveryHash`, `AuthProvider`, `RequireAdmin` |
| `src/admin/components/*` | novos (D6) |
| `src/admin/AdminLoginPage.tsx`, `AdminEditorPage.tsx` | preenchidos |
| `src/admin/RecoverPasswordPage.tsx`, `NewPasswordPage.tsx` | novos |
| `src/admin/AdminApp.tsx`, `adminRoutes.tsx` | provider, guarda e rotas novas |
| `supabase/migrations/20261108120000_admins.sql` | novo (D7) |
| `scripts/bundle-budget.ts` | proíbe `@supabase/` no JS inicial |
| `scripts/e2e-build.ts` | novo (D8) |
| `CLAUDE.md` §5 | linha "Rotas" passa a "Definido", com as rotas novas |

**Testes existentes que mudam, como consequência do RF-09:** `adminRoutes.test.tsx` e o caso "caminho desconhecido do admin" de `code-splitting.spec.ts` (sem sessão, agora termina no login).

## Dependência nova

| Pacote | Versão | Por quê |
|---|---|---|
| `@supabase/supabase-js` | `2.119.0` (fixa) | Autenticação e leitura/escrita no banco; o backend definido na 000. Só no pacote do admin, onde pesa cerca de 60,7 KB gzip (medido na T01). |

## Riscos

- **Convite para a equipe:** ela precisa aceitar o convite e criar uma conta no Supabase com o mesmo e-mail. Sem isso, a recuperação de senha não chega.
- **E-mail em inglês** e limite de cerca de 2 por hora, conforme decidido.
- **Formato da sessão no E2E:** o SDK pode exigir um token com cara de JWT; o teste usa um token falso nesse formato.
- **Filtros de e-mail** que abrem links podem gastar o link de uso único: a tela de link expirado cobre esse caso.

## Alternativas descartadas

- **PKCE:** não funciona entre aparelhos.
- **Conteúdo embutido no `admin.html` para o monograma:** muda uma garantia da 001 só por um enfeite.
- **Função `security definer` nas políticas:** desnecessária, e amplia a superfície de privilégio.
- **Parâmetro `next` no login:** só existe uma rota protegida, e ele abriria risco de redirecionamento aberto.

## Roteiro manual (T10, feito pelo Thiago)

1. **Authentication → Sign In/Providers:** desligar "Allow new users to sign up".
2. **Authentication → Users → Add user:** criar a conta dela, já confirmada.
3. **Organization → Team:** convidar o e-mail dela; ela aceita o convite.
4. **Authentication → URL Configuration:** Site URL `https://psitiffanybeatriz.pages.dev`; Redirect URLs `https://psitiffanybeatriz.pages.dev/admin/nova-senha` e `http://localhost:5173/admin/nova-senha`.
5. **Authentication, regras de senha:** mínimo de 8 caracteres.
6. **SQL Editor:** colar a migration e depois `insert into public.admins (user_id) select id from auth.users where email = '<e-mail dela>';`.
7. **Cloudflare Pages → Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, depois novo deploy.
8. **Conferência do CA-14 no SQL Editor** (nada fica gravado, por causa do `rollback`). Para cada papel, rodar:

```sql
begin;
set local role authenticated; -- ou anon
select set_config('request.jwt.claims', '{"sub":"<uuid da conta>","role":"authenticated"}', true);
insert into public.site_content (section, data) values ('geral', '{}')
  on conflict (section) do update set updated_at = now() returning section;
rollback;
```

Resultado esperado: administradora grava; conta fora de `admins` e `anon` recebem erro.

## Como cada CA é provado

| CA | Prova |
|---|---|
| CA-01, CA-09 | `adminRoutes.test.tsx`, `RequireAdmin.test.tsx`, E2E |
| CA-02 a CA-07 | testes das páginas com MSW, E2E |
| CA-08, CA-10, CA-11 | `AuthProvider.test.tsx`, E2E |
| CA-12 | `AdminEditorPage.test.tsx` |
| CA-13 | `tests/unit/admins-migration.test.ts` |
| CA-14 | roteiro manual |
| CA-15 | `bundle-budget.test.ts`, `npm run size` |
| CA-16 | `AuthProvider.test.tsx` |
| CA-17 | `tests/e2e/admin-auth.spec.ts` |
