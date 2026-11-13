# 004 — Admin: editor do conteúdo

> Status: **concluída** (2026-11-13). Gate 1 aprovado em 2026-11-10, com as recomendações das seis perguntas.
> Data: 2026-11-10 · Depende de: 001, 002 e 003 (concluídas)
> Referência visual: `docs/design/admin-editor-sobre.png` e `admin-editor-contato.png` (e os `.html`). Em conflito: CLAUDE.md/spec > conteúdo (`src/content`) > design.

## Contexto

A psicóloga já entra no admin (003), mas `/admin` ainda é só um cabeçalho. O conteúdo do site vive em oito documentos no banco, cada um validado por um schema Zod que já traz rótulo, dica, tipo e limites de cada campo (001). O site é pré-renderizado no build: um texto novo só aparece depois de um novo deploy (000).

Ela não é da área técnica. Editar precisa ser tão simples quanto preencher um formulário, sem risco de deixar o site quebrado ou de perder o que escreveu.

## Objetivo

Ao final da 004:
- ela escolhe uma das oito seções e edita qualquer texto, lista, ícone ou interruptor dela;
- "Salvar e publicar" grava a seção e coloca o site novo no ar em alguns minutos, sem passar por mim;
- nenhum campo do schema fica sem controle no admin, e um campo novo no schema aparece sozinho;
- uma falha no build nunca troca os textos dela pelo conteúdo padrão.

## Fora de escopo

- Enviar ou trocar fotos (005). Aqui a foto mostra a miniatura e permite editar o texto alternativo.
- Pré-visualizar o rascunho antes de publicar (Pergunta 2).
- Histórico de versões e desfazer depois de publicar.
- Agendar publicações, várias pessoas editando juntas e gerenciar administradoras.
- Mudar o contrato do conteúdo: os schemas da 001 continuam como estão.

## Requisitos funcionais

### Tela
- **RF-01 — Cabeçalho.** Mantém "Editar site", "Ver site" e "Sair" (003). Embaixo do título aparece o status: "Última publicação: [data e hora]" ou, em terracota, "Alterações não salvas".
- **RF-02 — Seletor de seção.** Logo abaixo do cabeçalho: a etiqueta "Seção do site · N de 8", um seletor com os nomes das oito seções (os rótulos dos schemas: Geral, Início, Sobre mim, Meu trabalho, Área de atuação, Como funciona, O espaço, Contato) e, abaixo dele, a lista dos nomes, como no design. A seção aberta fica no endereço (`/admin?secao=contato`), para recarregar sem perder o lugar.
- **RF-03 — Formulário gerado pelo schema.** O formulário da seção é montado a partir do schema e dos metadados (`fieldMeta`), sem formulário escrito à mão por seção. Ordem dos campos = ordem do schema; rótulo e dica = os do schema.
- **RF-04 — Barra de ações.** Fixa no rodapé da tela: "Descartar" e "Salvar e publicar". Os dois ficam desabilitados enquanto não há alteração.

### Campos
- **RF-05 — Texto e texto longo.** Campo de uma linha ou caixa de várias linhas. Onde há limite, mostra a contagem ("182 / 600"), que muda de cor perto do limite e é anunciada a leitores de tela só quando passa dele.
- **RF-06 — Grupos.** Um grupo vira um bloco com título (como "WhatsApp" no design).
- **RF-07 — Listas.** Cada item pode ser removido e movido para cima ou para baixo, com botões (o teclado funciona sem arrastar). "Adicionar item" cria um item vazio no fim. Os limites do schema valem: no mínimo, remover fica indisponível com a explicação; no máximo, adicionar fica indisponível. Itens de lista que são grupos mostram um resumo no título (ex.: o título do card).
- **RF-08 — Ícone.** Seletor com o nome em português e o desenho do ícone ao lado.
- **RF-09 — Interruptor.** Caixa de marcar com o rótulo (ex.: "Mostrar botão flutuante do WhatsApp").
- **RF-10 — Contato.** Telefone e WhatsApp aceitam o número como ela costuma digitar ("(11) 99999-8888", "+55 11 99999-8888") e são gravados só com dígitos, com 55 (Pergunta 4). Instagram aceita "@perfil" ou o link do perfil e grava só o nome de usuário. E-mail e link do mapa usam o teclado certo no celular.
- **RF-11 — Foto.** Miniatura da foto atual (ou o bloco de espera, se não houver foto) e o campo "Texto alternativo", obrigatório. Endereço, largura e altura não aparecem: são preenchidos pelo envio da foto, na 005.
- **RF-12 — Textos provisórios.** Campo que ainda tem texto entre colchetes (ex.: "[Nome]") mostra o aviso "Texto provisório: troque antes de divulgar o site". Não impede salvar.

### Salvar e publicar
- **RF-13 — Validação.** Ao clicar em "Salvar e publicar", a seção é validada pelo schema. Com erro, nada é gravado: cada erro aparece junto do campo, com a mensagem do schema; um resumo no topo diz quantos campos precisam de ajuste e leva ao primeiro; o foco vai para esse campo.
- **RF-14 — Gravação.** Sem erros, a seção é gravada no banco (sempre a seção inteira, com os espaços das pontas já removidos pelo schema). Data da alteração e conta que alterou são preenchidas pelo banco, não pelo navegador.
- **RF-15 — Publicação.** Cada gravação dispara um novo deploy do site no Cloudflare, por um mecanismo no banco. O endereço secreto do deploy (deploy hook) nunca vai para o navegador nem para o repositório (Pergunta 1).
- **RF-16 — Retorno.** Deu certo: aviso temporário "Publicado. O site atualiza em alguns minutos.", o status passa a "Última publicação: agora" e a barra volta a ficar desabilitada. Deu errado: aviso de erro em português, as alterações continuam na tela e ela pode tentar de novo. Sem internet, sessão expirada e serviço fora têm mensagens próprias; com a sessão expirada, ela volta ao login (003), e o aviso deixa claro que o que não foi salvo se perdeu.
- **RF-17 — Edição em dois aparelhos.** Se a seção mudou no banco desde que ela abriu (outro aparelho ou outra aba), a gravação é recusada com "Esta seção foi alterada em outro lugar. Recarregue para ver a versão mais recente." (Pergunta 6).
- **RF-18 — Build seguro.** O build de produção passa a exigir o conteúdo do banco (`REQUIRE_REMOTE_CONTENT=true` no Cloudflare): se o banco não responder, o build falha e o site publicado continua o anterior, em vez de voltar ao conteúdo padrão.
- **RF-19 — Ano do rodapé.** No dia 1º de janeiro, um novo deploy é disparado automaticamente, para o `{ano}` da linha de direitos virar o ano novo mesmo sem edição (Pergunta 5).

### Proteções
- **RF-20 — Alterações não salvas.** Trocar de seção, "Descartar", "Ver site", "Sair" e fechar ou recarregar a aba avisam quando há alteração não salva. Trocar de seção, "Descartar", "Ver site" e "Sair" usam uma janela do próprio admin ("Descartar alterações?" com "Continuar editando" e "Descartar"); fechar ou recarregar a aba usa o aviso do navegador.
- **RF-21 — Carregamento.** Ao abrir, o admin lê as oito seções do banco. Seção sem linha no banco começa pelo conteúdo padrão. Seção gravada com formato antigo (campo novo no schema) é completada com o padrão, como no build. Falha ao ler mostra "Não foi possível carregar o conteúdo." com "Tentar novamente", sem formulário vazio que poderia ser salvo por cima.

## Requisitos não funcionais

- **Mobile primeiro:** desenhado para 390px, como o design; no desktop, coluna centralizada com largura limitada. Sem rolagem horizontal de 320 a 1440px.
- **Acessibilidade:** axe sem violações; tudo pelo teclado, inclusive mover itens de lista; `label` em todo campo, `fieldset`/`legend` nos grupos; erros ligados ao campo; avisos de salvar em região anunciada; janela de confirmação com foco preso nela e Esc para fechar; toque ≥ 48px (o design usa 44px em alguns botões: vale o CLAUDE.md).
- **Conteúdo seguro:** tudo é tratado como texto; nada de `dangerouslySetInnerHTML`.
- **Segurança:** a escrita continua protegida pelo RLS da 003; o deploy hook fica guardado no banco (cofre do Supabase), fora do navegador e do repositório; nada da `service_role` no cliente.
- **Testes:** nenhum teste acessa o Supabase real nem o Cloudflare.
- **Desempenho:** o site público não muda: o JS inicial segue sem código do admin nem o Zod. O pacote do admin cresce com os schemas e o Zod, carregado só em `/admin`.

## Critérios de aceite

- **CA-01 (RF-01, RF-16)** — Dada uma alteração em qualquer campo, então o status mostra "Alterações não salvas"; depois de salvar, "Última publicação" com a hora.
- **CA-02 (RF-02)** — Dado o seletor, quando escolho uma seção, então o formulário dela aparece e o endereço muda; recarregando, a mesma seção abre.
- **CA-03 (RF-03, teste obrigatório "cobertura do admin")** — Dado cada campo de cada schema, então existe um controle editável para ele no formulário (exceto endereço e dimensões das fotos, preenchidos pela 005); um campo novo de teste no schema aparece sem mudar o admin.
- **CA-04 (RF-05)** — Dado um campo com limite, quando digito, então a contagem acompanha; passando do limite, o erro aparece ao salvar.
- **CA-05 (RF-07)** — Dada uma lista, então consigo adicionar, remover e reordenar só com o teclado; no mínimo e no máximo, os botões correspondentes ficam indisponíveis com explicação.
- **CA-06 (RF-08 a RF-11)** — Dado cada tipo de campo especial, então ele usa o controle descrito; telefone e Instagram digitados em formatos comuns são gravados no formato do schema.
- **CA-07 (RF-12)** — Dado um texto com `[...]`, então aparece o aviso de texto provisório, e salvar continua possível.
- **CA-08 (RF-13)** — Dado um campo inválido, quando salvo, então nada é enviado, o erro aparece junto do campo, o resumo indica a quantidade e o foco vai para o primeiro erro.
- **CA-09 (RF-14, RF-15)** — Dada uma seção válida, quando salvo, então a linha é gravada com `updated_at` e `updated_by` preenchidos pelo banco e o deploy é disparado (provado no banco real pelo roteiro manual).
- **CA-10 (RF-16)** — Dadas as respostas simuladas (sucesso, sem rede, sessão expirada, serviço fora), então aparece o aviso correspondente; nos erros, as alterações continuam na tela.
- **CA-11 (RF-17)** — Dada uma seção alterada em outro lugar, quando salvo, então a gravação é recusada com a mensagem.
- **CA-12 (RF-18)** — Dado o build com `REQUIRE_REMOTE_CONTENT=true` e o banco fora, então o build falha (já coberto pela 001); a variável está no Cloudflare (roteiro manual).
- **CA-13 (RF-19)** — Dado o agendamento anual, então ele existe e chama o mesmo mecanismo de deploy (teste estático e roteiro manual).
- **CA-14 (RF-20)** — Dada uma alteração não salva, quando troco de seção, descarto, vou ao site ou saio, então a janela de confirmação aparece; ao fechar a aba, o navegador avisa.
- **CA-15 (RF-21)** — Dada uma seção sem linha, uma com formato antigo e uma falha de leitura, então o formulário abre com o padrão, com o padrão completado e com a mensagem de erro, respectivamente.
- **CA-16 (RNF)** — Dadas as oito seções em Pixel 7, iPhone 13 e 1440px, então o axe não aponta violações, não há rolagem horizontal, o toque tem ao menos 48px e o fluxo de editar e salvar funciona só com o teclado.

## Casos de borda

- **Seção apagada à mão no banco:** o admin abre com o padrão; salvar recria a linha.
- **Ela salva várias seções seguidas:** cada uma dispara um deploy; o Cloudflare faz um de cada vez, e o último publica tudo.
- **Build falha depois de salvar** (ex.: Cloudflare fora): o site continua na versão anterior. O admin não fica sabendo; o Cloudflare avisa por e-mail se o Thiago ativar as notificações (roteiro manual).
- **Lista no mínimo** (ex.: um único item da formação): remover fica indisponível.
- **Texto colado com quebras de linha num campo de uma linha:** as quebras viram espaço.
- **Campo opcional apagado:** grava `''` (convenção da 001), o que esconde o elemento no site (ex.: Instagram vazio esconde o botão).
- **Conteúdo do banco inválido** (editado à mão no SQL): o formulário abre com os valores e mostra os erros, para ela corrigir.
- **Sessão que expira enquanto ela escreve:** ao salvar, o aviso explica o que aconteceu; para não perder o texto, ela pode copiá-lo antes de entrar de novo (rascunho automático fica fora desta spec).

## Perguntas em aberto

1. **Como disparar o deploy?**
   - **(a) Recomendo:** gatilho no banco. A cada gravação em `site_content`, o próprio Postgres chama o deploy hook do Cloudflare (extensão `pg_net`), com o endereço guardado no cofre do Supabase (Vault). Tudo se instala colando SQL no SQL Editor, como nas migrations anteriores; nada de ferramenta nova.
   - **(b)** Função no Supabase (Edge Function) chamada pelo admin depois de salvar. Exige instalar a CLI do Supabase e publicar a função pela linha de comando.
2. **Pré-visualizar antes de publicar?** Recomendo **não nesta spec**: "Salvar e publicar" já mostra o resultado no site em alguns minutos, e "Ver site" abre a versão no ar. Uma pré-visualização exige montar o site dentro do admin com o rascunho; pode virar uma spec própria depois.
3. **Fotos na 004.** Recomendo: miniatura e texto alternativo agora; o botão "Trocar foto" só na 005, junto do envio.
4. **Telefone e Instagram em formatos livres** (RF-10), normalizados ao salvar. Recomendo sim: o design já mostra o número com máscara, e ela vai digitar do jeito dela.
5. **Novo deploy automático no 1º de janeiro** (RF-19), com o agendador do próprio Supabase (`pg_cron`). Recomendo sim: sem ele, o ano do rodapé fica errado até a primeira edição do ano.
6. **Edição em dois aparelhos** (RF-17): recusar a gravação quando a seção mudou em outro lugar. Recomendo sim; a alternativa, a última gravação vencer, pode apagar sem aviso o que ela fez no outro aparelho.
