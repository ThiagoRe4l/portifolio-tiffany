# 004 — Admin: editor do conteúdo · tarefas

> Status: **concluída** (2026-11-13) · Gate 2 aprovado em 2026-11-10
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Autorizações incluídas ao aprovar este Gate 2:** escrever a migration (T01, sem aplicar). Nenhuma dependência nova. Aplicar a migration e configurar o Supabase e o Cloudflare ficam com o Thiago (T09).

**Ritmo:** em cada tarefa, testes, vermelho, implementação e verificação completa; parar entre tarefas.

---

### T01 — Migration de publicação `[x] concluída`
- **Faz:** `supabase/migrations/20261110120000_publish.sql` (D8), sem aplicar.
- **Cobre:** CA-09 (parte do banco), CA-12 e CA-13.
- **Testes (`tests/unit/publish-migration.test.ts`):**
  - `updated_at` e `updated_by` preenchidos pelo banco;
  - gatilho de deploy por linha, depois de inserir ou atualizar;
  - endereço lido do Vault, e sem endereço nada acontece;
  - funções em `private`, com `search_path` vazio e execução revogada;
  - agendamento anual;
  - nenhum endereço de deploy, `service_role` ou e-mail no arquivo;
  - as migrations da 001 e da 003 continuam iguais.

### T02 — Árvore do schema, rascunho e normalização `[x] concluída`
- **Faz:** `schemaTree.ts`, `draft.ts`, `normalize.ts` e `validation.ts` (D1–D3). O `walkSchema` de teste ficou independente, para servir de comparação.
- **Cobre:** base de CA-03, CA-05, CA-06, CA-07 e CA-08.
- **Testes:**
  - árvore de cada seção;
  - foto só com o texto alternativo;
  - leitura e escrita por caminho, imutáveis;
  - mover, remover e adicionar respeitando os limites;
  - item novo válido pelo schema;
  - `isDirty`;
  - telefone e Instagram em formatos comuns;
  - erros por caminho;
  - textos provisórios.

### T03 — Leitura e gravação `[x] concluída`
- **Faz:** `contentApi.ts` e `editorMessages.ts` (D4).
- **Cobre:** CA-09 (cliente), CA-11 e CA-15 (dados).
- **Testes (MSW):**
  - leitura das 8 seções, com e sem linha;
  - formato antigo completado pelo padrão;
  - falha de leitura sem repetição;
  - `update` condicionado ao `updated_at`;
  - `insert` sem linha;
  - conflito nos dois caminhos;
  - cada erro classificado, sem texto do servidor.

### T04 — Campos `[x] concluída`
- **Faz:** os campos de D5, `CharCounter`, `ListField`, foto e ícone.
- **Cobre:** CA-04, CA-05, CA-06 e parte do CA-16.
- **Testes:**
  - controle certo para cada tipo;
  - contagem e anúncio ao passar do limite;
  - lista com teclado (mover, remover e adicionar, com o foco acompanhando o item);
  - limites com explicação;
  - colar com quebras de linha;
  - `data-field-path` em todos os controles.

### T05 — Formulário da seção e cobertura `[x] concluída`
- **Faz:** `SectionForm` e `FieldRenderer`.
- **Cobre:** CA-03 (teste obrigatório) e CA-07.
- **Testes:**
  - para cada seção, cada campo do schema tem um controle;
  - um schema de teste com um campo novo aparece sem mudar o admin;
  - aviso de texto provisório;
  - peso do pacote do admin medido; JS inicial do site igual.
- **Medição (2026-11-10):** o formulário, com o Zod, os schemas e o conteúdo padrão, acrescenta cerca de 35 KB gzip ao admin (build à parte: 112,3 → 147,5 KB, incluindo o React). Só quem abre `/admin` baixa. JS inicial do site: 74,7 KB, sem mudança.

### T06 — Tela do editor e "Salvar e publicar" `[x] concluída`
- **Faz:** `AdminEditorPage`, `EditorHeader`, `SectionPicker`, `ActionBar`, `Toast` e `useEditorContent` (D6).
- **Cobre:** CA-01, CA-02, CA-08, CA-10, CA-11 e CA-15.
- **Testes (MSW):**
  - carregamento, erro e "Tentar novamente";
  - seção pelo endereço;
  - status do cabeçalho;
  - salvar com erro (resumo e foco) e com sucesso (aviso e status);
  - cada falha;
  - conflito;
  - "Descartar".

### T07 — Alterações não salvas `[x] concluída`
- **Faz:** `ConfirmDialog`, interceptação de troca de seção, "Descartar", "Ver site" e "Sair", `beforeunload`, e o aviso de sessão expirada com alterações perdidas (D6, D7).
- **Cobre:** CA-14 e o RF-16 (sessão expirada).
- **Testes:**
  - cada saída com e sem alteração;
  - foco na janela e Esc;
  - `beforeunload` só com alteração;
  - aviso no login quando a sessão acaba com alterações.

### T08 — E2E `[x] concluída`
- **Faz:** conteúdo em memória no Supabase falso; `tests/e2e/admin-editor.spec.ts`.
- **Cobre:** CA-16 e os fluxos de CA-01, CA-02, CA-05, CA-08 e CA-14 no navegador.
- **Testes (Pixel 7, iPhone 13, 1440px):**
  - editar, salvar e recarregar;
  - erro de validação;
  - lista só com teclado;
  - janela de alterações não salvas;
  - axe nas 8 seções;
  - rolagem de 320 a 1440px;
  - toque ≥ 48px;
  - console limpo.

### T09 — Configuração real e fechamento `[x] concluída`
- **Faz:** o Thiago segue o roteiro do `plan.md`; quadro de CAs.
- **Cobre:** CA-09, CA-12 e CA-13 no ambiente real.
- **Verificação:** `npm run check`, `format:check` e E2E completos; editar e publicar no site real.
- **Conferido pelo Thiago (2026-11-13):** deploy hook, Vault, migration, `REQUIRE_REMOTE_CONTENT=true` e alerta no Cloudflare; gravação com autor e data preenchidos pelo banco; `private.request_deploy()` com resposta 200; editar no admin publicado dispara um deploy novo e o texto chega ao site; agendamento anual no `cron.job`.
- **Achado no teste real:** o segredo do Vault foi criado com o endereço e o nome trocados (e com o comando `curl` inteiro). A função não achava `cloudflare_deploy_hook`, só registrava o aviso e não chamava o Cloudflare, por isso as gravações não publicavam. Corrigido no banco; o roteiro do `plan.md` ficou mais explícito. Recomendado ao Thiago trocar o deploy hook, porque o endereço ficou um tempo no campo de nome, sem criptografia.

---

## Quadro de critérios de aceite

Estado em 2026-11-13: Vitest 1318/1318; `npm run check` e `format:check` sem erros; E2E 412 aprovados e 5 pulados de propósito (site); JS inicial do site 74,7 KB gzip (sem mudança); pacote do admin 127,8 KB gzip.

| CA | Situação | Prova |
|---|---|---|
| CA-01 | ok | `AdminEditorPage.editor.test.tsx` (status); E2E ("agora" e recarregar) |
| CA-02 | ok | `AdminEditorPage.editor.test.tsx` (endereço, seção inválida); E2E |
| CA-03 | ok (obrigatório) | `SectionForm.coverage.test.tsx`, comparado com o `walkSchema` independente |
| CA-04 | ok | `fields.test.tsx` (contagem e anúncio) |
| CA-05 | ok | `fields.test.tsx`; E2E (lista só com o teclado) |
| CA-06 | ok | `fields.test.tsx`, `normalize.test.ts`; telefone gravado só com dígitos (editor e E2E) |
| CA-07 | ok | `SectionForm.test.tsx` (aviso de texto provisório) |
| CA-08 | ok | `AdminEditorPage.editor.test.tsx` (resumo e foco); E2E |
| CA-09 | ok | `contentApi.test.ts`, `publish-migration.test.ts` e teste real (autor, data e deploy) |
| CA-10 | ok | `AdminEditorPage.editor.test.tsx` (rede, serviço fora, conflito) |
| CA-11 | ok | `contentApi.test.ts`; `AdminEditorPage.editor.test.tsx` |
| CA-12 | ok | `load.test.ts` (001) e `REQUIRE_REMOTE_CONTENT=true` no Cloudflare |
| CA-13 | ok | `publish-migration.test.ts` e `cron.job` no banco real |
| CA-14 | ok | `AdminEditorPage.unsaved.test.tsx`; E2E (janela real, Esc e fechar a aba) |
| CA-15 | ok | `contentApi.test.ts`; `AdminEditorPage.editor.test.tsx` (carregamento) |
| CA-16 | ok | `admin-editor.spec.ts` nos três aparelhos |

### Desvios e decisões registrados
- `walkSchema` dos testes mantido independente da árvore do admin (T02).
- Dica do telefone no admin troca a do schema: "Com DDD. Ex.: (11) 99999-8888" (T06).
- E2E local com 3 processos: o padrão derrubava o WebKit com a carga (T08). No CI, o padrão segue.
- Teste rápido do admin (`smoke.spec.ts`) passou a simular o Supabase: ele falhava às vezes (T06).
