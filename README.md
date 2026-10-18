# Read For Me

Extensão de leitura de texto (Text-to-Speech) de alta performance para Microsoft Edge e Brave, desenvolvida sobre a especificação Chromium Manifest V3 com foco em estabilidade, fluidez e experiência de usuário premium.

## 🚀 Visão Geral e Diferenciais

- **Motor de Voz Microsoft Natural (Online):** Conexão direta via WebSocket com o endpoint Edge TTS (`speech.platform.bing.com`), garantindo fidelidade e vozes naturais idênticas tanto no Microsoft Edge quanto no Brave (com fallback transparente para `window.speechSynthesis`).
- **Sincronização de Highlight Não-Destrutiva:** Utilização nativa da **CSS Custom Highlight API** (`CSS.highlights` e objetos `Range`), evitando mutações no DOM, quebras em SPAs (React, Vue, Angular) ou reflows pesados.
- **Engine Anti-Corte e Anti-Pulo:**
  - *Sentence Chunking:* Divisão lógica do texto em sentenças para evitar timeouts em seleções longas.
  - *Audio Pre-fetching:* Bufferização antecipada da sentença `N+1` enquanto a sentença `N` é reproduzida, proporcionando transição contínua com latência zero.
  - *Prevenção de Hibernação:* Gerenciamento resiliente do ciclo de vida do Service Worker do Manifest V3.
- **UI/UX com Mini-Player Flutuante:** Barra minimalista encapsulada em Shadow DOM isolado (Dark Mode / Glassmorphism), arrastável, com controles de reprodução, ajuste de velocidade (0.75x a 2.0x), seleção de vozes e atalhos de teclado (`Espaço`, `Alt+Shift+S`, `Esc`).

## 📁 Estrutura do Repositório

```text
├── .agents/                 # Regras, perfis e skills do ecossistema de agentes
├── .metadocs/               # Planos de implementação e histórico de entregas
│   ├── implementation_plan/ # Planos técnicos em andamento
│   └── implemented/         # Entregas concluídas e validadas
├── assets/
│   └── icons/               # Ícones oficiais da extensão (SVG e PNGs 16/32/48/128/300px)
├── docs/
│   └── tutorial_teste_validacao.md # Guia completo de testes, auditoria e publicação
├── src/
│   ├── shared/              # Constantes e utilitários puros (SSML, Base64, tempo)
│   ├── background/          # Service Worker MV3, cliente WebSocket Edge TTS e token DRM
│   └── content/             # Orquestrador, DOM Range, Highlight API, Áudio e UI Shadow DOM
├── tests/                   # Suíte de testes unitários e de integração (Vitest + jsdom)
├── manifest.json            # Manifesto Chromium Manifest V3 (mínimo 116+)
├── package.json             # Scripts de teste e dependências de desenvolvimento
├── AGENTS.md                # Adaptador mestre de diretrizes e perfis de execução
├── PRD.md                   # Requisitos de Produto e Arquitetura da Extensão
├── README.md                # Apresentação do projeto e guia de uso
├── ROADMAP.md               # Roteiro de desenvolvimento e marcos
└── HISTORY.md               # Histórico cronológico de alterações
```

## 🛠️ Como Carregar e Testar a Extensão

1. Execute a suíte de testes automatizados:
   ```bash
   npm test
   ```
2. Abra seu navegador baseado em Chromium (**Microsoft Edge** em `edge://extensions` ou **Brave** em `brave://extensions`).
3. Ative o **Modo do Desenvolvedor** (*Developer Mode*).
4. Clique em **Carregar sem compactação** (*Load unpacked*) e selecione a pasta raiz do repositório (onde reside o `manifest.json`).
5. Selecione um trecho de texto em uma página web e acione a leitura pelo botão flutuante **"Ler"** ou pelo menu de contexto **"Ler seleção com Read For Me"**.
6. Consulte o guia detalhado em [docs/tutorial_teste_validacao.md](docs/tutorial_teste_validacao.md) para o roteiro completo de validação manual e empacotamento para as lojas oficiais.

## 🤖 Operação com Agentes

- `AGENTS.md`: Diretrizes mestras e contrato de linguagem (`pt-BR`).
- `.agents/rules/`: Regras de arquitetura, Clean Code, Git e convenções JavaScript/TypeScript.
- `.agents/skills/`: Ferramentas automatizadas do fluxo (`/plan`, `/feat`, `/commit`, `/sync`, etc.).
