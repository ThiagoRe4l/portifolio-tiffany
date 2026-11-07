# 001 — Modelo de conteúdo: tarefas

> Status: **concluída** em 2026-11-07 (Gate 2 aprovado em 2026-11-06)
> Legenda: `[ ] pendente` · `[~] testes escritos` · `[x] concluída`

**Autorizações necessárias além do Gate 3 de cada tarefa:**
- **T01** instala o `zod@4.6.7` (`npm install -E zod`).
- **T11** cria a migration. Você aplica no painel do Supabase e me autoriza a verificar com `curl` usando a chave pública.
- **T12** cria um workflow novo no GitHub Actions. Ele só roda depois do seu push e quando as variáveis existirem.

Ordem: T01 → T02 → T03 vêm primeiro (o contrato). T04 e T05 são independentes. T06 → T07 → T08 → T09 → T10 formam a sequência de pré-renderização. T11 e T12 podem ser feitas a qualquer momento. T13 fecha a spec.

---

### T01 — Zod e construtores de campo `[x] concluída` (2026-11-06)
- **Resultado**: `zod@4.6.7` instalado (exato). 59 casos novos verdes; suíte 225/225; `npm run check` ok (lint, typecheck, build, JS inicial 67,4 KB, sem Zod no site). Desvios: tipo de campo `number` a mais (largura e altura dentro da foto); o `.env.example` voltou às duas linhas exigidas pelo teste da 000 (as variáveis só de build ficam documentadas no plano).
- **Faz**:
  - instala o `zod`;
  - cria `src/content/fields.ts`: o registry `fieldMeta`, os construtores (`text`, `longText`, `photo`, `icon`, `toggle`, `list`, `group`, `phone`, `email`, `instagram`, `mapUrl`) e as mensagens de erro em português;
  - cria `src/content/icons.ts`.
- **Cobre**: CA-03, CA-05, CA-06, CA-07 (no nível de cada construtor).
- **Testes** (`src/content/fields.test.ts`):
  - cada construtor registra `{ label, kind }` e os limites;
  - um `text` acima do máximo é recusado com "Máximo de N caracteres";
  - um obrigatório só com espaços é recusado;
  - um opcional aceita `''`;
  - foto sem `alt` é recusada e foto com `src: ''` é aceita;
  - foto com `src` `http:` ou `javascript:` é recusada;
  - telefone sem 55, com letras ou com 9 dígitos é recusado;
  - Instagram com `@` ou URL é recusado;
  - e-mail inválido é recusado;
  - mapa fora de `https://www.google.com/maps/embed?` é recusado;
  - ícone fora da lista é recusado;
  - `list` fora do mínimo ou do máximo é recusada;
  - `group` com chave desconhecida é recusado;
  - duas chamadas do mesmo construtor geram instâncias diferentes.

### T02 — Schemas das 8 seções `[x] concluída` (2026-11-06)
- **Resultado**: 149 casos verdes; suíte 374/374; `npm run check` ok (JS inicial 67,4 KB). Desvio: o teste "rótulo não é o nome em inglês" passou a ignorar as chaves de seção, que já são em português (`geral`, `contato`); rótulos como "Botão do WhatsApp", "Registro (CRP)" e "Itens do menu" evitam repetir a chave.
- **Faz**: `src/content/schema.ts` (`SECTION_KEYS`, os schemas de seção e `siteContentSchema`) e `src/content/types.ts`, ambos seguindo a tabela do plano.
- **Cobre**: CA-01, CA-02, CA-04, CA-07.
- **Testes** (`src/content/schema.test.ts`):
  - existem exatamente as 8 chaves, na ordem da spec;
  - a forma de cada seção bate com uma tabela esperada (caminho → `kind`) escrita no teste a partir do RF-02;
  - **percorre o schema inteiro**: todo campo, inclusive dentro de listas e grupos, tem `label` em português (não vazio, diferente do nome em inglês);
  - limites de exemplo (`inicio.title` 90, `geral.seoTitle` 60, `geral.seoDescription` 160, `trabalho.cards` 1–8, `espaco.photos` 1–9) recusam com uma mensagem que contém a seção, o campo e o limite (via `formatIssues`, que nasce aqui em `transform.ts`);
  - `geral.name` e `geral.crp` são obrigatórios (ética).
- **Apoio**: `tests/support/walkSchema.ts`, que percorre um schema Zod e devolve `[caminho, meta]`. Será reutilizado pelo teste de cobertura do admin na 004.

### T03 — Conteúdo padrão e conteúdo de teste `[x] concluída` (2026-11-06)
- **Resultado**: 69 casos verdes; suíte 443/443; `npm run check` ok (JS inicial 67,4 KB). Desvios: limite das etiquetas (`eyebrow`) subiu de 40 para 60, porque a etiqueta aprovada do hero tem 43 caracteres (plano e teste da T02 atualizados); iniciais padrão `NN` declaradas como placeholder (`PLACEHOLDER_INITIALS`), pois o campo só aceita letras — o aviso de placeholders da T06 deve acusá-las junto com o número fictício.
- **Faz**: `src/content/defaults.ts` e `tests/fixtures/content.ts` (`makeUniqueContent()`).
- **Cobre**: CA-08, CA-14.
- **Testes**:
  - `src/content/defaults.test.ts`:
    - o padrão passa no `siteContentSchema`;
    - cada texto aprovado do CLAUDE.md §8 aparece **exatamente** no campo certo (hero, botões, "Olá, eu sou a [Nome].", formação, os 4 títulos de card, título e etiquetas da atuação, público, os 3 passos, "Vamos conversar?", a mensagem do WhatsApp);
    - todo texto que não está nessa lista e não é rótulo de interface listado no plano está entre `[colchetes]`. Esse é o guardião do "não inventar".
  - `tests/unit/content-fixture.test.ts`:
    - o conteúdo de teste passa no schema;
    - todos os textos são únicos entre si;
    - nenhum texto coincide com um texto do padrão;
    - toda lista tem pelo menos 2 itens (quando o máximo permite).

### T04 — Link do WhatsApp `[x] concluída` (2026-11-06)
- **Resultado**: 8 casos verdes; suíte 451/451; `npm run check` ok. Sem desvios.
- **Faz**: `src/lib/whatsapp.ts`.
- **Cobre**: CA-17 (teste obrigatório do projeto).
- **Testes** (`src/lib/whatsapp.test.ts`):
  - número e mensagem padrão geram o link exato;
  - uma mensagem com acentos, espaços, `&`, `?`, `#`, `+`, quebra de linha e emoji é codificada e, ao ler de volta com `URL.searchParams.get('text')`, volta idêntica;
  - mensagem vazia gera o link sem `?text=`;
  - número com caracteres que não são dígitos gera erro, porque o schema já devia ter barrado.

### T05 — `ContentProvider`, `useContent()` e conteúdo embutido `[x] concluída` (2026-11-06)
- **Resultado**: 10 casos verdes; suíte 461/461; `npm run check` ok. Prova de mutação: sem o escape, o teste de texto malicioso falha. Extra: `serializeForScript` exportado para o JSON-LD da T07 usar o mesmo escape.
- **Faz**: `src/content/ContentProvider.tsx` e `src/content/embedded.ts`.
- **Cobre**: CA-13 e o RNF de segurança (escape).
- **Testes**:
  - `src/content/ContentProvider.test.tsx`:
    - um componente dentro do provider recebe o conteúdo de teste;
    - fora do provider, o erro diz "useContent precisa estar dentro de <ContentProvider>".
  - `src/content/embedded.test.ts`:
    - a ida e volta (serializar → colocar num `<script>` do jsdom → `readEmbeddedContent`) devolve o mesmo objeto;
    - um texto com `</script><script>alert(1)</script>`, `<!--`, `&` e U+2028 não aparece cru na saída e volta idêntico;
    - sem o `<script id="site-content">`, o erro é claro;
    - JSON corrompido gera erro claro.

### T06 — Leitura no build (Supabase ou padrão) `[x] concluída` (2026-11-07)
- **Resultado**: 32 casos verdes; suíte 493/493; `npm run check` ok. Provas de mutação: sem a nova tentativa, 2 testes falham; sem a falha obrigatória com `REQUIRE_REMOTE_CONTENT`, 4 falham. Acréscimo: configuração pela metade (só URL ou só chave) e URL inválida sempre falham.
- **Faz**: `src/content/load.ts` e `src/content/transform.ts` (`mergeWithDefaults`, `resolveYear`, `findPlaceholders`).
- **Cobre**: CA-09, CA-10 e os casos de borda de placeholders, seção apagada e `{ano}`.
- **Testes** (`src/content/load.test.ts`, com MSW):
  - **sem variáveis**: usa o padrão e avisa;
  - **Supabase com uma seção**: usa essa seção e o padrão nas outras;
  - a requisição tem o header `apikey` e o caminho `/rest/v1/site_content?select=section,data`;
  - **erro 500 ou rede**: tenta de novo uma vez e então usa o padrão com aviso; com `REQUIRE_REMOTE_CONTENT=true`, **falha**;
  - **`REQUIRE_REMOTE_CONTENT=true` sem variáveis**: falha;
  - **seção inválida**: falha com "contato › whatsapp › number: …";
  - **seção sem um campo novo**: o campo recebe o padrão; listas não são mescladas;
  - **seção desconhecida no banco**: ignorada com aviso;
  - **placeholders com `REQUIRE_REMOTE_CONTENT=true`**: aviso listando os caminhos, incluindo o número fictício;
  - **`{ano}`**: vira o ano de `now`.

### T07 — `<head>`, JSON-LD e arquivos de robôs `[x] concluída` (2026-11-07)
- **Resultado**: 23 casos verdes; suíte 516/516; `npm run check` ok. Decisão: o JSON-LD usa o telefone do botão "Ligar", não o WhatsApp (que não aparece como texto). `og:image` não depende de `SITE_URL`, porque o endereço da foto já é https absoluto.
- **Faz**: `src/prerender/html.ts`, `head.ts`, `jsonLd.ts` e `files.ts`.
- **Cobre**: CA-15, CA-16 (nível das funções), CA-20.
- **Testes** (`src/prerender/*.test.ts`):
  - **head com `SITE_URL`**:
    - `<title>`, `description`, os `og:*` (título, descrição, tipo, `pt_BR`, url, imagem com largura e altura) e o cartão do Twitter têm os valores do conteúdo de teste;
    - o canonical aponta para `SITE_URL/`;
    - a barra final do `SITE_URL` é normalizada.
  - **head sem `SITE_URL`**: url e canonical são omitidos, e o resto continua.
  - **imagem de compartilhamento sem `src`**: sem `og:image`.
  - **escape**: aspas, `<` e `&` no conteúdo saem escapados nos atributos.
  - **head do admin**: tem `noindex, nofollow`.
  - **JSON-LD**:
    - é JSON válido, `@type: Psychologist`, e nome, CRP (`identifier`), endereço, telefone `+55…`, e-mail, Instagram (`sameAs`) e horários batem com o conteúdo;
    - campos vazios ficam de fora;
    - a url só existe com `SITE_URL`;
    - um texto com `</script>` não fecha a tag.
  - **robots e sitemap**: `robots.txt` tem `Disallow: /admin`, mais `Sitemap:` quando há `SITE_URL`; `sitemap.xml` é XML válido com a URL; o `_redirects` tem a regra do admin.

### T08 — Função `prerender()` e entrada SSR `[x] concluída` (2026-11-07)
- **Resultado**: 18 casos verdes; suíte Vitest 534/534; `npm run check` ok. **E2E da 000 vermelho até a T09**: o `index.html` agora tem marcadores no lugar do `<title>`, e o build ainda não roda a pré-renderização, então o axe acusa `document-title` (14 passaram, smoke falhou nos 3 caminhos). Desvios: `renderSite` em `src/app/renderSite.tsx` (evita importação circular); Supabase simulado por `fetch` injetado neste teste (jsdom × fetch do Node).
- **Faz**: `src/prerender/prerender.ts` e `src/app/entry-server.tsx` (`renderSite` com `renderToString`). O `index.html` ganha os marcadores `<!--app-head-->`, `<!--app-html-->` e `<!--app-data-->`.
- **Cobre**: CA-11 (nível da função), CA-15 e CA-16 integrados.
- **Testes** (`src/prerender/prerender.test.ts`, com o template real do `index.html` e MSW):
  - devolve `index.html`, `admin.html`, `robots.txt`, `_redirects`, e `sitemap.xml` só com `SITE_URL`;
  - **`index.html`**:
    - não sobra nenhum marcador;
    - tem 1 `<title>`, o head, o JSON-LD e o conteúdo embutido;
    - as tags de script e CSS do template continuam lá;
  - **`admin.html`**: tem `noindex`, e nem o conteúdo nem o JSON-LD;
  - **com Supabase simulado**: o conteúdo do banco chega ao `index.html`;
  - **erro com `REQUIRE_REMOTE_CONTENT=true`**: a função rejeita, sem devolver arquivos.

### T09 — Build com pré-renderização e hidratação `[x] concluída` (2026-11-07)
- **Resultado**: suíte Vitest 563/563; `npm run check` ok (JS inicial 67,7 KB); E2E 45/45 (o smoke da 000 voltou a passar). Provas de mutação: o site ler `VITE_SUPABASE_URL` faz o CA-21 falhar; montar do zero em vez de hidratar faz o teste de hidratação falhar.
- **Desvios**: (1) `--offline` no `scripts/prerender.ts` e `test:e2e` = `npm run build -- --offline && playwright test`, porque com o `.env` preenchido o build do E2E acessaria o Supabase real (proibido pelo CLAUDE.md §4); recusa `REQUIRE_REMOTE_CONTENT=true`. (2) Avisos da pré-renderização vão para a saída padrão (só falhas no stderr). (3) `noindex` de `/admin/login` no E2E ficou para a T10 (depende da reescrita do preview). (4) `npm run dev` fica sem conteúdo embutido até a T10.
- **Observado**: com o `.env` preenchido e sem a tabela, o build normal avisa `HTTP 404` e usa o padrão (comportamento esperado até a T11).
- **Faz**:
  - novo script `build` e `scripts/prerender.ts`;
  - `bundle-report-plugin` passa a ignorar o SSR;
  - `dist-server` entra nos ignores;
  - `bootstrap.tsx` passa a usar `hydrateRoot` ou `createRoot` com o `ContentProvider`;
  - `bundle-budget` ganha os módulos proibidos (Zod, `schema`, `fields`, `defaults`, `load`, `transform`, `prerender`).
- **Cobre**: CA-11, CA-12, CA-21 e o RNF de performance.
- **Testes**:
  - `src/app/bootstrap.test.tsx` (atualizado):
    - **site com conteúdo embutido e `#root` vazio**: monta, e o provider entrega o conteúdo;
    - **`#root` com HTML do servidor**: hidrata sem erro de recuperação (`onRecoverableError` não é chamado);
    - **sem conteúdo embutido**: erro claro;
    - **admin**: continua sem ler o conteúdo.
  - `tests/unit/bundle-budget.test.ts` (atualizado): um módulo de Zod ou de `src/content/schema.ts` no JS inicial reprova.
  - `tests/unit/prerender-script.test.ts` (node): o script, com um `dist` e um `dist-server` falsos numa pasta temporária, grava os arquivos e sai com código 1 quando `prerender` rejeita.
  - `tests/e2e/prerender.spec.ts` (Playwright, mobile primeiro):
    - **CA-11**: com JavaScript desligado, o `<title>` e a descrição vêm do conteúdo padrão e o `site-content` existe. Com JavaScript ligado, o console não tem erros nem avisos de hidratação;
    - **CA-12**: nenhuma requisição sai para fora do `localhost`;
    - **CA-16**: `/admin/login` tem `noindex` e `/robots.txt` bloqueia `/admin`.
  - `tests/unit/env-exposure.test.ts` (node, **CA-21**): roda o `vite build` numa pasta temporária, com URL e chave de teste nas variáveis `VITE_` e um valor de teste numa variável sem prefixo. Confere que URL e chave **não** aparecem no JS inicial do site e que o valor sem prefixo não aparece em nenhum arquivo.
- **Verificação**: `npm run check` e `CI=1 npm run test:e2e` verdes; o JS inicial continua perto dos 67 KB.

### T10 — Conteúdo no `npm run dev` `[x] concluída` (2026-11-07)
- **Resultado**: 18 casos novos verdes; suíte Vitest 581/581; `npm run check` ok (JS inicial 67,7 KB); E2E 51/51 (inclui `/admin/login` e `/admin/qualquer/coisa` com noindex no preview). Verificação manual: `npm run dev` serve `/` com o título do conteúdo, o `<main>` no `#root` e o `site-content`; `/admin/login` com noindex; o terminal mostra `[conteúdo] Falha ao ler o conteúdo do Supabase: HTTP 404` (tabela ainda não existe).
- **Desvio**: no dev o `#root` já vem com o HTML (mesma `prerender()` do build) e o React hidrata, igual à produção; o plano previa `#root` vazio.
- **Faz**:
  - `scripts/content-dev-plugin.ts`: injeta o head e o conteúdo no dev; no preview, reescreve `/admin/*` para `admin.html`;
  - registra o plugin no `vite.config.ts`.
- **Cobre**: o objetivo "título e descrição vindos do conteúdo também no `npm run dev`", e mantém o E2E do admin funcionando no preview.
- **Testes** (`tests/unit/content-dev-plugin.test.ts`, node):
  - com um servidor Vite criado no teste (`createServer`, modo middleware), o HTML de `/` traz o `<title>` do padrão e o `site-content`;
  - o HTML de `/admin/login` traz o `noindex`;
  - a regra de reescrita do preview manda `/admin/x` para `/admin.html` e deixa `/`, `/assets/...` e `/robots.txt` intocados.
- **Verificação manual**: `npm run dev` mostra o título da aba vindo do conteúdo. Com o `.env` preenchido e uma linha no banco (depois da T11), aparece o título do banco.

### T11 — Migration `site_content` `[x] concluída` (2026-11-07)
- **Resultado**: 10 casos verdes; suíte 591/591; `npm run check` ok. Aplicada pelo Thiago no SQL Editor. Verificação com a chave pública (`sb_publishable_…`): GET → 200 `[]`; POST seção válida, POST `xyz`, PATCH e DELETE → 401 `42501 permission denied` (o `revoke` barra antes do RLS). `npm run build` passou a ler o Supabase ("Pré-renderização: 4 arquivos (Supabase)"), sem aviso. Não foi preciso `grant select`. Nota: a recusa de `xyz` pelo `check` em si não é testável com o anon (a escrita é barrada antes); será exercitada na 003, com o admin autenticado.
- **Faz**: `supabase/migrations/20261106120000_site_content.sql`, conforme o plano. **Não aplico.** Você cola no SQL Editor quando quiser.
- **Cobre**: CA-18.
- **Testes**:
  - `tests/unit/migration.test.ts`, lendo o SQL como texto:
    - cria a tabela com as 4 colunas;
    - tem o `check` com exatamente as 8 seções de `SECTION_KEYS` (o teste importa do schema para não divergir);
    - liga a RLS;
    - tem uma política só de `select`;
    - **não tem** nenhuma política de `insert`, `update` ou `delete`;
    - revoga a escrita do `anon`.
  - **Verificação real**, depois de você aplicar e autorizar, com `curl` e a chave pública do `.env`:
    - um `GET` volta 200;
    - um `POST` de uma seção válida é recusado (401 ou 403);
    - um `POST` com `section: 'xyz'` é recusado.
  - Registro o resultado na tarefa.

### T12 — Keep-alive do Supabase `[x] concluída` (2026-11-07)
- **Resultado**: 7 casos verdes; suíte 598/598; `npm run check` ok. O mesmo `curl` rodado localmente com a chave pública retornou `[]` (exit 0). A execução real no GitHub fica para depois do push, com as variáveis cadastradas. Acréscimos: `timeout-minutes` e variáveis passadas por `env:` (sem `${{ }}` no comando).
- **Faz**: `.github/workflows/keep-supabase-alive.yml`.
- **Cobre**: CA-19.
- **Testes** (`tests/unit/keep-alive-workflow.test.ts`, texto):
  - tem um `schedule` semanal e o `workflow_dispatch`;
  - `permissions: contents: read`;
  - usa só `vars.SUPABASE_URL` e `vars.SUPABASE_ANON_KEY`, nenhum `secrets.` e nenhum `service_role`;
  - o `curl --fail` vai para `/rest/v1/site_content` com o header `apikey`;
  - o job tem um `if:` que o pula quando as variáveis não existem.
- **Depois do push** (com você): cadastrar as duas variáveis em *Settings → Secrets and variables → Actions → Variables* e disparar uma vez à mão.

### T13 — Fechamento da spec `[x] concluída` (2026-11-07)
- **Resultado**: `CLAUDE.md` §5 com "Validação" **Definido (spec 001)**; status da spec, do plano e das tarefas como concluídos; quadro de critérios e pendências abaixo.

---

## Critérios de aceite

| CA | Coberto por | Estado |
|---|---|---|
| CA-01 seções | `schema.test.ts` | ✅ |
| CA-02 campos e tipos | `schema.test.ts` (93 caminhos) | ✅ |
| CA-03 foto | `fields.test.ts` | ✅ |
| CA-04 limites | `schema.test.ts` | ✅ |
| CA-05 ícones | `fields.test.ts` | ✅ |
| CA-06 contato | `fields.test.ts`, `schema.test.ts` | ✅ |
| CA-07 rótulos | `schema.test.ts` | ✅ |
| CA-08 conteúdo padrão | `defaults.test.ts` | ✅ |
| CA-09 fonte no build | `load.test.ts`, `prerender.test.ts` | ✅ |
| CA-10 validação no build | `load.test.ts`, `transform.test.ts` | ✅ |
| CA-11 pré-renderização + hidratação | `prerender.test.ts`, `bootstrap.test.tsx`, E2E `prerender.spec.ts` | ✅ |
| CA-12 sem requisição ao Supabase | E2E `prerender.spec.ts` | ✅ |
| CA-13 `useContent()` | `ContentProvider.test.tsx` | ✅ |
| CA-14 conteúdo de teste | `content-fixture.test.ts` | ✅ |
| CA-15 tags do head | `head.test.ts`, `prerender.test.ts` | ✅ |
| CA-16 robôs e noindex | `files.test.ts`, `head.test.ts`, `content-dev-plugin.test.ts`, E2E | ✅ |
| CA-17 link do WhatsApp | `whatsapp.test.ts` | ✅ |
| CA-18 tabela e RLS | `migration.test.ts` + curl real | ✅ (a trava das 8 seções será exercitada na 003) |
| CA-19 keep-alive | `keep-alive-workflow.test.ts` + curl local | ⏳ execução no GitHub depois do push |
| CA-20 JSON-LD | `jsonLd.test.ts`, `prerender.test.ts` | ✅ |
| CA-21 exposição de variáveis | `env-exposure.test.ts` | ✅ |

## Pendências para outras specs
- **002**: exceção do `jsx-no-literals` para ícones SVG (nota da 000/T03); desenhar os 12 ícones de `src/content/icons.ts`; o teste obrigatório "sem texto fixo no site" usa `makeUniqueContent()`.
- **003**: tabela `admins` e política de escrita em `site_content`; exercitar a recusa de seção fora das 8 com o admin logado; cliente `@supabase/supabase-js` só no chunk do admin.
- **004**: formulários gerados por `walkSchema` + `fieldMeta`; build anual para atualizar o `{ano}` (agendamento chamando o deploy hook); não permitir apagar seções.
- **000 / CA-13**: primeiro push com o CI verde e um PR com erro de lint proposital.
- **Cloudflare (quando houver o que publicar)**: definir `REQUIRE_REMOTE_CONTENT=true`, `SITE_URL` e as variáveis do Supabase no projeto.
