# 001 — Plano técnico

> Status: **concluída** em 2026-11-07 (Gate 2 aprovado em 2026-11-06)
> Data: 2026-11-06 · Spec: [spec.md](spec.md) (aprovada no Gate 1)

## Visão geral

```
            BUILD (Node, no computador / Cloudflare)                     NAVEGADOR (visitante)
┌─────────────────────────────────────────────────────────────┐   ┌──────────────────────────────┐
│ vite build            → dist/ (JS/CSS do site e do admin)    │   │ index.html já com:           │
│ vite build --ssr      → dist-server/entry-server.js          │   │  • <head> com SEO e JSON-LD  │
│ scripts/prerender.ts  → chama prerender() do entry-server:   │   │  • HTML do site              │
│    1. lê site_content (fetch REST, chave anon) ou defaults    │──▶│  • <script id="site-content" │
│    2. mescla com defaults, valida com Zod, troca {ano}        │   │     type="application/json"> │
│    3. renderToString(<ContentProvider><SitePage/>)            │   │ main.tsx → hydrateRoot       │
│    4. grava index.html, admin.html, robots, sitemap, _redirects│  │ (sem Zod, sem Supabase)      │
└─────────────────────────────────────────────────────────────┘   └──────────────────────────────┘
```

Escolhas principais:
- **Zod só no build e no admin.** O site no navegador recebe o conteúdo já validado no JSON embutido e usa apenas os **tipos** (`import type`, apagados na compilação).
- **Sem `@supabase/supabase-js` nesta spec.** Para ler uma tabela no build basta um `fetch` na API REST do Supabase (`/rest/v1/site_content`). O cliente oficial entra na 003, quando o login precisar dele.
- **Toda a lógica de pré-renderização fica em `src/`.** É compilada pelo próprio Vite (que resolve `@/`, TSX e CSS Modules) e testada no Vitest. `scripts/prerender.ts` só lê e grava arquivos.

## Dependência nova

| Pacote | Versão | Onde | Justificativa |
|---|---|---|---|
| `zod` | `4.6.7` (exata, `-E`) | `dependencies` | Decisão "Validação" do CLAUDE.md §5. A v4 tem *registries* para guardar os rótulos do admin junto do schema (RF-07). |

Nenhuma outra. *(A instalação só acontece com autorização, na T01.)*

## Arquivos

### Novos
| Arquivo | Conteúdo |
|---|---|
| `src/content/fields.ts` | "Construtores" de campo (`text`, `longText`, `photo`, `icon`, `toggle`, `list`, `group`, `phone`, `email`, `instagram`, `mapUrl`) que criam o schema Zod **e** registram os metadados `{ label, hint?, kind }` num registry próprio (`fieldMeta`). |
| `src/content/icons.ts` | Lista fixa de ícones (`id` + nome em português). Os desenhos SVG ficam para a 002. |
| `src/content/schema.ts` | Os 8 schemas de seção e o `siteContentSchema`; `SECTION_KEYS`. |
| `src/content/types.ts` | `SiteContent`, `SectionKey`, `Photo`… via `z.infer` (só tipos). |
| `src/content/defaults.ts` | Conteúdo padrão (RF-08). |
| `src/content/ContentProvider.tsx` | Contexto + `useContent()` (RF-13). |
| `src/content/embedded.ts` | `EMBEDDED_CONTENT_ID`, `readEmbeddedContent(document)` (navegador) e `serializeEmbeddedContent(content)` (build, com escape). |
| `src/content/load.ts` | `loadContent({ env, fetch })`: Supabase ou defaults, mescla, valida, regras do `REQUIRE_REMOTE_CONTENT` (RF-09/10). |
| `src/content/transform.ts` | `mergeWithDefaults`, `resolveYear` (`{ano}`), `findPlaceholders`, `formatIssues` (mensagem "seção › campo: problema"). |
| `src/lib/whatsapp.ts` | `buildWhatsAppLink(number, message)` (RF-17). |
| `src/prerender/head.ts` | `renderSiteHead(content, siteUrl?)` e `renderAdminHead()`: strings HTML escapadas (RF-15, RF-16). |
| `src/prerender/jsonLd.ts` | `buildJsonLd(content, siteUrl?)` (RF-20). |
| `src/prerender/files.ts` | `robotsTxt(siteUrl?)`, `sitemapXml(siteUrl)`, `REDIRECTS` (`_redirects` do Cloudflare). |
| `src/prerender/html.ts` | `escapeHtml`, `injectIntoTemplate(template, { head, body, data })`. |
| `src/prerender/prerender.ts` | `prerender({ env, template, fetch, now })` → `{ files, warnings }`: orquestra tudo, sem acessar disco. |
| `src/app/entry-server.tsx` | Entrada da compilação SSR: reexporta `prerender` e `renderSite(content)` (`renderToString`). |
| `scripts/prerender.ts` | Lê `dist/index.html`, importa `dist-server/entry-server.js`, grava os arquivos, imprime avisos e define o código de saída. |
| `scripts/content-dev-plugin.ts` | Plugin Vite: no `npm run dev`, injeta `<head>` e conteúdo (defaults ou Supabase do `.env`) via `ssrLoadModule`; no `vite preview`, reescreve `/admin/*` para `admin.html` (como o `_redirects`). |
| `supabase/migrations/20261106120000_site_content.sql` | Tabela + RLS de leitura (RF-18). |
| `.github/workflows/keep-supabase-alive.yml` | Leitura semanal (RF-19). |
| `tests/fixtures/content.ts` | `makeUniqueContent()` (RF-14). |
| Testes | Ao lado de cada módulo (`*.test.ts(x)`) e em `tests/unit/` e `tests/e2e/` (lista em tasks.md). |

### Alterados
| Arquivo | Mudança |
|---|---|
| `package.json` | `zod`; script `build` passa a ser `tsc -b && vite build && vite build --ssr src/app/entry-server.tsx --outDir dist-server && node --env-file-if-exists=.env scripts/prerender.ts`. |
| `index.html` | `<title>` fixo dá lugar aos marcadores `<!--app-head-->`, `<!--app-html-->` (dentro do `#root`) e `<!--app-data-->`. |
| `src/app/bootstrap.tsx` | No site: lê o conteúdo embutido; `hydrateRoot` se o `#root` já tem HTML, `createRoot` se não (dev). Erro claro se não houver conteúdo. |
| `src/site/SitePage.tsx` | Passa a ficar dentro do `ContentProvider` (continua um `<main>` vazio até a 002). |
| `scripts/bundle-budget.ts` | Proíbe no JS inicial do site: `node_modules/zod`, `src/content/(schema|fields|defaults|load|transform)` e `src/prerender`. |
| `scripts/bundle-report-plugin.ts` | Não gera relatório na compilação SSR. |
| `vite.config.ts` | Registra o `contentDevPlugin`. |
| `.gitignore`, `.prettierignore`, `eslint.config.js` | Ignoram `dist-server`. |
| `tsconfig.node.json` | Nada novo (já inclui `scripts`). |
| Testes da 000 | `bootstrap.test.tsx` passa a montar com conteúdo embutido; `bundle-budget.test.ts` ganha os novos módulos proibidos. |
| `CLAUDE.md` §5 | Linha "Validação" passa para **Definido (spec 001)**. |

## Contrato do conteúdo

### Metadados de campo (RF-07)
```ts
type FieldKind = 'text' | 'longText' | 'photo' | 'icon' | 'toggle' | 'list' | 'group'
               | 'phone' | 'email' | 'instagram' | 'mapUrl';
type FieldMeta = { label: string; hint?: string; kind: FieldKind; max?: number; min?: number };
export const fieldMeta = z.registry<FieldMeta>();
```
Cada construtor cria **uma instância nova** e a registra. O admin (004) percorre o schema e lê `fieldMeta.get(schema)` para saber o rótulo, a dica, o tipo de campo e o limite do contador.

Convenções:
- Texto obrigatório: aparado e com pelo menos 1 caractere. Texto opcional: `''` quando vazio (nunca `undefined`), o que deixa os formulários mais simples.
- Mensagens de erro do Zod em português: "Máximo de 90 caracteres", "Inclua 55 + DDD (só números)" etc.
- `.strict()` nos objetos: chave desconhecida vinda do banco é erro, o que pega digitação errada.

### Foto (RF-03)
```ts
photo = { src: '' | URL https, width: int 1..10000, height: int 1..10000, alt: texto 1..150 }
```
`src` vazio indica "ainda sem foto": o site desenha um bloco `--color-placeholder` com `aspect-ratio: width / height`.

### Campos e limites (RF-02, RF-04)
Limite = máximo de caracteres; listas = mín–máx itens. *Opcional* = pode ficar vazio.

**geral**
| Campo | Tipo | Limite |
|---|---|---|
| `name` | text | 60 |
| `profession` | text | 40 |
| `crp` | text | 20 |
| `initials` | text, só letras | 1–3 |
| `footerText` | longText | 200 |
| `copyright` | text, aceita `{ano}` | 100 |
| `restrictedAreaLink` | text | 30 |
| `menu` | group: `about`, `work`, `focus`, `howItWorks`, `space`, `contact` | 24 cada |
| `headerCta` | text | 30 |
| `seoTitle` | text | 60 |
| `seoDescription` | longText | 160 |
| `shareImage` | photo | (alt 150) |

**inicio**: `eyebrow` 60 · `title` 90 · `text` longText 260 · `primaryCta` 30 · `secondaryCta` 30 · `photo` · `badge` group { `title` 50, `subtitle` 60 }

**sobre**: `eyebrow` 60 · `title` 80 · `photo` · `text` longText 700 · `secondaryText` longText 700 · `educationTitle` opcional 40 · `education` lista 1–8 de text 140

**trabalho**: `eyebrow` 60 · `title` 80 · `cards` lista 1–8 de { `icon`, `title` 50, `text` longText 220 }

**atuacao**: `eyebrow` 60 · `title` 80 · `text` longText 500 · `focusTitle` opcional 40 · `focusTags` lista 1–12 de text 32 · `audienceTitle` opcional 40 · `audience` lista 1–4 de { `title` 30, `text` longText 200 }

**comoFunciona**: `eyebrow` 60 · `title` 80 · `steps` lista 2–5 de { `title` 50, `text` longText 240 }

**espaco**: `eyebrow` 60 · `title` 80 · `photos` lista 1–9 de { `photo`, `caption` opcional 80 }

**contato**
| Campo | Tipo | Regra |
|---|---|---|
| `eyebrow` / `title` | text | 60 / 80 |
| `text` | longText | 300 |
| `whatsapp` | group { `number` phone, `message` longText 300, `buttonText` 30 } | número obrigatório `^55\d{10,11}$` |
| `floatingButton` | group { `enabled` toggle, `text` 20 } | |
| `instagram` | group { `handle` instagram opcional, `buttonText` 30 } | `^[A-Za-z0-9._]{1,30}$`, sem `@` ou URL |
| `email` | group { `address` email opcional, `buttonText` 30 } | formato de e-mail |
| `phone` | group { `number` phone opcional, `buttonText` 30 } | `^55\d{10,11}$` |
| `address` | group { `title` 40, `text` longText 200 } | |
| `hours` | group { `title` 40, `text` longText 200 } | |
| `map` | group { `embedUrl` mapUrl opcional, `title` 80 } | começa com `https://www.google.com/maps/embed?` |

Os títulos dos itens de menu são fixos em **quais** âncoras existem (são as seções do site) e editáveis no **texto**. Por isso é um `group`, não uma lista.

### Ícones dos cards (RF-05)
`clipboard` "Prancheta (avaliação)", `puzzle` "Quebra-cabeça", `family` "Família", `school` "Escola", `chat` "Conversa", `heart` "Coração", `star` "Estrela", `calendar` "Calendário", `book` "Livro", `sprout` "Broto (desenvolvimento)", `hand` "Mão (apoio)", `target` "Alvo (objetivos)".

Nos defaults: Avaliação → `clipboard`, Intervenção → `puzzle`, Orientação parental → `family`, Escola → `school`.

### Conteúdo padrão (RF-08)
- Os textos do CLAUDE.md §8 entram **literalmente**.
- Todo o resto é `[placeholder]`, por exemplo `[Texto sobre a avaliação comportamental]`, `[Cidade · presencial e online]` e `[Seg a sex, 8h às 18h]`. Nenhum texto sobre a psicóloga é inventado.
- Textos de interface que não descrevem a psicóloga e que o design já mostra entram como padrão editável: "Agendar consulta", "Fale comigo", "Ligar", "Área restrita", "Formação", rótulos do menu, "© {ano} [Nome]". Os títulos dos blocos sem texto no design ficam como placeholder.
- Fotos: `src: ''`, dimensões do design (hero 4:5, sobre 4:5, espaço 4:3) e `alt` placeholder (`[Descreva a foto]`).
- WhatsApp: número `[placeholder]` não passaria na validação, então o padrão é `5500000000000`. É um número fictício que o aviso de placeholders do build também acusa, por regra específica.

### Conteúdo embutido (RF-12)
```html
<script id="site-content" type="application/json">{"geral":{…}}</script>
```
- `serializeEmbeddedContent` aplica `JSON.stringify` e depois troca `<` `>` `&` U+2028 U+2029 por `<` etc. Assim nenhum texto fecha o `</script>`.
- O `{ano}` já sai resolvido.
- O JSON-LD usa o mesmo escape.

### Leitura no build (RF-09, RF-10)
```
GET {VITE_SUPABASE_URL}/rest/v1/site_content?select=section,data
Header: apikey: {VITE_SUPABASE_ANON_KEY}       (timeout 10 s, 1 nova tentativa)
```
| Situação | `REQUIRE_REMOTE_CONTENT` ausente | `=true` (hospedagem) |
|---|---|---|
| Variáveis ausentes | defaults + aviso | **falha** |
| Rede/HTTP com erro | defaults + aviso | **falha** |
| Seção sem linha | default da seção | default da seção + aviso |
| Seção inválida | **falha** (seção › campo) | **falha** |
| Placeholders `[...]` restantes | — | aviso listando os campos |

- **Mesclagem:** objetos são mesclados recursivamente com o default (campo novo recebe o padrão); **listas não são mescladas**, valem as do banco. Por isso, um campo novo dentro de itens de lista precisa ser opcional ou ter `.default()` no schema. Essa regra vai documentada em `transform.ts`.
- A chave `anon` funciona em qualquer formato (JWT antigo ou `sb_publishable_…`), porque o header `apikey` é aceito pelos dois.

### Pré-renderização (RF-11, RF-15, RF-16, RF-20)
`prerender()` devolve:
| Arquivo | Conteúdo |
|---|---|
| `index.html` | template + head do site + JSON-LD + HTML do `SitePage` + conteúdo embutido |
| `admin.html` | template + `<title>` do admin + `<meta name="robots" content="noindex, nofollow">`, sem HTML nem conteúdo |
| `robots.txt` | `User-agent: *` / `Disallow: /admin` (+ `Sitemap:` se houver `SITE_URL`) |
| `sitemap.xml` | só com `SITE_URL` |
| `_redirects` | `/admin/* /admin.html 200` (o Cloudflare serve `/admin` a partir de `admin.html` automaticamente) |

O `<title>` do `admin.html` ("Área administrativa · Editar site") é texto do admin, não do site público. Por isso pode ser fixo, e a regra do `jsx-no-literals` vale só em `src/site`.

### Navegador (RF-12, RF-13)
`bootstrap()` no site faz:
1. lê o conteúdo embutido com `readEmbeddedContent`;
2. usa `hydrateRoot` se o `#root` já tem nós, ou `createRoot` se não tem (dev);
3. envolve tudo em `<StrictMode><ContentProvider>`.

O admin não lê o conteúdo embutido; ele vai buscar no banco a partir da 004.

### `npm run dev`
O `contentDevPlugin` injeta, a cada carregamento, o `<head>` e o conteúdo, com a mesma lógica do build e lendo o `.env` via `loadEnv`. O `#root` vem vazio e o React monta do zero. Sem Supabase no `.env`, aparecem os defaults; com ele, aparece o conteúdo do banco.

## Banco (RF-18)

```sql
create table public.site_content (
  section    text primary key
             check (section in ('geral','inicio','sobre','trabalho','atuacao','comoFunciona','espaco','contato')),
  data       jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.site_content enable row level security;
create policy "site_content: leitura pública" on public.site_content
  for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.site_content from anon;
```
- **Sem política de escrita:** com RLS ligado, ninguém grava. A 003 cria a tabela `admins` e a política de escrita.
- O `revoke` para `anon` é uma segunda trava.
- **Como aplicar:** você cola o arquivo no *SQL Editor* do painel, com autorização na T11. Depois eu verifico com `curl` usando só a chave pública: a leitura retorna 200, a gravação é recusada e uma seção inválida é recusada.

## Keep-alive (RF-19)
`.github/workflows/keep-supabase-alive.yml`:
- roda uma vez por semana, às segundas 09:00 UTC, e também pode ser disparado à mão (`workflow_dispatch`);
- tem `permissions: contents: read`;
- faz um `curl --fail` na mesma URL REST usando **variáveis do repositório** (`vars.SUPABASE_URL`, `vars.SUPABASE_ANON_KEY`). Não usa `secrets`, porque a chave é pública;
- se as variáveis não existirem, o job é pulado (`if:`), em vez de ficar vermelho até o projeto ser criado. Você cadastra as variáveis no GitHub quando quiser.

## Riscos e mitigação
| Risco | Mitigação |
|---|---|
| `vite build --ssr` mudar no Vite 8 (Environment API) | T09 começa por esse passo; alternativa: `build()` programático no script. |
| Aviso de hidratação por diferença entre servidor e navegador | Conteúdo idêntico (o mesmo JSON) e `{ano}` resolvido no build; teste E2E lê o console. |
| `{ano}` defasado se ela ficar um ano sem publicar | Fica para a 004: um agendamento anual vai chamar o deploy hook (que só existe lá). Registro na spec 004. |
| Cloudflare tratar `/admin` × `admin.html` diferente do esperado | Verificar no primeiro deploy; o `vite preview` imita a regra, e os E2E cobrem. |
| Zod entrar no site por engano (um `import` sem `type`) | `npm run size` falha com os novos módulos proibidos; `verbatimModuleSyntax` já obriga o `import type`. |
| Chave REST do Supabase mudar de formato | Header `apikey` aceita os dois formatos; o teste com MSW confere o header. |

## Alternativas descartadas
- **`vite-react-ssg` ou plugins de SSG:** seriam mais dependências para algo que hoje é uma página.
- **`@supabase/supabase-js` no build:** pesado para um único `GET`. Entra na 003.
- **Validar no navegador com Zod:** aumentaria o JS inicial em cerca de 15 KB gzip sem ganho, porque o build já validou.
- **Metadados em `.meta()` (registry global do Zod):** um registry próprio é tipado e não se mistura com metadados de terceiros.
- **Ano calculado no navegador:** causaria diferença na hidratação e piscada na virada do ano.
