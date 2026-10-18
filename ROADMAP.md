# Roadmap do Projeto: Read For Me

Este documento é a fonte de verdade do planejamento, status e evolução técnica da extensão.

## 🎯 Objetivo Geral

Construir uma extensão de leitura de texto (Text-to-Speech) de alta performance compatível com Microsoft Edge e Brave (Manifest V3), utilizando vozes Microsoft Natural via WebSocket, CSS Custom Highlight API não-destrutiva, bufferização antecipada de áudio e UI com Mini-Player flutuante em Shadow DOM.

## 📊 Estado Atual

- [x] Inicialização do repositório, regras multiagente e documentação base (`init`).
- [ ] Elaboração do plano de implementação detalhado em `.metadocs/implementation_plan/`.
- [ ] Scaffold dos arquivos base da extensão (`manifest.json` e módulos estruturais).

---

## 🗺️ Fases de Desenvolvimento

### Fase 1: Arquitetura Base e Manifesto (Manifest V3)
- [ ] Criação do `manifest.json` com permissões adequadas (`contextMenus`, `storage`, `activeTab`, `scripting`, `offscreen` se necessário).
- [ ] Definição da estrutura modular de código (`src/background/`, `src/content/`, `src/tts/`, `src/ui/`).
- [ ] Configuração de menu de contexto ("Ler seleção").

### Fase 2: Motor de Voz (Edge TTS WebSocket & Bufferização)
- [ ] Conexão e protocolo WebSocket com endpoint Edge TTS (`speech.platform.bing.com`).
- [ ] Extração de áudio e metadados de sincronização (`WordBoundary`).
- [ ] Fallback transparente para `window.speechSynthesis`.
- [ ] Algoritmo de Sentence Chunking para divisão inteligente de sentenças.
- [ ] Audio Pre-fetching: buffer da sentença `N+1` durante a execução da sentença `N`.
- [ ] Estratégia de keep-alive para evitar hibernação do Service Worker durante a leitura.

### Fase 3: Sincronização e Highlight Não-Destrutivo
- [ ] Implementação de highlight via **CSS Custom Highlight API** (`CSS.highlights` e `Range`).
- [ ] Destaque suave para a sentença ativa e destaque reforçado para a palavra corrente via `WordBoundary`.
- [ ] Preservação integral do DOM (compatibilidade com React, Vue e SPAs sem mutações).
- [ ] Limpeza automática de ranges e highlights ao pausar, parar ou fechar.

### Fase 4: Mini-Player Flutuante e Experiência do Usuário (UI/UX)
- [ ] Encapsulamento completo da interface em **Shadow DOM** isolado.
- [ ] Mini-player arrastável (Draggable) com design Glassmorphism / Dark Mode elegante.
- [ ] Controles de reprodução: Play, Pause, Stop, Pular/Voltar sentenças.
- [ ] Controle dinâmico de taxa de reprodução (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
- [ ] Seletor de vozes naturais com agrupamento e filtro prioritário (`pt-BR` e `en-US`).
- [ ] Botão flutuante discreto próximo à seleção de texto.
- [ ] Persistência de configurações e preferências em `chrome.storage.local`.
- [ ] Suporte a atalhos de teclado: `Espaço` (quando focado), `Alt+Shift+S` e `Esc`.

### Fase 5: Validação, Compatibilidade e Performance
- [ ] Teste cruzado no Microsoft Edge e Brave.
- [ ] Testes de robustez com textos longos, artigos e páginas com SPAs dinâmicas.
- [ ] Validação de latência zero na troca de sentenças (transição de áudio imperceptível).
