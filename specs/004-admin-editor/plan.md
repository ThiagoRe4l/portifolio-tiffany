# 004 — Admin: editor do conteúdo · plano técnico

> Status: **concluído** (2026-11-13) · Gate 2 aprovado em 2026-11-10
> Data: 2026-11-10 · Spec: `spec.md` (Gate 1 aprovado em 2026-11-10, com as seis recomendações)

## Decisões do Gate 1

1. **Deploy:** gatilho no banco, com `pg_net` e o endereço do deploy hook no Vault do Supabase.
2. **Pré-visualização:** fora desta spec.
3. **Fotos:** miniatura e texto alternativo; "Trocar foto" na 005.
4. **Telefone e Instagram:** formato livre, normalizado ao salvar.
5. **Ano novo:** novo deploy automático em 1º de janeiro, com `pg_cron`.
6. **Dois aparelhos:** gravação recusada quando a seção mudou em outro lugar.

## Arquitetura

```
/admin (RequireAdmin, 003)
└─ AdminEditorPage
   ├─ useEditorContent        lê as 8 seções (contentApi.loadSections) e completa com o padrão
   ├─ EditorHeader            "Editar site", status, "Ver site", "Sair"
   ├─ SectionPicker           <select> + "Seção do site · N de 8"; seção em ?secao=
   ├─ SectionForm             percorre a árvore do schema (schemaTree) e desenha cada campo
   │  └─ FieldRenderer        um componente por tipo de campo (D5)
   ├─ ActionBar               "Descartar" / "Salvar e publicar", fixa no rodapé
   ├─ Toast                   avisos de salvar (região anunciada)
   └─ ConfirmDialog           "Descartar alterações?" (<dialog> nativo)

Banco (migration nova)
site_content ── antes de gravar: updated_at = now(), updated_by = auth.uid()
             └─ depois de gravar: private.request_deploy() → pg_net → deploy hook (Vault)
pg_cron (1º de janeiro) ───────→ private.request_deploy()
```

## Decisões técnicas

### D1 — Árvore do schema (`src/admin/editor/schemaTree.ts`)
Função pura que transforma o schema Zod de uma seção numa árvore de nós: `{ key, path, meta, kind, children?, item? }`. Faz o mesmo percurso de `tests/support/walkSchema.ts`, mas no código de produção. O helper de teste continua independente, de propósito: os testes comparam as duas implementações, o que prova mais do que comparar a árvore com ela mesma (ajuste da T02). Dentro de uma foto, só o texto alternativo vira campo (decisão 3).

O formulário recebe o schema por parâmetro, e não por nome de seção. Assim, o teste de cobertura monta também um schema de teste com um campo novo e confirma que ele aparece sem mudar o admin (CA-03).

### D2 — Rascunho (`src/admin/editor/draft.ts`)
Funções puras:
- `setAt(value, path, next)` e `getAt(value, path)`: leitura e escrita imutáveis por caminho (`['trabalho', 'cards', 2, 'title']`);
- `moveItem`, `removeItem` e `addItem`;
- `isDirty(draft, saved)`: comparação estrutural.

O item novo de lista nasce do próprio schema: texto `''`, ícone = primeiro da lista, interruptor `false`, foto vazia com dimensões 1×1 e `alt` vazio.

Estado da seção num `useReducer`, com o valor salvo e o rascunho lado a lado.

### D3 — Normalização e validação (`normalize.ts`, `validation.ts`)
- **Antes de validar, a árvore é percorrida e normaliza:**
  - telefone: só dígitos, com `55` na frente quando vierem 10 ou 11 dígitos;
  - Instagram: tira `@`, `https://instagram.com/`, `www.` e a barra final.
- **Ao carregar,** o telefone aparece formatado (`+55 (11) 99999-8888`, com `formatPhoneBR`).
- **Validação:** `sectionSchemas[key].safeParse(rascunho)`. Os `issues` viram um mapa `caminho → mensagem`. O valor gravado é a **saída** do parse, com os espaços das pontas já removidos.
- **Textos provisórios:** o mesmo padrão de `findPlaceholders` (001), aplicado campo a campo.
- **Colar texto com quebras de linha num campo de uma linha:** o `onPaste` troca as quebras por espaço, porque o navegador as apagaria e juntaria as palavras.

### D4 — Leitura e gravação (`src/admin/editor/contentApi.ts`)
**Leitura.** `loadSections()` lê `section, data, updated_at` de `site_content`, sem repetição automática (a tela tem "Tentar novamente", como na 003). Cada seção é completada com `mergeWithDefaults(defaultContent[key], data)` (001). Seção sem linha vem com `updatedAt: null`.

**Gravação.** `saveSection(key, data, expectedUpdatedAt)`:
- com linha existente: `update … where section = key and updated_at = expectedUpdatedAt`, devolvendo o novo `updated_at`. Nenhuma linha atualizada é **conflito** (decisão 6);
- sem linha: `insert`. Chave duplicada (`23505`) também é conflito.

**Resultado classificado,** sem texto do servidor: `ok`, `conflict`, `network`, `sessionExpired` (JWT vencido ou recusado), `forbidden` (RLS), `unavailable` (5xx) ou `unknown`. As frases ficam em `editorMessages.ts`.

### D5 — Campos (`src/admin/editor/fields/`)

| Tipo | Controle |
|---|---|
| `text` | `TextField` (003) + contagem |
| `longText` | `TextAreaField` (novo) + contagem; altura cresce com o texto |
| `group` | `<fieldset>` com `<legend>` |
| `list` | `ListField`: itens numerados; por item, "Mover para cima", "Mover para baixo" e "Remover"; "Adicionar item" no fim |
| `icon` | `<select>` com os nomes de `ICONS` e o desenho ao lado, com o `Icon` do site |
| `toggle` | caixa de marcar nativa |
| `phone` | `TextField` com `type="tel"` e `inputMode="tel"` |
| `instagram` | `TextField` com `autoCapitalize="none"` |
| `email` | `TextField` com `type="email"` |
| `mapUrl` | `TextField` com `type="url"` |
| `photo` | miniatura (ou bloco de espera) + `TextField` do texto alternativo |

- **Contagem de caracteres** (`CharCounter`): visível sempre. Passa a terracota perto do limite (90%). Uma região anunciada fala só quando o limite é ultrapassado.
- **Identificação dos campos:** cada controle leva `data-field-path` com o caminho do schema. É assim que o teste de cobertura e o E2E acham cada campo.
- **Botões de lista:** com nome acessível completo ("Mover Card 2 para cima"). Depois de mover, o foco acompanha o item.

### D6 — Tela e estado (`AdminEditorPage`, `useSectionEditor`)
- **Seção aberta:** em `?secao=` (`useSearchParams`). Valor inválido vira `geral`, com `replace`.
- **Status do cabeçalho:**
  - "Alterações não salvas" quando há alteração;
  - senão, "Última publicação: " + a maior `updated_at` das seções, no formato `10/11/2026 às 14:32`;
  - "agora" logo depois de salvar;
  - "ainda não publicado" quando nenhuma seção tem linha.
- **Salvar:** valida (D3). Com erro: resumo no topo do formulário ("2 campos precisam de ajuste", com link para o primeiro) e foco no primeiro campo com erro. Sem erro: grava (D4), com o botão ocupado. O aviso temporário fica numa região `role="status"` (sucesso, some em 5 s) ou `role="alert"` (erro, fica até fechar).
- **Sessão expirada ao salvar:** a sessão é encerrada como na 003, e o login mostra um aviso novo do `AuthProvider`: "Sua sessão expirou e as alterações não salvas foram perdidas. Entre novamente." O editor avisa o provider de que há alterações não salvas (`setUnsavedChanges`).

### D7 — Alterações não salvas
- **Confirmação:** `ConfirmDialog` com o `<dialog>` nativo e `showModal()`. O navegador cuida do foco preso, do Esc e do fundo inerte. Como o jsdom não tem `showModal`, a configuração dos testes ganha um substituto, junto dos outros (`tests/setup`).
- **Trocar de seção, "Descartar", "Ver site" e "Sair":** com alteração, perguntam antes de seguir. "Ver site" segue como link comum: o clique é interceptado só quando há alteração.
- **Fechar ou recarregar a aba:** `beforeunload` registrado só enquanto há alteração.

### D8 — Banco (`supabase/migrations/20261110120000_publish.sql`)

```sql
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;

-- Quem grava e quando: preenchido pelo banco, nunca pelo navegador.
create function private.stamp_site_content() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

create trigger site_content_stamp before insert or update on public.site_content
  for each row execute function private.stamp_site_content();

-- Dispara o deploy do Cloudflare. O endereço fica no Vault; sem ele, não faz nada.
create function private.request_deploy() returns void
  language plpgsql security definer set search_path = '' as $$
declare
  hook text;
begin
  select decrypted_secret into hook from vault.decrypted_secrets
    where name = 'cloudflare_deploy_hook';
  if hook is null then
    raise warning 'cloudflare_deploy_hook ausente no Vault: deploy não disparado';
    return;
  end if;
  perform net.http_post(url := hook, body := '{}'::jsonb);
end $$;

create function private.site_content_saved() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform private.request_deploy();
  return null;
end $$;

create trigger site_content_publish after insert or update on public.site_content
  for each row execute function private.site_content_saved();

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

-- 1º de janeiro, 00:05 em Brasília (03:05 UTC): o {ano} do rodapé muda sem edição.
select cron.schedule('deploy-ano-novo', '5 3 1 1 *', 'select private.request_deploy()');
```

- **Por que `security definer` aqui** (a 003 evitou): ler o Vault exige privilégios que a conta dela não tem. As funções ficam no esquema `private`, que a API não expõe, com `search_path` vazio e execução revogada de todos os papéis do cliente.
- **Gatilho por linha, não por comando:** um `update` recusado por conflito não atualiza linha nenhuma e, por isso, não dispara deploy.
- **Requisição pós-commit:** o `pg_net` só envia a requisição depois do commit, então uma gravação desfeita (como nos testes do CA-14 da 003, com `rollback`) não publica nada.
- **O endereço do deploy hook** é inserido à mão no Vault pelo Thiago (roteiro). Nunca aparece no repositório.

### D9 — Testes sem backend
- **Vitest:** MSW em `https://test.supabase.co/rest/v1/site_content` (GET, PATCH e POST), reaproveitando `tests/support/supabaseAuth.ts`.
- **E2E:** `tests/e2e/support/supabase.ts` ganha as oito seções em memória: o GET devolve, e PATCH/POST gravam e devolvem o novo `updated_at`. Assim o E2E salva e recarrega de verdade.
- **Migration:** teste estático, como na 001 e na 003. O comportamento real é conferido pelo roteiro.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/admin/editor/schemaTree.ts`, `draft.ts`, `normalize.ts`, `validation.ts` | novos (D1–D3) |
| `src/admin/editor/contentApi.ts`, `editorMessages.ts` | novos (D4) |
| `src/admin/editor/fields/*` | novos (D5) |
| `src/admin/editor/{SectionPicker,SectionForm,EditorHeader,ActionBar,Toast,ConfirmDialog}.tsx` | novos (D6–D7) |
| `src/admin/AdminEditorPage.tsx` | passa a montar o editor (o cabeçalho da 003 vira `EditorHeader`) |
| `src/admin/auth/AuthProvider.tsx`, `authMessages.ts` | aviso de sessão expirada com alterações perdidas |
| `src/admin/components/TextField.tsx` | aceita contagem de caracteres e `onPaste` |
| `tests/setup/*` | substituto de `showModal` para o jsdom |
| `tests/e2e/support/supabase.ts` | conteúdo em memória |
| `supabase/migrations/20261110120000_publish.sql` | novo (D8) |

**Dependências novas:** nenhuma. O Zod já é dependência e passa a entrar no pacote do admin, como previsto na 001.

## Riscos

- **Privilégios dos gatilhos:** se o Supabase exigir permissões que o teste estático não enxerga, o roteiro manual pega (gravar pelo admin e ver o deploy no Cloudflare). A correção seria ajustar `grant`/`owner` na própria migration.
- **Deploy que falha depois de salvar:** o admin não sabe. Mitigação: notificações de deploy por e-mail no Cloudflare (roteiro).
- **Várias gravações seguidas:** um deploy por gravação. O plano gratuito do Cloudflare permite 500 builds por mês e roda um de cada vez; para o uso dela, sobra.
- **Pacote do admin maior** (Zod, schemas e conteúdo padrão): cerca de 35 KB gzip a mais, medido na T05, sem efeito no site.
- **`<dialog>` em navegadores antigos:** suportado no Safari desde a versão 15.4 (2022); aceitável para o celular dela.

## Alternativas descartadas

- **Formulário escrito à mão por seção:** fere a regra 6.5 do CLAUDE.md e o teste obrigatório de cobertura.
- **Biblioteca de formulários** (React Hook Form, Formik): o formulário é gerado pelo schema, e o estado é pequeno; um `useReducer` basta, sem dependência nova.
- **Arrastar para reordenar:** difícil de tornar acessível e de usar no celular; botões resolvem.
- **Edge Function para o deploy:** exigiria a CLI do Supabase (decisão 1).
- **`upsert` simples:** não detecta a edição em dois aparelhos (decisão 6).

## Roteiro manual (T09, feito pelo Thiago)

1. **Cloudflare → o projeto → Settings → Builds → Deploy hooks → Add deploy hook:** nome "admin", branch `main`. Copiar o endereço gerado (ele é secreto).
2. **Supabase → SQL Editor:**
   `select vault.create_secret('<endereço do deploy hook>', 'cloudflare_deploy_hook');`
   Primeiro o endereço, depois o nome, e **só o endereço** (`https://api.cloudflare.com/...`), sem o `curl -X POST` que o Cloudflare mostra. Na aplicação real os dois foram trocados, e o deploy não disparava sem nenhum erro aparente (ver T09). Conferência: `select name, left(decrypted_secret, 30) from vault.decrypted_secrets;` e o teste direto `select private.request_deploy();`.
3. **Supabase → SQL Editor:** colar e rodar `supabase/migrations/20261110120000_publish.sql`.
4. **Cloudflare → Variables:** `REQUIRE_REMOTE_CONTENT` = `true` em Production.
5. **Cloudflare → Notifications:** alerta por e-mail para deploy com falha.
6. **Conferência:**
   - no admin publicado, mudar um texto e salvar;
   - em Cloudflare → Deployments, aparece um deploy novo, disparado pelo hook;
   - em poucos minutos, o texto está no site;
   - no SQL Editor, `select * from cron.job;` mostra `deploy-ano-novo`;
   - os blocos do CA-14 da 003 continuam dando os mesmos resultados.

## Como cada CA é provado

| CA | Prova |
|---|---|
| CA-01, CA-02 | `AdminEditorPage.test.tsx`, E2E |
| CA-03 | `SectionForm.coverage.test.tsx` (teste obrigatório) |
| CA-04 a CA-07 | testes dos campos e de `normalize.test.ts`, E2E |
| CA-08, CA-10, CA-11 | `AdminEditorPage.test.tsx` (MSW), `contentApi.test.ts` |
| CA-09 | `contentApi.test.ts`, `publish-migration.test.ts` e roteiro manual |
| CA-12, CA-13 | `publish-migration.test.ts` e roteiro manual |
| CA-14 | `unsavedChanges.test.tsx`, E2E |
| CA-15 | `useEditorContent.test.tsx` |
| CA-16 | `tests/e2e/admin-editor.spec.ts` |
