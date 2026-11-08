# Design de referência

Exportado do canvas "Landing Page Psicóloga" (Claude Design) em 2026-11-07. **Não é código de produção**: serve só como referência visual para as specs 002 a 004.

| Tela | Print | HTML | Largura |
|---|---|---|---|
| Site — mobile (prioridade) | `mobile.png` | `mobile.html` | 390px |
| Site — desktop | `desktop.png` | `desktop.html` | 1440px |
| Admin — login | `admin-login.png` | `admin-login.html` | 390px |
| Admin — editor (Sobre mim) | `admin-editor-sobre.png` | `admin-editor-sobre.html` | 390px |
| Admin — editor (Contato) | `admin-editor-contato.png` | `admin-editor-contato.html` | 390px |

Os HTMLs têm os valores exatos (cores, tamanhos, espaçamentos, raios, sombras e os SVGs dos ícones) em `style` inline. Abra no navegador ou leia direto. Os prints foram tirados com as animações desligadas e o header/botão flutuante sem `position: fixed`.

## Prioridade em caso de conflito

`CLAUDE.md` e as specs aprovadas > conteúdo (`src/content`) > estes arquivos.

## Diferenças conhecidas entre o design e as specs

- **Texto dos blocos de foto** ("Foto: retrato profissional" etc.): existe só no design. No site, o bloco de espera não mostra texto visível; o `alt` do conteúdo é o nome acessível (RF-15, RF-22).
- **Links do header no desktop**: o design mostra 4 links + "Agendar consulta"; a spec 002 usa os 6 de `geral.menu`. Vale a spec; confira se cabem em 1024px.
- **Números dos passos**: no mobile o design usa círculo verde com "1, 2, 3"; no desktop, "01, 02, 03" grande com linha verde em cima. A spec 002 (RF-09) define a numeração; o formato visual segue o design.
- **Botão flutuante**: no print do desktop ele aparece no meio da página só por causa da captura; no site fica fixo no canto inferior direito (RF-13).
- **Ícones de WhatsApp/Instagram/e-mail/telefone**: desenhos de linha simples, no estilo dos demais (traço 1.8).
- **Admin**: o seletor de seção (lista de 8) e os campos de cada seção seguem o modelo de conteúdo da spec 001, não apenas as duas telas de exemplo.
