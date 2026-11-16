# 005 — Imagens: envio e otimização das fotos

> Status: **aprovada no Gate 1** (2026-11-15), com as recomendações das cinco perguntas.
> Data: 2026-11-13 · Depende de: 001 a 004 (concluídas)
> Referência visual: `docs/design/admin-editor-sobre.png` (bloco "Foto da seção" com "Trocar foto"). Em conflito: CLAUDE.md/spec > design.

## Contexto

O site já tem três lugares com foto (foto principal do Início, foto do Sobre mim e a galeria d'O espaço) e a imagem de compartilhamento usada no WhatsApp e nas redes. Hoje todas estão sem foto: o site mostra um bloco de espera, e o editor (004) só permite mudar o texto alternativo.

Ela vai tirar as fotos pelo celular. Uma foto de celular tem de 3 a 12 MB, de 4000 px de largura, e pode guardar a localização onde foi tirada. Publicada assim, deixaria o site lento e exporia um dado que ela não escolheu mostrar.

## Objetivo

Ao final da 005:
- em cada foto do editor, "Trocar foto" envia uma imagem do celular ou do computador;
- antes de sair do aparelho, a foto é reduzida, convertida para WebP e limpa de metadados (inclusive localização);
- o site mostra a foto no tamanho certo para cada tela (`srcset`/`sizes`), sem deslocar o layout e sem perder as notas do Lighthouse;
- só a administradora consegue enviar fotos, mesmo que alguém contorne a tela.

## Fora de escopo

- Recortar ou escolher o enquadramento (Pergunta 4).
- Remover uma foto deixando o bloco de espera (Pergunta 5). Na galeria, remover o item da lista já resolve.
- Vídeos, GIFs e outros formatos.
- Galeria de fotos já enviadas para reaproveitar.
- Domínio próprio e CDN de imagens paga.

## Requisitos funcionais

### No editor
- **RF-01 — Trocar foto.** Cada campo de foto ganha o botão "Trocar foto" (ou "Enviar foto", quando ainda não há foto), ao lado da miniatura, como no design. Ele abre a escolha de arquivo do aparelho: no celular, a câmera e a galeria.
- **RF-02 — Formatos aceitos.** JPG, PNG e WebP. No iPhone, as fotos HEIC chegam convertidas em JPG pelo próprio sistema. Outro formato mostra "Use uma foto em JPG, PNG ou WebP." junto do campo, sem enviar nada.
- **RF-03 — Tamanho de entrada.** Até 20 MB. Acima disso: "Esta foto é grande demais (máximo de 20 MB).", sem enviar.
- **RF-04 — Preparação no aparelho.** Antes do envio, a foto:
  - é girada conforme a orientação gravada pela câmera;
  - é reduzida para no máximo 1600 px no lado maior, sem nunca ampliar;
  - é convertida para WebP (ou JPG, onde o navegador não gera WebP);
  - sai sem metadados (EXIF, localização, modelo do celular).

  Junto, são geradas versões menores para telas menores (Pergunta 2).
- **RF-05 — Progresso.** Durante a preparação e o envio, o bloco mostra "Preparando a foto…" e depois "Enviando foto…", em região anunciada a leitores de tela. O botão fica ocupado e não aceita outro envio. "Salvar e publicar" fica indisponível até terminar, para não publicar uma foto pela metade.
- **RF-06 — Resultado.** Ao terminar, a miniatura mostra a foto nova, largura e altura são preenchidas com as da foto preparada, e a seção passa a ter "Alterações não salvas". A foto só vai para o site com "Salvar e publicar" (004), como qualquer outra alteração. "Descartar" volta à foto anterior.
- **RF-07 — Texto alternativo.** Continua obrigatório. Ao trocar a foto, o texto alternativo anterior é mantido e ganha o aviso "Confira se o texto alternativo descreve a foto nova.", que some quando ela edita o texto.
- **RF-08 — Falhas.** Sem internet, sessão expirada, serviço fora e foto que o navegador não consegue abrir têm mensagens próprias, em português, junto do campo. A foto anterior continua, e ela pode tentar de novo.

### No banco e no armazenamento
- **RF-09 — Onde as fotos ficam.** Um espaço de armazenamento (bucket) público para leitura, no Supabase Storage, com nomes de arquivo gerados pelo sistema, nunca o nome original (que pode ter nome de pessoa ou data).
- **RF-10 — Quem envia.** Só contas em `admins` (003) podem enviar, trocar ou apagar arquivos, garantido por políticas no banco (RLS), como na escrita do conteúdo. O bucket aceita só imagens WebP e JPG, de até 2 MB cada (as fotos preparadas ficam bem abaixo disso).

### No site
- **RF-11 — Tamanho certo para cada tela.** Cada foto publicada tem `srcset` com as versões disponíveis e `sizes` conforme o lugar (foto principal, Sobre mim, galeria), além de `width` e `height`. A foto principal continua com `fetchpriority="high"` e sem `loading="lazy"`; as outras, com `loading="lazy"` (CLAUDE.md §7).
- **RF-12 — Fotos no ar mesmo com o Supabase pausado.** O que o visitante baixa não pode depender do Supabase estar ativo (Pergunta 1).
- **RF-13 — Imagem de compartilhamento.** A foto escolhida em "Imagem de compartilhamento" (Geral) vai para as tags `og:image` com largura e altura reais, na versão maior.

## Requisitos não funcionais

- **Desempenho:** foto preparada da versão maior com até cerca de 300 KB; o JS inicial do site não recebe o código de preparação (que fica só no admin); o Lighthouse mobile continua dentro das metas do CLAUDE.md §7 com fotos reais (LCP < 2,5 s, CLS < 0,1).
- **Privacidade:** nenhum metadado da foto original chega ao site; o nome original do arquivo não é guardado.
- **Acessibilidade:** botão com nome claro ("Trocar foto: Foto principal"); progresso e erros anunciados; toque ≥ 48px; axe sem violações.
- **Segurança:** a proteção real é o RLS do Storage; o navegador só usa a chave pública.
- **Testes:** nenhum teste acessa o Supabase real. A preparação da foto é testada com imagens de teste reais no navegador (E2E), porque o jsdom não desenha imagens.

## Critérios de aceite

- **CA-01 (RF-01, RF-06)** — Dada uma foto JPG do celular, quando a escolho em "Trocar foto", então a miniatura mostra a nova, a seção fica com "Alterações não salvas" e, depois de "Salvar e publicar", o site passa a mostrá-la.
- **CA-02 (RF-02, RF-03)** — Dado um arquivo GIF, PDF ou maior que 20 MB, então a mensagem aparece junto do campo e nada é enviado.
- **CA-03 (RF-04)** — Dada uma foto de 4000×3000 px com orientação de retrato gravada pela câmera e localização no EXIF, então o arquivo enviado tem no máximo 1600 px no lado maior, está em pé, é WebP (ou JPG onde não houver WebP) e não tem EXIF.
- **CA-04 (RF-04)** — Dada uma foto menor que 1600 px, então ela não é ampliada.
- **CA-05 (RF-05)** — Durante a preparação e o envio, o progresso é anunciado, o botão não aceita outro envio e "Salvar e publicar" fica indisponível.
- **CA-06 (RF-07)** — Ao trocar a foto, o aviso para conferir o texto alternativo aparece e some quando o texto é editado.
- **CA-07 (RF-08)** — Dadas as respostas simuladas (sem rede, sessão expirada, serviço fora) e uma imagem corrompida, então aparece a mensagem correspondente e a foto anterior continua.
- **CA-08 (RF-06)** — Dada uma foto trocada, quando clico em "Descartar" (com a confirmação da 004), então a foto anterior volta.
- **CA-09 (RF-09, RF-10)** — Dado o teste estático da migration, então o bucket é público para leitura, aceita só WebP e JPG até 2 MB, e só contas em `admins` enviam, trocam ou apagam; dado o roteiro manual no banco real, então conta fora de `admins` e visitante anônimo não enviam.
- **CA-10 (RF-11)** — Dada uma foto publicada, então o `<img>` tem `srcset` com as versões, `sizes` adequado ao lugar, `width` e `height`; a foto principal tem `fetchpriority="high"` e não é preguiçosa.
- **CA-11 (RF-12)** — Dado o site publicado, então as fotos vêm de um endereço que não depende do Supabase estar ativo (conforme a Pergunta 1).
- **CA-12 (RF-13)** — Dada a imagem de compartilhamento enviada, então `og:image`, `og:image:width` e `og:image:height` apontam para ela.
- **CA-13 (RNF)** — Dado o editor com fotos, em Pixel 7, iPhone 13 e 1440px, então axe sem violações, sem rolagem horizontal e toque ≥ 48px; dado o site com fotos reais, então CLS < 0,1 e o Lighthouse continua nas metas.

## Casos de borda

- **Foto panorâmica ou muito estreita:** reduzida pelo lado maior; o site recorta com `object-fit: cover`, como já faz.
- **PNG com transparência:** o fundo transparente vira o creme do site (`#FAF6F0`), porque WebP sem perda pesaria demais e JPG não tem transparência.
- **Ela troca a foto duas vezes antes de salvar:** só a última fica no conteúdo; a primeira vira um arquivo sem uso (Pergunta 3).
- **Ela troca a foto e descarta:** o arquivo enviado fica sem uso (Pergunta 3).
- **Sessão expira no meio do envio:** o envio falha com a mensagem de sessão expirada, e o fluxo da 004 leva ao login.
- **Celular antigo sem memória para uma foto enorme:** a preparação falha com "Não foi possível preparar esta foto. Tente outra ou uma versão menor."
- **A mesma foto em dois lugares:** cada envio gera arquivos próprios; não há reaproveitamento.

## Perguntas em aberto

1. **De onde o visitante baixa as fotos?**
   - **(a) Recomendo:** o build copia as fotos do Supabase para dentro do site publicado, e o site as serve do próprio Cloudflare. Elas continuam no ar mesmo se o Supabase pausar por inatividade (o plano gratuito pausa depois de uma semana sem uso), não gastam a banda gratuita do Supabase (5 GB por mês) e chegam pelo mesmo endereço do site, o que ajuda no LCP. O custo é o build baixar as fotos a cada publicação (alguns segundos).
   - **(b)** O site aponta direto para o Supabase. Mais simples, mas foto quebrada se o projeto pausar, e cada visita gasta a banda do Supabase.
2. **Como ter várias versões de tamanho (`srcset`)?**
   - **(a) Recomendo:** o admin gera e envia três versões (480, 960 e 1600 px de largura, sem passar do tamanho da foto) com nomes que seguem uma regra (`<código>-960w.webp`). O conteúdo continua guardando só o endereço da maior, como hoje, e o site deriva as outras pela regra. Não muda o contrato do conteúdo (001).
   - **(b)** Acrescentar ao schema da foto a lista de versões. Mais explícito, mas muda o contrato aprovado e exige migrar o conteúdo já salvo.
3. **E as fotos que ficam sem uso** (trocadas, descartadas ou enviadas duas vezes)?
   - **(a) Recomendo por enquanto:** ficam no Storage. Cada foto preparada, com as três versões, ocupa cerca de 500 KB, e o plano gratuito tem 1 GB: sobra espaço para mais de mil trocas. Uma limpeza pode virar uma spec pequena depois.
   - **(b)** Apagar as antigas ao publicar. Exige saber, no momento de salvar, quais arquivos nenhuma seção usa mais, o que aumenta bastante a complexidade e o risco de apagar uma foto em uso.
4. **Recorte e enquadramento.** Recomendo deixar fora: o site já recorta centralizado (`object-fit: cover`), e ela pode recortar no próprio celular antes de enviar. Um "ponto de foco" pode vir depois, se alguma foto ficar mal enquadrada.
5. **Botão para remover a foto** (voltar ao bloco de espera). Recomendo não ter: uma vez com foto, faz pouco sentido voltar ao bloco vazio, e na galeria basta remover o item da lista.
