# 003 — Admin: autenticação

> Status: **concluída** (2026-11-10). Gate 1 aprovado em 2026-11-08, com as recomendações das três decisões abaixo.
> Data: 2026-11-08 · Depende de: 000 (concluída, exceto CA-13 e CA-19), 001 e 002 (concluídas)
> Referência visual: `docs/design/admin-login.png` e `.html`. Em conflito: CLAUDE.md/spec > design.

## Contexto

O site público está no ar, e o link "Área restrita" do rodapé leva a `/admin/login`, que hoje é um `<main>` vazio. O banco já guarda o conteúdo, mas ninguém consegue gravar nele: a 001 deixou a escrita fechada à espera da tabela `admins`, prevista para esta spec.

Antes de construir o editor (004), a psicóloga precisa entrar com segurança, e só ela pode alterar o site. Ela não é da área técnica: as telas precisam ser simples, e as mensagens de erro, claras.

O admin já é carregado sob demanda, e o visitante do site não baixa esse código (000). Esta spec precisa manter isso, agora com o SDK do Supabase dentro do admin.

## Objetivo

Ao final da 003:
- a psicóloga entra em `/admin/login` com e-mail e senha, continua conectada ao voltar e sai quando quiser;
- ela recupera o acesso sozinha quando esquece a senha;
- sem sessão válida de administradora, nenhuma tela protegida abre;
- o banco aceita escrita em `site_content` apenas de quem está em `admins`, mesmo que alguém contorne a tela;
- o JS inicial do site público não recebe código do admin nem o SDK.

## Fora de escopo

- Formulários de edição, salvar e publicar, status de publicação e deploy hook (004). Aqui `/admin` é só uma casca protegida.
- Upload de fotos e políticas de Storage (005).
- Cadastro público, login social, login por link mágico e autenticação em dois fatores.
- Tela para gerenciar administradoras: a lista muda direto no banco.
- Domínio próprio.

## Requisitos funcionais

- **RF-01 — Rotas.** Públicas: `/admin/login`, `/admin/recuperar-senha` e `/admin/nova-senha`. Protegida: `/admin`. Caminho desconhecido em `/admin/…` continua indo para `/admin` (000). As duas rotas novas ampliam a linha "Rotas" do CLAUDE.md §5, que passa a "Definido" com esta spec.
- **RF-02 — Tela de login.** Segue o design: "Voltar ao site" (com recarregamento, porque o site não faz parte do roteador do admin), monograma, "Área administrativa", "Entre para editar textos e fotos do site.", campos E-mail e Senha, "Entrar", "Esqueci minha senha" e o aviso "Acesso exclusivo da administradora do site.". O monograma usa `geral.initials`; se o conteúdo não estiver disponível, aparece um círculo com ícone de cadeado, ocupando o mesmo espaço.
- **RF-03 — Mostrar e ocultar a senha.** Um botão alterna a visibilidade, sem enviar o formulário e sem perder o que foi digitado. O nome acessível muda entre "Mostrar senha" e "Ocultar senha".
- **RF-04 — Entrar.** Campos vazios ou e-mail malformado mostram o erro junto do campo, sem chamar o servidor. Durante o envio, o botão fica desabilitado e indica que está carregando, o que impede envio duplo. Ao dar certo, vai para `/admin`.
- **RF-05 — Mensagens de erro.** Em português e sem termos técnicos. Credenciais erradas mostram sempre "E-mail ou senha incorretos.", sem revelar se o e-mail existe. Sem internet, muitas tentativas e serviço indisponível têm cada um a sua mensagem. O erro é anunciado a leitores de tela.
- **RF-06 — Recuperar a senha.** "Esqueci minha senha" abre `/admin/recuperar-senha`, com campo de e-mail, botão de envio e link de volta ao login. Depois de enviar, a tela mostra sempre "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.", exista a conta ou não.
- **RF-07 — Nova senha.** O link do e-mail abre `/admin/nova-senha`, com "Nova senha" e "Confirmar nova senha" (cada um com mostrar/ocultar). Mínimo de 8 caracteres, e os dois campos precisam ser iguais. Ao salvar, avisa que deu certo e vai para `/admin`. Link expirado, já usado ou acesso direto sem link mostram uma mensagem e o caminho para pedir outro.
- **RF-08 — Sessão persistente.** Ao fechar e reabrir o navegador, ela continua conectada até sair ou a sessão deixar de valer. A renovação é automática. Enquanto a sessão é verificada, aparece um estado neutro de carregamento, sem piscar a tela de login nem a protegida.
- **RF-09 — Proteção de rotas.** Sem sessão válida, qualquer rota protegida redireciona para `/admin/login`, trocando a entrada do histórico para o botão Voltar não ficar preso. Quem já está conectado e abre `/admin/login` vai para `/admin`. Se a sessão acabar durante o uso, volta para o login com o aviso "Sua sessão expirou. Entre novamente.". Teste obrigatório.
- **RF-10 — Só administradoras.** Depois de entrar, o sistema confere se a conta está em `admins`. Se não estiver, a sessão é encerrada e o login mostra "Esta conta não tem acesso à área administrativa.". Se a verificação falhar por erro de rede, nada protegido abre: aparece uma mensagem com "Tentar novamente", sem encerrar a sessão.
- **RF-11 — Sair.** O botão "Sair" encerra a sessão neste aparelho e volta para o login. Se o servidor não responder, a sessão local é apagada mesmo assim.
- **RF-12 — Casca de `/admin`.** Cabeçalho com "Editar site", "Ver site" (com recarregamento) e "Sair". O conteúdo do editor fica para a 004.
- **RF-13 — Banco de dados.** Migration nova com:
  - tabela `admins`, com uma linha por conta e ligação com `auth.users`;
  - cada usuário autenticado consegue ler apenas a própria linha de `admins`, e nenhum papel do cliente consegue inserir, alterar ou apagar nela;
  - em `site_content`, inserir e atualizar exigem conta listada em `admins`, e apagar continua proibido para todos os papéis do cliente;
  - a leitura pública de `site_content` e o bloqueio de escrita do papel anônimo continuam como estão.
- **RF-14 — Configuração do Supabase (manual, feita pelo Thiago, com roteiro no plano).** Cadastro público desligado; conta criada à mão; linha inserida em `admins`; URLs de redirecionamento do site cadastradas; envio de e-mail conforme a Pergunta 1; variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no Cloudflare.
- **RF-15 — SDK só no admin.** O SDK do Supabase entra apenas no pacote do admin. A verificação de orçamento (`npm run size`) passa a falhar se ele aparecer no JS inicial do site.
- **RF-16 — Sem configuração.** Se as variáveis públicas do Supabase faltarem, as telas do admin abrem e mostram "Área administrativa indisponível no momento.", sem tela em branco e sem detalhe técnico para quem visita.

## Requisitos não funcionais

- **Mobile primeiro:** telas pensadas para 390px, sem rolagem horizontal de 320 a 1440px; no desktop, o formulário fica centralizado com largura limitada.
- **Acessibilidade:** axe sem violações em todas as telas; navegação completa por teclado, com foco visível; `label` em todos os campos; erros ligados ao campo; foco levado ao erro ao enviar com problema.
- **Áreas de toque ≥ 48px** (CLAUDE.md §7). O design usa 44px em "Voltar ao site", "Esqueci minha senha" e no botão do olho: vale o CLAUDE.md.
- **Gerenciadores de senha:** `autocomplete` correto em cada campo (`email`, `current-password`, `new-password`).
- **Segurança:**
  - a proteção real é o RLS no banco; as telas só organizam a experiência;
  - apenas a chave pública no frontend, nunca a `service_role`;
  - senha e tokens nunca aparecem em logs, na URL que fica no histórico ou em mensagens;
  - depois do login, o destino é sempre `/admin`, sem parâmetro de retorno, o que elimina redirecionamento aberto.
- **Privacidade:** nenhum dado de paciente é coletado.
- **Testes:** nenhum teste acessa o Supabase real: MSW nos unitários e interceptação de rede no E2E. O RLS é conferido por teste estático da migration e, depois de aplicada, pelo roteiro manual do CA-14.
- **Desempenho:** o JS inicial do site não recebe código do admin nem o SDK (74,5 KB gzip antes desta spec, 74,7 KB depois: a lista de arquivos do admin, que passou a incluir o CSS dele, e o reconhecimento do retorno do link de recuperação, da T11). Texto ajustado com o Thiago em 2026-11-09.

## Critérios de aceite

- **CA-01 (RF-01)** — Dadas as rotas, quando abro cada uma, então a tela correspondente aparece; dado `/admin/inexistente` com sessão, então vou para `/admin`.
- **CA-02 (RF-02)** — Dada a tela de login em 390px, então todos os elementos do design aparecem na ordem; "Voltar ao site" é um link comum para `/`. Dado o conteúdo indisponível, então o círculo com cadeado aparece, sem deslocar o layout.
- **CA-03 (RF-03)** — Dada uma senha digitada, quando clico em "Mostrar senha", então o campo vira texto, o valor continua, nada é enviado e o nome muda para "Ocultar senha".
- **CA-04 (RF-04)** — Dados campos vazios ou e-mail inválido, então o erro aparece junto do campo e nenhuma requisição sai. Dadas credenciais válidas, então vou para `/admin`. Dado um duplo clique em "Entrar", então sai uma única requisição.
- **CA-05 (RF-05)** — Dada cada resposta simulada (credencial inválida, sem rede, limite de tentativas, serviço fora), então aparece a mensagem correspondente, em região anunciada a leitores de tela, sem texto técnico do servidor.
- **CA-06 (RF-06)** — Dado um e-mail cadastrado e outro não cadastrado, então a mensagem final é idêntica. Dada falha de rede, então aparece erro e o formulário permite tentar de novo.
- **CA-07 (RF-07)** — Dado um link válido, quando informo senhas iguais com 8 ou mais caracteres, então a senha é salva e vou para `/admin`. Dadas senhas diferentes ou curtas, então o erro aparece e nada é enviado. Dado link expirado ou acesso direto, então aparece a mensagem com o caminho para pedir outro.
- **CA-08 (RF-08)** — Dada uma sessão salva, quando reabro `/admin`, então entro sem digitar nada e o login não pisca. Dada a verificação em andamento, então só aparece o estado de carregamento.
- **CA-09 (RF-09, teste obrigatório)** — Sem sessão, cada rota protegida redireciona para o login sem renderizar conteúdo protegido, e o Voltar não retorna a ela. Com sessão, `/admin/login` vai para `/admin`. Quando a sessão acaba durante o uso, volto ao login com o aviso.
- **CA-10 (RF-10)** — Dada uma conta fora de `admins`, então a sessão é encerrada e aparece a mensagem de acesso negado. Dado erro de rede na verificação, então nada protegido abre, "Tentar novamente" funciona e a sessão continua.
- **CA-11 (RF-11)** — Quando clico em "Sair", então a sessão acaba, volto ao login e `/admin` deixa de abrir. Dado o servidor sem resposta, então o resultado é o mesmo.
- **CA-12 (RF-12)** — Dada uma sessão de administradora, então `/admin` mostra "Editar site", "Ver site" e "Sair"; "Ver site" é um link comum para `/`.
- **CA-13 (RF-13)** — Dado o teste estático da migration, então existem a tabela `admins`, RLS ligado, leitura restrita à própria linha, nenhuma política de escrita em `admins`, inserção e atualização de `site_content` condicionadas a `admins`, nenhuma política de exclusão e nenhuma menção a `service_role`.
- **CA-14 (RF-13, RF-14; manual, depois de aplicar a migration)** — Dado o roteiro no SQL Editor e no app publicado: anônimo não grava; conta autenticada fora de `admins` não grava; administradora grava; ninguém do cliente altera `admins`; não é possível criar conta nova; o e-mail de recuperação chega e o link funciona.
- **CA-15 (RF-15)** — Dado o build, então o JS inicial continua abaixo de 150 KB e não contém o SDK; dado um manifest de exemplo com o SDK no conjunto inicial, então a verificação falha.
- **CA-16 (RF-16)** — Dadas as variáveis ausentes, então as telas do admin mostram a mensagem de indisponibilidade, sem erro não tratado.
- **CA-17 (RNF)** — Dadas todas as telas, em Pixel 7, iPhone 13 e 1440px, então o axe não aponta violações, não há rolagem horizontal, as áreas de toque têm ao menos 48px, o console fica limpo e o fluxo completo funciona só com o teclado.

## Casos de borda

- **Sessão aberta em duas abas:** ao sair em uma, a outra volta ao login na próxima verificação ou ação.
- **Link de recuperação aberto em outro aparelho** (pedido no computador, aberto no celular): precisa funcionar.
- **Link de recuperação que volta para outro endereço** (a Site URL, quando o e-mail é enviado pelo painel do Supabase ou o endereço de volta não é aceito): chegando ao site ou a outra rota do admin, o link é levado à tela de nova senha. Acrescentado em 2026-11-10, depois do teste real (T11).
- **Conta removida de `admins` com a sessão aberta:** perde o acesso à tela na próxima verificação; o banco já recusa a escrita de imediato.
- **Supabase pausado por inatividade:** login mostra "serviço indisponível"; o site público continua no ar.
- **Autopreenchimento do navegador:** o formulário reconhece os valores preenchidos.
- **E-mail com maiúsculas ou espaços nas pontas:** é normalizado antes do envio.
- **Pedidos de recuperação repetidos:** o limite do serviço vira a mensagem de "muitas tentativas", sem mudar a garantia de não revelar se a conta existe.
- **Senha colada com espaços:** é respeitada como digitada, sem cortes.

## Perguntas em aberto

1. **Como enviar o e-mail de recuperação?** O envio padrão do Supabase só entrega para membros da equipe do projeto, tem limite de cerca de 2 e-mails por hora e, em projetos novos do plano gratuito, não permite personalizar o texto (provavelmente fica em inglês).
   - **(a) Recomendo por enquanto:** convidar o e-mail dela para a equipe do projeto no Supabase. Sem custo e sem configuração extra, com e-mail em inglês.
   - **(b)** Configurar um SMTP próprio, com e-mail em português. Serviços como o Resend exigem domínio próprio, que ainda não existe. Dá para migrar depois sem mudar o código.
2. **Quem fica em `admins`?** Recomendo só ela, criando também uma conta para você apenas se quiser dar suporte pelo painel do site. A tabela aceita várias linhas.
3. **Quem aplica a migration?** Ela é colada no SQL Editor, como na 001. Recomendo você aplicar, seguindo o roteiro do plano, depois que os testes estáticos passarem.
