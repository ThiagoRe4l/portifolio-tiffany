# 004 — Admin: editor do conteúdo · tarefas

> Status: **aprovado no Gate 2** (2026-11-10)
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Autorizações incluídas ao aprovar este Gate 2:** escrever a migration (T01, sem aplicar). Nenhuma dependência nova. Aplicar a migration e configurar o Supabase e o Cloudflare ficam com o Thiago (T09).

**Ritmo:** em cada tarefa, testes, vermelho, implementação e verificação completa; parar entre tarefas.

---

### T01 — Migration de publicação `[ ] pendente`
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

### T02 — Árvore do schema, rascunho e normalização `[ ] pendente`
- **Faz:** `schemaTree.ts`, `draft.ts`, `normalize.ts` e `validation.ts` (D1–D3); `walkSchema` de teste passa a usar a árvore.
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

### T03 — Leitura e gravação `[ ] pendente`
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

### T04 — Campos `[ ] pendente`
- **Faz:** os campos de D5, `CharCounter`, `ListField`, foto e ícone.
- **Cobre:** CA-04, CA-05, CA-06 e parte do CA-16.
- **Testes:**
  - controle certo para cada tipo;
  - contagem e anúncio ao passar do limite;
  - lista com teclado (mover, remover e adicionar, com o foco acompanhando o item);
  - limites com explicação;
  - colar com quebras de linha;
  - `data-field-path` em todos os controles.

### T05 — Formulário da seção e cobertura `[ ] pendente`
- **Faz:** `SectionForm` e `FieldRenderer`.
- **Cobre:** CA-03 (teste obrigatório) e CA-07.
- **Testes:**
  - para cada seção, cada campo do schema tem um controle;
  - um schema de teste com um campo novo aparece sem mudar o admin;
  - aviso de texto provisório;
  - peso do pacote do admin medido; JS inicial do site igual.

### T06 — Tela do editor e "Salvar e publicar" `[ ] pendente`
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

### T07 — Alterações não salvas `[ ] pendente`
- **Faz:** `ConfirmDialog`, interceptação de troca de seção, "Descartar", "Ver site" e "Sair", `beforeunload`, e o aviso de sessão expirada com alterações perdidas (D6, D7).
- **Cobre:** CA-14 e o RF-16 (sessão expirada).
- **Testes:**
  - cada saída com e sem alteração;
  - foco na janela e Esc;
  - `beforeunload` só com alteração;
  - aviso no login quando a sessão acaba com alterações.

### T08 — E2E `[ ] pendente`
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

### T09 — Configuração real e fechamento `[ ] pendente`
- **Faz:** o Thiago segue o roteiro do `plan.md`; quadro de CAs.
- **Cobre:** CA-09, CA-12 e CA-13 no ambiente real.
- **Verificação:** `npm run check`, `format:check` e E2E completos; editar e publicar no site real.
