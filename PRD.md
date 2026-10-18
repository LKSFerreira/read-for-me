Atue como um Engenheiro de Software Sênior especialista em Extensões de Navegador (Chromium/Manifest V3) e UI/UX.

Crie uma extensão de leitura de texto (Text-to-Speech) de alta performance, compatível com Microsoft Edge e Brave, focada em estabilidade, fluidez e excelente experiência de usuário.

### 1. Funcionalidades Principais e Fluxo de Uso
- **Ativação:** O usuário seleciona um trecho de texto na página, clica com o botão direito e aciona a opção "Ler seleção" no menu de contexto (ou clica em um botão flutuante discreto que aparece próximo à seleção).
- **Motor de Voz (Compatibilidade Edge + Brave):** A extensão deve utilizar as vozes "Microsoft Natural (Online)". Como o Brave não expõe essas vozes nativamente na Web Speech API, implemente a conexão via WebSocket com o endpoint do Edge TTS (`speech.platform.bing.com`) para garantir que todas as vozes naturais da Microsoft funcionem de forma idêntica no Edge e no Brave, com fallback para `window.speechSynthesis`.
- **Sincronização de Highlight (Texto e Palavra):** Enquanto o áudio é reproduzido, destaque visualmente a frase atual com uma cor de fundo suave e a palavra exata sendo falada com um destaque mais forte, utilizando os metadados `WordBoundary` do stream de áudio.

### 2. Requisitos de Estabilidade (Anti-Corte e Anti-Pulo)
- **Sentence Chunking:** Divida o texto selecionado em sentenças lógicas (baseado em pontuação) para evitar timeouts e cortes abruptos em textos longos.
- **Audio Pre-fetching (Buffer):** Enquanto a sentença `N` estiver tocando, a sentença `N+1` já deve ser sintetizada e armazenada em buffer na memória para que a transição entre frases tenha latência zero.
- **Prevenção de Hibernação:** Garanta que o áudio não seja interrompido pelo ciclo de vida do Service Worker do Manifest V3.

### 3. Requisitos de Performance e DOM
- **Zero Mutação Destrutiva no DOM:** NÃO envolva palavras do site em tags `<span>` ou `<mark>`, pois isso quebra aplicações React/SPA e causa reflow lento. Utilize a **CSS Custom Highlight API** (`CSS.highlights` e objetos `Range`) para renderizar o highlight com performance nativa.
- **Isolamento com Shadow DOM:** Todo elemento de UI injetado na página deve ficar encapsulado dentro de um `Shadow DOM` (modo `closed` ou `open`) para evitar conflitos de CSS com a página hospedeira.

### 4. Requisitos de UI/UX
- **Mini-Player Flutuante (In-Page):** Ao iniciar a leitura, exiba uma barra flutuante moderna, minimalista e arrastável (estilo Glassmorphism / Dark Mode elegante) contendo:
  - Botão Play/Pause e Stop.
  - Botões para Pular/Voltar para a próxima/anterior frase.
  - Seletor rápido de velocidade (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) que altera o ritmo em tempo real.
  - Seletor de Vozes Naturais com filtro por idioma (priorizando `pt-BR` e `en-US` no topo).
- **Persistência:** Salve a voz escolhida e a velocidade preferida no `chrome.storage.local` para manter a configuração entre sessões e abas.
- **Atalhos:** Suporte `Espaço` (quando o player estiver em foco) ou `Alt+Shift+S` para pausar/retomar e `Esc` para encerrar a leitura e limpar os highlights.

### 5. Entregáveis
Forneça a estrutura completa de arquivos (`manifest.json`, `background.js`, `content.js`, `popup/player UI` e estilos), com o código completo, funcional, modularizado e sem placeholders.