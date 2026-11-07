# 001 — Modelo de conteúdo

> Status: **concluída** em 2026-11-07 (Gate 1 em 2026-11-06)
> Data: 2026-11-06 · Depende de: 000 (concluída, exceto CA-13)

## Contexto

A regra central do projeto (CLAUDE.md §6) é que **nenhum texto visível do site fica fixo no código**: tudo vem de um conteúdo editável, um documento JSON por seção, validado por schemas Zod que também geram os formulários do admin. Na spec 000 decidimos (D3) que o site é **pré-renderizado no build**: o HTML já sai com todo o conteúdo, e um novo deploy acontece quando ela publica no admin.

Esta spec define o **contrato do conteúdo** (o que existe, com quais limites), o **conteúdo padrão** e o **caminho de leitura**: do banco para o build, do build para o HTML e do HTML para o React no navegador. A gravação pelo admin fica para a 004 e as fotos de verdade para a 005.

## Objetivo

Ao final da 001:
- os 8 schemas existem, com tipos, limites e rótulos em português para o admin;
- o conteúdo padrão usa os textos aprovados (CLAUDE.md §8) e placeholders `[...]` para o resto;
- o `npm run build` gera um `index.html` com o conteúdo, as tags de SEO e de compartilhamento, lendo do Supabase quando configurado e do conteúdo padrão quando não;
- o site no navegador usa o mesmo conteúdo embutido no HTML, **sem buscar nada no Supabase**;
- existe a tabela `site_content` com leitura pública (com autorização para a migration);
- o gerador do link de WhatsApp existe e tem o teste obrigatório.

Ainda **não há seções visuais** (spec 002). O que aparece no `npm run dev` continua sendo uma página vazia, mas com o `<title>` e a descrição vindos do conteúdo.

## Fora de escopo

- Componentes visuais das seções (002).
- Login, tabela `admins` e política de escrita (003).
- Formulários, salvar, publicar e disparar o deploy (004).
- Upload e otimização de fotos (005). Aqui as fotos são só o **formato** (URL, dimensões, texto alternativo) e o tratamento de "ainda sem foto".
- Configurar o projeto no Cloudflare Pages (fica para quando houver algo visual para publicar).

## Requisitos funcionais

### Contrato do conteúdo
- **RF-01 — Oito seções.** O conteúdo é um objeto com as chaves `geral`, `inicio`, `sobre`, `trabalho`, `atuacao`, `comoFunciona`, `espaco` e `contato` (nomes do CLAUDE.md §6.2). Cada seção tem seu schema Zod em `src/content/schema.ts`.
- **RF-02 — Campos por seção.** Os campos são os listados no pedido inicial do Thiago, mais os textos que o design mostra e que precisam ser editáveis (marcados com ➕). Nomes de campo em inglês no código; rótulos em português no admin.

  | Seção | Campos |
  |---|---|
  | **Geral** | nome, profissão ➕ ("Psicóloga"), CRP, iniciais (1–3 letras), texto do rodapé, linha de direitos ➕ (aceita `{ano}`, trocado pelo ano do build), texto do link "Área restrita" ➕, itens do menu ➕ (rótulo de cada âncora), texto do botão do header ➕ ("Agendar consulta"), título para o Google, descrição para o Google, imagem de compartilhamento |
  | **Início** | etiqueta, título, texto, botão principal, botão secundário, foto, selo (título + linha) |
  | **Sobre mim** | etiqueta, título, foto, texto principal, texto complementar, título do bloco de formação ➕ (pode ficar vazio), lista de formação (texto de cada item) |
  | **Meu trabalho** | etiqueta, título, cards (ícone de uma lista fixa, título, texto) |
  | **Área de atuação** | etiqueta, título, texto, título das etiquetas de foco ➕, etiquetas de foco (lista de textos), título do público atendido ➕, público atendido (lista de título + texto) |
  | **Como funciona** | etiqueta, título, passos (título + texto). O número do passo (1, 2, 3 / "01, 02, 03") é gerado pela posição, não é texto |
  | **O espaço** | etiqueta, título, fotos (foto + legenda) |
  | **Contato** | etiqueta, título, texto, WhatsApp (número com DDI e DDD, mensagem pronta, texto do botão), botão flutuante (liga/desliga + texto "Fale comigo"), Instagram (usuário) + texto do botão, e-mail + texto do botão, telefone + texto do botão ("Ligar"), título e texto do endereço, título e texto dos horários, link do Google Maps (vazio esconde o mapa) + título do mapa ➕ (para leitores de tela) |

- **RF-03 — Foto.** Toda foto tem: endereço da imagem (opcional enquanto não houver upload), largura, altura e **texto alternativo obrigatório**. Sem endereço, o site mostra um bloco na cor `--color-placeholder` com as mesmas proporções (sem quebrar o layout).
- **RF-04 — Limites.** Cada texto tem limite de caracteres (proposta no plano, por exemplo: título do hero até 90, título para o Google até 60, descrição para o Google até 160). Listas têm mínimo e máximo de itens (ex.: cards do trabalho de 1 a 8, fotos do espaço de 1 a 9). Os limites alimentam o contador de caracteres do admin.
- **RF-05 — Ícones dos cards.** Lista fixa de ícones de linha (traço 1.8), proposta no plano, com um nome em português para o seletor do admin.
- **RF-06 — Validação de contato.** Número do WhatsApp e telefone: só dígitos (com DDI 55); e-mail: formato válido; Instagram: usuário sem `@` nem URL; mapa: só endereços de incorporação do Google Maps (`https://www.google.com/maps/embed?...`). Campos de contato opcionais vazios **escondem** o botão correspondente.
- **RF-07 — Rótulos para o admin.** Cada campo leva, no próprio schema, o rótulo em português e uma dica curta, para a spec 004 gerar o formulário sem duplicar nada.

### Conteúdo padrão
- **RF-08 — Defaults aprovados.** `src/content/defaults.ts` contém o conteúdo inicial com os textos aprovados (CLAUDE.md §8) e placeholders `[...]` para todo o resto. **Nenhum texto sobre a psicóloga é inventado.** O conteúdo padrão passa no próprio schema.

### Leitura do conteúdo
- **RF-09 — Fonte no build.** O build lê o conteúdo assim:
  - variáveis do Supabase presentes → lê a tabela `site_content`; seção sem linha no banco usa o padrão;
  - variáveis ausentes → usa o conteúdo padrão e avisa no terminal (desenvolvimento, CI e testes);
  - com `REQUIRE_REMOTE_CONTENT=true` (configurado só na hospedagem), variáveis ausentes ou Supabase fora do ar **falham o build**, para nunca publicar o conteúdo padrão por cima do conteúdo real.
- **RF-10 — Validação no build.** Cada seção lida passa pelo schema. Seção inválida **falha o build** com uma mensagem que diz a seção e o campo. Campos novos que ainda não existem no banco recebem o valor padrão (para uma mudança de schema não derrubar o site).
- **RF-11 — Pré-renderização.** O build gera o `index.html` do `/` com o HTML do site renderizado a partir do conteúdo, e o React no navegador continua a partir dele (hidratação), sem piscar nem refazer a página.
- **RF-12 — Conteúdo embutido.** O conteúdo usado no build vai junto no HTML, num bloco de dados JSON, e o site no navegador lê dali. **O visitante não faz nenhuma requisição ao Supabase.**
- **RF-13 — Acesso ao conteúdo nos componentes.** Um `ContentProvider` e um hook (`useContent()`) entregam o conteúdo tipado aos componentes do site. Testes podem injetar um conteúdo de teste.
- **RF-14 — Conteúdo de teste.** `tests/fixtures/` tem um gerador de conteúdo em que **cada texto é único** (ex.: `«inicio.title»`), base do teste obrigatório "sem texto fixo no site" da 002.

### SEO e compartilhamento
- **RF-15 — Tags no HTML.** O `<head>` gerado traz, a partir de `geral`: `<title>`, `meta description`, Open Graph (`og:title`, `og:description`, `og:image` com largura/altura, `og:type`, `og:locale` pt_BR, `og:url`), cartão do Twitter e `link rel="canonical"`. Os que dependem do domínio (`og:url`, canonical, imagem absoluta) usam a variável `SITE_URL`; sem ela, são omitidos.
- **RF-16 — Robôs.** `robots.txt` bloqueia `/admin`; as páginas do admin levam `noindex`. Com `SITE_URL`, o build gera `sitemap.xml` com o `/`.

### WhatsApp
- **RF-17 — Link do WhatsApp.** `src/lib/whatsapp.ts` gera `https://wa.me/<número>?text=<mensagem codificada>` a partir de `contato`. Teste obrigatório do projeto (CLAUDE.md §4).

### Banco
- **RF-18 — Tabela e leitura pública.** Migration com `site_content (section text primary key, data jsonb not null, updated_at timestamptz not null default now(), updated_by uuid)`, restrição de `section` às 8 chaves, RLS ligado e **só leitura pública**. Escrita e a tabela `admins` ficam para a 003. *(Criar e aplicar a migration só com autorização.)*
- **RF-19 — Manter o Supabase ativo.** Job agendado semanal no GitHub Actions faz uma leitura simples em `site_content`, para o plano gratuito não pausar o projeto (mitigação da D1).
- **RF-20 — Dados estruturados (JSON-LD).** O HTML do site traz um bloco `application/ld+json` (tipo `Psychologist`) montado **só com dados que já aparecem no site**: nome, CRP, endereço, telefone, e-mail, Instagram, horários e, com `SITE_URL`, a URL. Campos vazios ficam de fora. O bloco recebe o mesmo escape do RF-12.

## Requisitos não funcionais

- **Performance**: Zod e o cliente do Supabase **não entram no bundle do site** (só no build e no admin). O conteúdo embutido deve caber em poucos KB; o JS inicial continua bem abaixo de 150 KB gzip (verificado pelo `npm run size`). O HTML pré-renderizado melhora o LCP: o texto aparece antes do JS.
- **Segurança**: o bloco JSON embutido é escapado para não permitir fechar a tag `<script>` nem injetar HTML, mesmo com textos maliciosos. Conteúdo sempre renderizado como texto. O mapa só aceita URL de incorporação do Google. O build usa só a chave pública (`anon`); leitura pública por RLS. Variáveis com prefixo `VITE_` vão para o navegador por definição, então **só a URL e a chave `anon` levam esse prefixo**; `SITE_URL` e `REQUIRE_REMOTE_CONTENT` existem só no build. O JS do site não referencia variável do Supabase (o visitante não acessa o banco); só o chunk do admin as contém.
- **Acessibilidade**: foto sem texto alternativo é inválida; o mapa tem título; `lang="pt-BR"` mantido.
- **Confiabilidade**: falha de rede ou conteúdo inválido no build de produção **interrompe o deploy** (o Cloudflare mantém a versão anterior no ar). Em desenvolvimento, o conteúdo padrão permite trabalhar sem Supabase.
- **Ética (CLAUDE.md §9)**: nome e CRP são obrigatórios no schema; o modelo não prevê depoimentos, preços nem "resultados".

## Critérios de aceite

- **CA-01 (RF-01)** — Dado o módulo de schemas, quando listo as seções, então existem exatamente as 8 chaves, cada uma com um schema.
- **CA-02 (RF-02)** — Dado cada schema, quando comparo com a tabela do RF-02, então todos os campos existem com os tipos certos (texto, lista, foto, liga/desliga, ícone).
- **CA-03 (RF-03)** — Dada uma foto sem texto alternativo, quando valido, então é rejeitada; dada uma foto sem endereço, então é aceita e o site recebe as dimensões para o bloco de espera.
- **CA-04 (RF-04)** — Dado um texto acima do limite ou uma lista fora do mínimo/máximo, quando valido, então é rejeitado com a seção, o campo e o limite na mensagem.
- **CA-05 (RF-05)** — Dado um card com ícone fora da lista, quando valido, então é rejeitado.
- **CA-06 (RF-06)** — Dados número com letras, e-mail inválido, Instagram com `@` ou URL e mapa fora do Google, quando valido, então cada um é rejeitado; dados campos opcionais vazios, então são aceitos.
- **CA-07 (RF-07)** — Dado qualquer campo de qualquer schema, quando leio seus metadados, então ele tem rótulo em português.
- **CA-08 (RF-08)** — Dado o conteúdo padrão, quando valido, então passa; e os textos aprovados da seção 8 aparecem exatamente como escritos.
- **CA-09 (RF-09)** — Dado o build sem variáveis do Supabase, então usa o padrão e avisa; dado o Supabase simulado com uma seção, então usa a do banco e o padrão nas outras; dado `REQUIRE_REMOTE_CONTENT=true` sem variáveis ou com o Supabase fora do ar, então o build falha.
- **CA-10 (RF-10)** — Dada uma seção inválida no banco, quando o build roda, então falha citando seção e campo; dada uma seção sem um campo novo, então o campo recebe o padrão.
- **CA-11 (RF-11)** — Dado o build, quando abro o `dist/index.html` sem executar JS, então o conteúdo já está no HTML; e quando o JS carrega, não há aviso de hidratação no console.
- **CA-12 (RF-12)** — Dado o site aberto no navegador, quando monitoro a rede, então nenhuma requisição vai ao Supabase.
- **CA-13 (RF-13)** — Dado um componente que usa `useContent()` dentro do `ContentProvider` com conteúdo de teste, então recebe esse conteúdo; fora do provider, então recebe um erro claro.
- **CA-14 (RF-14)** — Dado o gerador de conteúdo de teste, quando coleto todos os textos, então todos são únicos e o conteúdo passa nos schemas.
- **CA-15 (RF-15)** — Dado o build com `SITE_URL`, quando leio o `<head>`, então todas as tags do RF-15 existem com os valores do conteúdo; sem `SITE_URL`, então as que dependem do domínio são omitidas e as demais continuam.
- **CA-16 (RF-16)** — Dado o build, então `robots.txt` bloqueia `/admin`; dado `/admin/login`, então há `noindex`; com `SITE_URL`, então existe `sitemap.xml`.
- **CA-17 (RF-17)** — Dados número e mensagem com acentos, espaços, `&`, `?` e emoji, quando gero o link, então é `https://wa.me/<dígitos>?text=<mensagem codificada>` e decodifica de volta para a mensagem original.
- **CA-18 (RF-18)** — Dada a migration aplicada, quando um visitante anônimo lê `site_content`, então consegue; quando tenta gravar, então é recusado; quando grava uma seção fora das 8, então é recusado.
- **CA-19 (RF-19)** — Dado o workflow agendado, quando roda, então faz uma leitura em `site_content` usando só a chave pública.
- **CA-20 (RF-20)** — Dado o conteúdo de teste, quando leio o JSON-LD do HTML gerado, então ele é JSON válido, tem tipo `Psychologist`, cada valor é igual ao do conteúdo, campos vazios não aparecem e um texto com `</script>` não fecha a tag.
- **CA-21 (RNF Segurança)** — Dado o build com variáveis de teste, quando procuro a URL e a chave nos arquivos JS iniciais do site, então nenhuma aparece (só podem estar no chunk do admin); e nenhum arquivo do `dist` contém um valor de teste colocado numa variável sem `VITE_`.

## Casos de borda

- **Texto malicioso no conteúdo** (ex.: `</script><script>alert(1)</script>` ou `<img onerror>`): aparece como texto no site e não quebra o bloco JSON embutido.
- **`{ano}`** na linha de direitos: trocado pelo ano do build. Como só há novo build quando ela publica, o ano pode ficar defasado se ela passar um ano sem publicar; o job agendado (RF-19) pode disparar um build anual, a decidir no plano.
- **Lista vazia** onde o design pede itens (ex.: nenhum card): o schema exige o mínimo, então isso não chega ao site.
- **Número de WhatsApp sem DDI** (ex.: `11999998888`): rejeitado com a dica "inclua 55 + DDD".
- **Seção apagada do banco**: volta ao conteúdo padrão (placeholders) no próximo build. É melhor do que o site sem a seção, mas o admin da 004 não deve permitir apagar seções.
- **Mudança futura de schema** que torne inválido um conteúdo já salvo (ex.: limite menor): o build falha com mensagem clara, em vez de publicar algo quebrado. Mudanças de schema devem vir com migração do conteúdo na própria spec que as fizer.
- **Placeholder `[Nome]` publicado por engano**: o build de produção avisa (sem falhar) se ainda houver textos entre colchetes, listando os campos.
- **Imagem de compartilhamento ausente**: as tags `og:image` são omitidas (o WhatsApp mostra a prévia só com texto).

## Respostas do Thiago (2026-11-06)

1. **Textos que faltam:** entram como `[placeholder]`; ela preenche no admin.
2. **Campos ➕:** aprovados.
3. **Público atendido:** cada bloco tem título + texto.
4. **Supabase:** Thiago cria o projeto e preenche `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` local (fora do git; nomes já criados, `.env.example` atualizado). Sem resposta sobre a migration, fica o padrão sem dependência nova: **SQL versionado em `supabase/migrations/`, colado por ele no SQL Editor do painel**. Eu nunca aplico.
5. **JSON-LD:** aprovado, virou o RF-20 / CA-20.
6. **Chave no navegador (dúvida do Thiago):** o prefixo `VITE_` é o que expõe; regra registrada no RNF de segurança e verificada pelo CA-21.

## Perguntas originais

1. **Textos do design que eu não tenho.** O CLAUDE.md cita "os dois parágrafos do design" do Sobre mim, e o design tem textos que não chegaram até mim: os textos dos 4 cards, o texto da Área de atuação, os textos dos 3 blocos de público e dos 3 passos, o texto do Contato, os horários e o selo do hero. Você pode me mandar esses textos? Se não, entram como `[placeholder]` e ela preenche no admin.
2. **Campos ➕.** Concorda com os campos que acrescentei (profissão, linha de direitos com `{ano}`, texto do link "Área restrita", itens do menu, botão do header, títulos dos blocos de formação, foco e público, textos dos botões de contato, título do mapa)? Todos aparecem no design e, pela regra do projeto, precisam ser editáveis.
3. **Público atendido.** Cada um dos 3 blocos (Crianças, Adolescentes, Famílias) tem só título ou título + texto curto? Propus título + texto.
4. **Projeto no Supabase.** Você cria o projeto (na sua conta) e me passa a URL e a chave pública (`anon`) num `.env.local`, que fica fora do git? E prefere aplicar a migration colando o SQL no painel do Supabase ou usando o Supabase CLI (seria uma dependência nova de desenvolvimento)?
5. **Dados estruturados.** Quer que o build gere também os dados estruturados do Google (JSON-LD do tipo "psicólogo"/"negócio local", com nome, CRP, endereço e telefone)? Ajuda no Google Maps e na busca local, mas expõe endereço e telefone de forma estruturada. Minha sugestão: sim, só com os dados que ela já mostra no site.
