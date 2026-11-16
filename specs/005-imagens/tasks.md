# 005 — Imagens · tarefas

> Status: **aprovado no Gate 2** (2026-11-15)
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Autorizações incluídas ao aprovar este Gate 2:** escrever a migration do Storage (T01, sem aplicar) e criar o `public/_headers` (T07). Nenhuma dependência nova. Aplicar a migration fica com o Thiago (T09).

**Ritmo:** em cada tarefa, testes, vermelho, implementação e verificação completa; parar entre tarefas.

---

### T01 — Migration do Storage `[x] concluída`
- **Faz:** `supabase/migrations/20261115120000_photos.sql` (D5), sem aplicar.
- **Cobre:** CA-09 (parte estática).
- **Testes (`tests/unit/photos-migration.test.ts`):**
  - bucket público com 2 MB e só WebP e JPG;
  - inserir, trocar e apagar condicionados a `admins` e ao bucket;
  - nenhuma política de `select` nem para `anon`;
  - sem `security definer` e sem `service_role`;
  - migrations anteriores iguais.

### T02 — Regra das versões `[x] concluída`
- **Faz:** `src/lib/image.ts` (D1).
- **Cobre:** base de CA-03, CA-04 e CA-10.
- **Testes:**
  - larguras para fotos grandes, médias e pequenas;
  - nome e leitura do nome, ida e volta;
  - `srcset` para endereços da regra e vazio para os de fora;
  - JPG e WebP.

### T03 — Preparação da foto `[x] concluída`
- **Faz:** `preparePhoto.ts` (D2).
- **Cobre:** CA-02 e a lógica de CA-03 e CA-04.
- **Testes (com canvas e `createImageBitmap` simulados):**
  - validação de tipo e tamanho, sem abrir o arquivo;
  - larguras pedidas ao canvas;
  - sem ampliar;
  - fundo creme;
  - WebP, com JPG quando o navegador não gera WebP;
  - falha de leitura vira `unreadable`.

  A prova com foto real fica no E2E (T08).

### T04 — Envio `[x] concluída`
- **Faz:** `photoApi.ts` e `photoMessages.ts` (D3).
- **Cobre:** RF-09 e RF-08 (cliente).
- **Testes (MSW):**
  - caminho e nome gerados, sem o nome original;
  - tipo, cache e `upsert: false`;
  - endereço público da maior versão;
  - cada erro classificado, sem texto do servidor;
  - falha numa versão é falha do envio.

### T05 — "Trocar foto" no editor `[x] concluída`
- **Faz:** `PhotoField` e contagem de envios no editor (D4).
- **Cobre:** CA-01, CA-02, CA-05 a CA-08.
- **Testes:**
  - botão com o nome certo e o tipo de arquivo aceito;
  - progresso anunciado;
  - "Salvar e publicar" e "Descartar" indisponíveis durante o envio;
  - miniatura, largura e altura novas, e o `alt` mantido com o aviso;
  - aviso some ao editar o `alt`;
  - cada erro junto do campo, com a foto anterior mantida;
  - sessão expirada leva ao login;
  - "Descartar" volta à foto anterior.

### T06 — Site com `srcset` e `sizes` `[x] concluída`
- **Faz:** `Photo` e as três seções (D7).
- **Cobre:** CA-10.
- **Testes:**
  - `srcset` e `sizes` de cada lugar;
  - foto principal com prioridade e as outras preguiçosas;
  - endereço fora da regra sem `srcset`;
  - JS inicial do site medido.

### T07 — Build copia as fotos `[x] concluída`
- **Faz:** `src/prerender/photos.ts`, `binaryFiles` na pré-renderização, gravação em `dist/fotos/`, `public/_headers` e `og:image` absoluto (D6).
- **Cobre:** CA-11 e CA-12.
- **Testes:**
  - só fotos do bucket são copiadas;
  - as três versões são baixadas, uma vez por foto;
  - `src` reescrito;
  - falha com conteúdo obrigatório quebra o build e, sem ele, avisa;
  - arquivos gravados em `dist/fotos/`;
  - cabeçalho de cache;
  - `og:image` absoluto, e sem `SITE_URL` sai sem a tag.

### T08 — E2E `[x] concluída`
- **Faz:** Storage falso e foto de teste com EXIF (D8); `tests/e2e/admin-photos.spec.ts`.
- **Cobre:** CA-01, CA-03, CA-04, CA-05 e CA-13 no navegador.
- **Testes (Pixel 7, iPhone 13, 1440px):**
  - foto de 4000×3000 em retrato com localização chega ao Storage com até 1600 px, em pé, sem EXIF, em WebP ou JPG;
  - as três versões;
  - foto pequena não ampliada;
  - salvar e recarregar mostra a nova;
  - escolher a mesma foto de novo funciona (o jsdom não reproduz o navegador nisso; vindo da T05);
  - axe, rolagem e toque no campo de foto;
  - `srcset` no site com conteúdo de teste.

### T09 — Configuração real e fechamento `[ ] pendente`
- **Faz:** o Thiago segue o roteiro do `plan.md`; quadro de CAs.
- **Cobre:** CA-09, CA-11, CA-12 e CA-13 no ambiente real.
- **Verificação:** `npm run check`, `format:check` e E2E completos; foto real publicada e servida de `/fotos/`; Lighthouse com fotos.
