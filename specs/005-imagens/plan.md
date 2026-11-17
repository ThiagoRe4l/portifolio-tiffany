# 005 — Imagens · plano técnico

> Status: **concluído** (2026-11-16) · Gate 2 aprovado em 2026-11-15
> Data: 2026-11-15 · Spec: `spec.md` (Gate 1 aprovado em 2026-11-15, com as cinco recomendações)

## Decisões do Gate 1

1. **Fotos servidas pelo próprio site:** o build copia as fotos do Supabase para dentro do site publicado.
2. **Três versões por foto** (480, 960 e 1600 px, sem passar do tamanho da foto), com nomes que seguem uma regra; o contrato do conteúdo não muda.
3. **Fotos sem uso** ficam no armazenamento; limpeza fica para depois.
4. **Sem recorte** nesta spec.
5. **Sem botão de remover** a foto.

## Caminho de uma foto

```
celular/computador
  └─ admin: "Trocar foto" ──► preparePhoto (canvas): gira, reduz, WebP/JPG, sem metadados
                              └─► 3 arquivos: <código>-480w.webp, -960w.webp, -1600w.webp
       └─ photoApi.upload ──► Supabase Storage, bucket site-photos (só admins gravam)
            └─ conteúdo da seção: src = endereço público da maior; width/height = dela
                 └─ "Salvar e publicar" (004) ──► deploy

build (Cloudflare)
  └─ prerender: lê o conteúdo ──► mirrorPhotos: baixa as 3 versões de cada foto do bucket
       └─► dist/fotos/<código>-<largura>w.webp; src reescrito para /fotos/<código>-1600w.webp
            └─ site: <img src srcset sizes width height> do próprio Cloudflare
```

## Decisões técnicas

### D1 — Regra das versões (`src/lib/image.ts`)
Funções puras, usadas pelo admin, pelo build e pelo site:
- `variantWidths(width)`: as larguras padrão menores que a foto, mais a da própria foto. Exemplos: 1600 → `[480, 960, 1600]`; 1200 → `[480, 960, 1200]`; 300 → `[300]`.
- `variantName(code, width, ext)`: monta `<código>-<largura>w.<ext>`.
- `parseVariant(src)`: lê `código`, `largura` e `ext` do fim do endereço (`-1600w.webp`); devolve `null` quando o endereço não segue a regra.
- `srcSetFor(src)`: o `srcset` derivado da regra (`…-480w.webp 480w, …-960w.webp 960w, …-1600w.webp 1600w`); vazio quando o endereço não segue a regra, como os endereços externos.

O arquivo vai para o JS inicial do site, porque o `Photo` monta o `srcset` no navegador. São poucas linhas, sem dependência.

### D2 — Preparação no aparelho (`src/admin/editor/photos/preparePhoto.ts`)
- **Validação antes de ler a foto** (`checkPhotoFile`): tipo `image/jpeg`, `image/png` ou `image/webp`; até 20 MB. O campo de arquivo usa `accept="image/jpeg,image/png,image/webp"`, para o iPhone converter HEIC em JPG sozinho.
- **Leitura:** `createImageBitmap(file, { imageOrientation: 'from-image' })`, que já aplica a orientação gravada pela câmera.
- **Para cada largura de `variantWidths(min(lado maior, 1600))`:**
  1. desenha num `OffscreenCanvas` (ou `<canvas>`, onde não houver), com fundo creme `#FAF6F0`, por causa dos PNG com transparência;
  2. gera `image/webp` com qualidade 0,82;
  3. se o navegador devolver outro tipo (Safari sem WebP), gera `image/jpeg` com qualidade 0,85, e as três versões ficam em JPG.
- **Metadados:** a foto é redesenhada do zero, então EXIF e localização não passam para o arquivo novo.
- **Resultado:** `{ width, height, ext, variants: [{ width, blob }] }`. Falha de leitura ou de memória vira `unreadable`.

### D3 — Envio (`src/admin/editor/photos/photoApi.ts`)
- **Código do arquivo:** `crypto.randomUUID()`. O nome original nunca é usado.
- **Destino:** cada versão vai para `site-photos/fotos/<código>-<largura>w.<ext>`, enviada como bytes diretos (não como formulário, que o SDK monta quando recebe um `Blob`; ajuste da T04), com:
  - `contentType` do arquivo;
  - `cacheControl: '31536000'`;
  - `upsert: false`.
- **Resultado:** `{ src, width, height }`, em que `src` é o endereço público da maior versão (`getPublicUrl`).
- **Erros classificados,** como no `contentApi` (004): `network`, `sessionExpired`, `forbidden`, `tooLarge`, `unavailable` e `unknown`. Envio parcial (uma versão falha) conta como falha; os arquivos que subiram ficam sem uso (decisão 3).

### D4 — No editor (`PhotoField`, 004)
- **Botão:** "Enviar foto" (sem foto) ou "Trocar foto" (com foto), com nome acessível "Trocar foto: <rótulo>". Ele abre um `<input type="file">` escondido.
- **Durante o trabalho:** o texto passa a "Preparando a foto…" e depois "Enviando foto…", numa região `role="status"`, e o botão fica ocupado.
- **Bloqueio de publicar:** o editor conta os envios em andamento; com algum ativo, "Salvar e publicar" e "Descartar" ficam indisponíveis.
- **Ao terminar:** chama `onChange({ ...foto, src, width, height })`, mantendo o `alt`, e marca o aviso "Confira se o texto alternativo descreve a foto nova." no estado do campo. O aviso some quando o `alt` é editado.
- **Erros:** aparecem junto do campo (`role="alert"`), e a foto anterior continua.
- **Sessão expirada no envio:** usa o `expireSession()` da 004, que leva ao login com o aviso de alterações perdidas.
- **Miniatura:** a versão de 480 px, quando existir.

### D5 — Banco (`supabase/migrations/20261115120000_photos.sql`)

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "site-photos: administradora envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
create policy "site-photos: administradora troca" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  )
  with check (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
create policy "site-photos: administradora apaga" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
```

- **Leitura pública:** vem do próprio bucket público, pelo endereço `/object/public/`. Por isso não há política de `select` para `anon`, e ninguém consegue listar os arquivos pela API.
- **Limites do bucket:** o limite de 2 MB e os tipos aceitos são uma segunda trava, além da preparação no aparelho.

### D6 — Build copia as fotos (`src/prerender/photos.ts`)
- **O que é copiado:** `mirrorPhotos({ content, supabaseUrl, fetch })` percorre o conteúdo atrás de fotos, pelo formato `{ src, width, height, alt }`. Só entram as fotos do próprio bucket: endereço que começa com `<VITE_SUPABASE_URL>/storage/v1/object/public/site-photos/` e segue a regra de D1.
- **Download:** cada versão é baixada. Uma foto usada em dois lugares é baixada uma vez.
- **Saída:** devolve o conteúdo com `src` reescrito para `/fotos/<arquivo>` e os arquivos binários.
- **Mudança na pré-renderização:** `PrerenderResult` ganha `binaryFiles: Record<string, Uint8Array>`. O `scripts/prerender.ts` grava esses arquivos em `dist/fotos/`, criando a pasta.
- **Falha ao baixar:** com `REQUIRE_REMOTE_CONTENT=true` (produção), o build falha e o site continua no ar com a versão anterior. Sem ele (desenvolvimento), avisa e mantém o endereço do Supabase.
- **Cache:** `public/_headers` passa a ter `/fotos/*` com `Cache-Control: public, max-age=31536000, immutable`. Os nomes nunca se repetem, então podem ficar guardados para sempre.
- **Imagem de compartilhamento:** `og:image` passa a ser absoluto (`SITE_URL` + `/fotos/…`), como as redes exigem. Sem `SITE_URL`, a tag sai sem a imagem.

### D7 — Site (`Photo`, 002)
- **Novo atributo:** `Photo` recebe `sizes` e monta `srcset` com `srcSetFor(src)`. Sem `srcset` (endereço fora da regra), fica como hoje.
- **Valores de `sizes`,** pelo layout atual:

  | Onde | `sizes` |
  |---|---|
  | Foto principal | `(min-width: 1024px) 520px, calc(100vw - 48px)` |
  | Sobre mim | `(min-width: 1024px) 480px, calc(100vw - 48px)` |
  | Galeria, foto grande no celular | `(min-width: 1024px) 380px, calc(100vw - 48px)` |
  | Galeria, fotos pequenas no celular | `(min-width: 1024px) 380px, calc(50vw - 30px)` |

  Os valores finais são conferidos no E2E: a versão escolhida pelo navegador não pode ser menor que a área exibida.

  **Ajuste da T08:** o E2E mostrou que a foto principal no Pixel 7 escolhia a versão de 960 px quando precisava de cerca de 1400. As fotos são recortadas para preencher a área (`object-fit: cover`), e uma área mais alta que 4:3 pede foto mais larga que ela. Os valores passaram a considerar a altura: foto principal `(min-width: 1024px) 750px, 535px`; Sobre mim `(min-width: 1024px) 640px, calc(100vw - 48px)`; galeria grande `(min-width: 1024px) 430px, calc(100vw - 48px)`; galeria pequena `(min-width: 1024px) 430px, (max-width: 459px) 200px, calc(50vw - 30px)`.
- **Prioridade:** a foto principal continua com `fetchpriority="high"`, sem `lazy`.

### D8 — Testes sem backend
- **Vitest:**
  - MSW para o Storage (`POST /storage/v1/object/site-photos/...`);
  - funções puras de D1 e D2;
  - `mirrorPhotos` com um `fetch` falso.
- **E2E:**
  - O Supabase falso guarda os arquivos enviados e os serve pelo endereço público, para a miniatura aparecer.
  - A foto de teste é gerada no próprio navegador: 4000×3000 px, com metades de cores diferentes para dar para ver a rotação.
  - Um ajudante (`tests/e2e/support/exif.ts`) insere nela um bloco EXIF com orientação de retrato e localização.
  - O teste confere o arquivo que chegou ao Storage falso: tipo, dimensões, orientação e ausência do marcador `Exif`.

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/lib/image.ts` | novo (D1) |
| `src/admin/editor/photos/preparePhoto.ts`, `photoApi.ts`, `photoMessages.ts` | novos (D2, D3) |
| `src/admin/editor/fields/PhotoField.tsx` | botão, progresso, aviso do alt e erros (D4) |
| `src/admin/AdminEditorPage.tsx`, `editor/editorState.ts`, `editor/ActionBar.tsx` | contagem de envios em andamento (D4) |
| `src/site/components/Photo.tsx` e as três seções com foto | `srcset` e `sizes` (D7) |
| `src/prerender/photos.ts`, `prerender.ts`, `head.ts`; `scripts/prerender.ts` | cópia das fotos e `og:image` absoluto (D6) |
| `public/_headers` | cache das fotos (D6) |
| `supabase/migrations/20261115120000_photos.sql` | novo (D5) |
| `tests/e2e/support/supabase.ts`, `tests/e2e/support/exif.ts` | Storage falso e foto de teste com EXIF (D8) |

**Dependências novas:** nenhuma.

## Riscos

- **Safari sem WebP no canvas:** cai para JPG, cerca de 30% mais pesado, mas ainda bem abaixo do limite. O E2E no iPhone emulado mostra o que acontece.
- **Memória em celular antigo** com foto muito grande: falha tratada com mensagem (caso de borda da spec).
- **Build mais lento:** baixar cerca de 15 fotos com 3 versões leva alguns segundos.
- **Permissões do Storage no projeto real:** o teste estático não enxerga. O roteiro manual confere com conta fora de `admins` e anônimo.
- **Fotos com URL externa** (colada à mão no banco): ficam como estão, sem `srcset` e sem cópia.

## Alternativas descartadas

- **Transformação de imagens do Supabase:** só no plano pago.
- **Biblioteca de compressão** (browser-image-compression etc.): o canvas resolve, e seria dependência nova só para isso.
- **Campo novo no schema** com as versões: muda o contrato da 001 (decisão 2).
- **Servir direto do Supabase:** fotos quebradas com o projeto pausado (decisão 1).

## Roteiro manual (T09, feito pelo Thiago)

1. **SQL Editor:** colar e rodar `supabase/migrations/20261115120000_photos.sql`.
2. **Storage:** o bucket `site-photos` aparece como público, com limite de 2 MB.
3. **No admin publicado:** "Trocar foto" na foto principal, com uma foto do celular; salvar e publicar.
4. **No site, em poucos minutos:** a foto aparece, e o endereço dela começa com `/fotos/` (em "Copiar endereço da imagem").
5. **Conferência do CA-09 no SQL Editor,** com `begin … rollback`: conta fora de `admins` e `anon` tentam inserir em `storage.objects` no bucket e recebem erro.
6. **Lighthouse mobile** no site publicado, com as fotos reais: anotar as quatro notas, LCP e CLS.

## Como cada CA é provado

| CA | Prova |
|---|---|
| CA-01 | `PhotoField.test.tsx`, E2E |
| CA-02 | `preparePhoto.test.ts` (validação), `PhotoField.test.tsx` |
| CA-03, CA-04 | E2E com a foto de teste com EXIF |
| CA-05 a CA-08 | `PhotoField.test.tsx`, `AdminEditorPage.photos.test.tsx` |
| CA-09 | `photos-migration.test.ts` e roteiro manual |
| CA-10 | `Photo.test.tsx`, testes das seções, E2E |
| CA-11, CA-12 | `photos.test.ts` (prerender), `head.test.ts` e roteiro manual |
| CA-13 | E2E e Lighthouse do roteiro |
