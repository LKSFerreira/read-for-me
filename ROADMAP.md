# Roadmap do Projeto: Read For Me

Este documento é a fonte de verdade do planejamento, status e evolução técnica da extensão.

## 🎯 Objetivo Geral

Construir uma extensão de leitura de texto (Text-to-Speech) de alta performance compatível com Microsoft Edge e Brave (Manifest V3), utilizando vozes Microsoft Natural via WebSocket, CSS Custom Highlight API não-destrutiva, bufferização antecipada de áudio e UI com Mini-Player flutuante em Shadow DOM.

## 📊 Estado Atual

- [x] Inicialização do repositório, regras multiagente e documentação base (`init`).
- [x] Elaboração do plano de implementação detalhado em [.metadocs/implementation_plan/extensao_tts_completa.md](.metadocs/implementation_plan/extensao_tts_completa.md).
- [x] Implementação integral dos módulos da extensão (`manifest.json`, `src/shared/`, `src/background/`, `src/content/`), ícones (`assets/icons/`) e suíte de testes automatizados (`tests/`).
- [x] Elaboração do tutorial de testes e validação em [docs/tutorial_teste_validacao.md](docs/tutorial_teste_validacao.md).

---

## 🗺️ Fases de Desenvolvimento

### Fase 1: Arquitetura Base e Manifesto (Manifest V3)
- [x] Criação do `manifest.json` com permissões adequadas (`contextMenus`, `storage`, `https://speech.platform.bing.com/*`, `minimum_chrome_version: "116"`).
- [x] Definição da estrutura modular de código (`src/shared/`, `src/background/`, `src/content/`).
- [x] Configuração de menu de contexto ("Ler seleção com Read For Me") e ícones oficiais (`16`, `32`, `48`, `128` e `300` px).

### Fase 2: Motor de Voz (Edge TTS WebSocket & Bufferização)
- [x] Conexão e protocolo WebSocket com endpoint Edge TTS (`speech.platform.bing.com`) e autenticação SHA-256 (`Sec-MS-GEC`).
- [x] Extração de áudio e metadados de sincronização (`WordBoundary`) com mapeamento de código Unicode para UTF-16.
- [x] Fallback transparente para `window.speechSynthesis` com resolução de vozes assíncrona (`voiceschanged`).
- [x] Algoritmo de Sentence Chunking (`Intl.Segmenter` + heurística de abreviações em `pt-BR`/`en-US`).
- [x] Audio Pre-fetching com janela deslizante concorrente (`N`, `N+1`, `N+2`).
- [x] Estratégia resiliente contra hibernação do Service Worker MV3 (`chrome.runtime.Port` + reconciliação de requisições órfãs).

### Fase 3: Sincronização e Highlight Não-Destrutivo
- [x] Implementação de highlight via **CSS Custom Highlight API** (`CSS.highlights` e `Range`).
- [x] Destaque suave para a sentença ativa e destaque reforçado para a palavra corrente via `WordBoundary`.
- [x] Preservação integral do DOM (compatibilidade com React, Vue e SPAs sem mutações, com degradação graciosa se nós forem desmontados).
- [x] Limpeza automática de ranges e highlights ao pausar, parar ou fechar.

### Fase 4: Mini-Player Flutuante e Experiência do Usuário (UI/UX)
- [x] Encapsulamento completo da interface em **Shadow DOM** isolado (`mode: 'closed'`).
- [x] Mini-player arrastável (Draggable via Pointer Events) com design Glassmorphism / Dark Mode elegante.
- [x] Controles de reprodução: Play, Pause, Stop, Pular/Voltar sentenças e estado visual de carregamento.
- [x] Controle dinâmico de taxa de reprodução (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
- [x] Seletor de vozes naturais com agrupamento e filtro prioritário (`pt-BR` e `en-US`).
- [x] Botão flutuante discreto próximo à seleção de texto com proteção contra campos de senha e dados financeiros.
- [x] Modal de consentimento de privacidade no primeiro uso e persistência em `chrome.storage.local`.
- [x] Suporte a atalhos de teclado: `Espaço` (quando focado), `Alt+Shift+S` e `Esc`.

### Fase 5: Validação, Compatibilidade e Performance
- [x] Suíte de testes unitários e de integração automatizados com Vitest e `jsdom` (`20/20` testes aprovados).
- [x] Tutorial completo de teste cruzado no Microsoft Edge e Brave em [docs/tutorial_teste_validacao.md](docs/tutorial_teste_validacao.md).
- [ ] Validação manual em navegador pelo usuário no Microsoft Edge e Brave.
