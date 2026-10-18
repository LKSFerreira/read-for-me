# Tutorial de Teste, Validação e Publicação — Read For Me

Este guia apresenta o roteiro completo para validar a extensão **Read For Me** tanto via testes automatizados quanto manualmente nos navegadores **Microsoft Edge** e **Brave**, além das instruções para publicação nas lojas oficiais.

---

## 1. Validação Automatizada (Suíte Vitest + JSDOM)

O projeto possui uma suíte de testes unitários e de integração em `tests/` que valida o protocolo binário/JSON do WebSocket Edge TTS, o alinhamento de `WordBoundary`, o *Sentence Chunking*, a extração não-destrutiva de `Range`s no DOM, a reidratação do Service Worker e a integridade do `manifest.json`.

### 1.1 Executar todos os testes
No terminal, na raiz do projeto, execute:

```powershell
npm test
```

### 1.2 O que cada arquivo de teste verifica
| Arquivo de Teste | Escopo Validado |
|---|---|
| `tests/manifesto.test.js` | Confirma `manifest_version: 3`, `minimum_chrome_version: "116"`, ausência de esquemas inválidos (`wss://`) em `host_permissions`, existência física de todos os arquivos/ícones e ausência de `import`/`export` top-level nos scripts clássicos do Content Script. |
| `tests/utilitarios_texto.test.js` | Testa a sanitização XML/SSML com mapa de offsets e o alinhamento de `WordBoundary` com palavras repetidas, artigos curtos (`"a"`, `"o"`, `"de"`), números e entidades escapadas (`&amp;`). |
| `tests/segmentador_sentencas.test.js` | Testa a divisão de parágrafos em sentenças preservando os índices globais exatos, união de abreviações (`Dr.`, `Sra.`, `art.`, `etc.`) e subdivisão de cláusulas longas (> 280 caracteres). |
| `tests/mapeador_selecao_dom.test.js` | Valida a criação de múltiplos objetos `Range` atravessando tags inline (`<b>`, `<i>`, `<a>`) sem mutar o DOM, o remapeamento automático quando uma SPA re-renderiza o parágrafo e o bloqueio em áreas sensíveis. |
| `tests/cliente_websocket_edge_tts.test.js` | Simula o servidor WebSocket da Microsoft enviando frames binários MP3 (`Path:audio`), metadados (`Path:audio.metadata`) e encerramento (`Path:turn.end`), além de validar o *Circuit Breaker* após 2 falhas consecutivas e o cancelamento via `AbortController`. |
| `tests/orquestrador_leitura_content.test.js` | Valida o pre-fetching concorrente (`N`, `N+1`, `N+2`), o descarte de pacotes obsoletos de sessões antigas ao trocar de voz e a sequência de reidratação da porta (`250ms`, `500ms`, `1000ms`) seguida de fallback local. |

---

## 2. Como Carregar a Extensão no Microsoft Edge e no Brave

A extensão foi arquitetada para carregamento imediato diretamente da raiz do repositório (*Load unpacked*), sem necessidade de etapa prévia de *build*.

### 2.1 No Microsoft Edge
1. Abra uma nova aba e digite `edge://extensions` na barra de endereços.
2. No menu lateral esquerdo (ou canto superior direito), ative a chave **Modo do desenvolvedor** (*Developer mode*).
3. Clique no botão **Carregar sem pacote** (*Load unpacked*).
4. Selecione a pasta raiz deste repositório (`read-for-me`, onde está localizado o arquivo `manifest.json`).
5. Confirme que o cartão **Read For Me — Leitor Neural de Alta Performance** aparece ativo e sem erros.

### 2.2 No Brave Browser
1. Abra uma nova aba e digite `brave://extensions` na barra de endereços.
2. No canto superior direito, ative a chave **Modo do desenvolvedor** (*Developer mode*).
3. Clique no botão **Carregar sem compactação** (*Load unpacked*).
4. Selecione a pasta raiz deste repositório (`read-for-me`).
5. Confirme que a extensão aparece ativa com seu ícone oficial.

> **Nota Importante:** Se você já estava com uma página web aberta antes de carregar ou recarregar a extensão, pressione `F5` na página web para que os Content Scripts sejam injetados.

---

## 3. Roteiro Passo a Passo de Validação Funcional

### Teste 1: Ativação por Botão Flutuante e Menu de Contexto
1. Acesse qualquer artigo ou documentação web (ex.: `https://pt.wikipedia.org` ou uma página de notícias).
2. Selecione um parágrafo de texto com o mouse:
   - **Resultado esperado:** Um botão flutuante escuro estilizado (**"Ler seleção"**) surge discretamente próximo ao final da seleção.
3. Clique no botão **"Ler seleção"** (ou clique com o botão direito sobre o texto selecionado e escolha **"Ler seleção"** no menu de contexto do navegador):
   - **Resultado esperado:** O **Mini-Player Flutuante** aparece no canto inferior direito da janela.

### Teste 2: Consentimento de Privacidade e Escolha do Motor
1. Na primeira vez em que a leitura é acionada, o Mini-Player exibe o aviso de privacidade informando que as vozes **Microsoft Natural Online** enviam o trecho selecionado ao serviço de fala da Microsoft:
   - Clique em **Usar voz natural** para autorizar o motor neural online (WebSocket Edge TTS).
   - A qualquer momento, clique no botão **Privacidade** no cabeçalho do Mini-Player para alternar entre **Usar voz natural** e **Usar voz local** (`window.speechSynthesis`).

### Teste 3: Sincronização de Highlight Não-Destrutiva (`CSS.highlights`)
1. Abra o **DevTools** (`F12`) na aba **Elements** e inspecione o parágrafo de texto que você selecionou na página.
2. Inicie a leitura pelo Mini-Player e observe simultaneamente a página e a árvore HTML no DevTools:
   - **Na página:** A frase inteira atual recebe um fundo azul translúcido suave (`::highlight(leitura-frase-ativa)`) e cada palavra pronunciada recebe um destaque amarelo forte com sublinhado (`::highlight(leitura-palavra-ativa)`).
   - **No DevTools (Aba Elements):** Verifique que **nenhuma tag `<span>` ou `<mark>` é criada ou modificada** dentro do parágrafo da página hospedeira.

### Teste 4: Controles do Mini-Player, Pre-fetching e Velocidade em Tempo Real
1. Selecione um texto com 4 ou mais frases e inicie a leitura:
   - Observe que a transição da `Frase 1` para a `Frase 2` ocorre instantaneamente, pois as frases `N+1` e `N+2` já foram pré-carregadas em memória.
2. **Arraste (Draggable):** Segure pelo cabeçalho do Mini-Player (ícone de 6 pontos) e arraste-o para outra posição da tela. Recarregue a página (`F5`), inicie uma nova leitura e confirme que a posição foi memorizada.
3. **Velocidade em Tempo Real:** No meio de uma frase longa, altere o seletor **Ritmo** de `1.0x` para `1.5x` ou `2.0x`:
   - **Resultado esperado:** A velocidade da fala muda imediatamente sem reiniciar a frase, sem distorcer o tom da voz e mantendo a sincronização exata do highlight palavra por palavra.
4. **Filtro de Idioma e Seletor de Voz:**
   - Verifique que as vozes em **Português (`pt-BR`)** e **Inglês (`en-US`)** aparecem agrupadas no topo do seletor.
   - Troque a voz durante a leitura (ex.: de `Francisca` para `Antonio` ou `Thalita`): a frase atual reinicia imediatamente com a nova voz escolhida.

### Teste 5: Atalhos de Teclado
1. Com a leitura em andamento, pressione `Alt+Shift+S`:
   - **Resultado esperado:** A leitura pausa; pressione `Alt+Shift+S` novamente e a leitura retoma do ponto exato.
2. Clique dentro do Mini-Player para dar foco a ele e pressione a barra de `Espaço`:
   - **Resultado esperado:** Alterna entre pausa e reprodução.
3. Pressione a tecla `Esc`:
   - **Resultado esperado:** O áudio para imediatamente, os highlights de frase e palavra são removidos da página e o Mini-Player é fechado.

### Teste 6: Resiliência do Service Worker e Fallback Offline
1. **Teste de Queda do Service Worker:**
   - Durante a leitura de um texto longo, abra `edge://extensions` ou `brave://extensions` em outra aba e clique no link **Service Worker (Inspecionar visualizações)** ou encerre o Service Worker.
   - **Resultado esperado:** O Content Script detecta o evento `onDisconnect`, reconecta automaticamente (`250ms` -> `500ms` -> `1000ms`), reenvia as requisições pendentes e mantém a leitura ativa.
2. **Teste de Fallback Offline (`window.speechSynthesis`):**
   - No DevTools do Service Worker (aba *Network*), mude para **Offline** (ou escolha **Usar voz local** no botão **Privacidade** do player).
   - **Resultado esperado:** O badge de status no Mini-Player muda para amarelo (**"Voz Local"**) e a leitura prossegue utilizando a voz local equivalente do sistema operacional.

---

## 4. Ícones e Preparação para Publicação nas Lojas Oficiais

Os ícones oficiais foram gerados em `assets/icons/` cumprindo os requisitos técnicos da **Chrome Web Store** e do **Microsoft Edge Add-ons Partner Center**:

- `assets/icons/icon-16.png` (`16x16` px — Barra de ferramentas e menu de contexto)
- `assets/icons/icon-32.png` (`32x32` px — Telas Retina / Windows)
- `assets/icons/icon-48.png` (`48x48` px — Página de gerenciamento `extensions`)
- `assets/icons/icon-128.png` (`128x128` px — Instalação e listagem na Chrome Web Store)
- `assets/icons/icon-300.png` (`300x300` px — Logotipo de vitrine exigido pelo Microsoft Edge Add-ons)
- `assets/icons/icon.svg` (Arquivo vetorial matriz em alta resolução)

### Como gerar o pacote `.zip` limpo para envio às lojas
Para empacotar apenas os arquivos de produção da extensão (excluindo `node_modules`, `tests` e metadados de desenvolvimento), execute no PowerShell na raiz do repositório:

```powershell
Compress-Archive -Path manifest.json, src, assets, README.md -DestinationPath read-for-me-store-package.zip -Force
```
