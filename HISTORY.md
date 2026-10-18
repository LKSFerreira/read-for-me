# Histórico

Registre aqui entregas concluídas, decisões importantes e links para `.metadocs/implemented/`.

## Entradas

- **2026-10-18**: Redesenho e compactação da interface do Mini-Player Flutuante in-page:
  - Remoção da linha inferior de seleção de voz (idioma, dropdown de voz e prévia), concentrando a configuração detalhada de vozes no painel de opções/popup da extensão.
  - Reorganização dos botões do cabeçalho: remoção do botão `Motor`, reposicionamento do botão `Ocultar` e inclusão do botão `Configurações` que dispara `chrome.runtime.openOptionsPage()`.
  - Posicionamento padrão inicial no topo da janela (`top: 20px`, centralizado horizontalmente) e persistência estrita da posição arrastada em `chrome.storage.local` (`readForMe_posicaoMiniPlayer`).
  - Ajuste ergonômico dos controles de transporte e slider de velocidade (`0.75x` a `2.00x` com resolução de `0.01`).
  - Atualização e expansão da suíte de testes em `tests/orquestrador_leitura_content.test.js` (28/28 testes aprovados).
- **2026-10-17**: Inicialização do projeto baseada no `PRD.md` através da skill `init`. Configuração da stack JavaScript/TypeScript para extensão Chromium Manifest V3, definição do `ROADMAP.md`, atualização do `README.md` e configuração do `AGENTS.md`.
