/**
 * Folha de estilos encapsulada para a ShadowRoot da extensão Read For Me.
 * Implementa a estética do Player Flutuante (Obsidiana #0B0F17, Superfície #182030,
 * Laranja #FF5500, Âmbar #FFB800 e Marfim #F4F0EA) sem interferir na página hospedeira.
 */
(function inicializarEstilosShadowUi(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const CSS_SHADOW_UI = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
      color: #f4f0ea;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
    }

    /* Botão Flutuante Discreto de Seleção */
    .botao-flutuante-selecao {
      position: fixed;
      z-index: 2147483646;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 13px;
      border-radius: 999px;
      background: rgba(11, 15, 23, 0.95);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 1px solid rgba(255, 85, 0, 0.55);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
      color: #f4f0ea;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease, border-color 0.16s ease, background 0.16s ease;
    }

    .botao-flutuante-selecao:hover {
      background: rgba(20, 26, 38, 0.98);
      border-color: #ff5500;
      transform: translateY(-1px) scale(1.02);
    }

    .botao-flutuante-selecao:active {
      transform: translateY(0) scale(0.98);
    }

    .botao-flutuante-selecao[hidden] {
      display: none !important;
    }

    .icone-onda-audio {
      width: 13px;
      height: 13px;
      color: #ff5500;
      flex-shrink: 0;
    }

    /* Mini-Player Flutuante Opcional (Obsidiana Editorial) */
    .mini-player-container {
      position: fixed;
      z-index: 2147483647;
      width: 420px;
      max-width: calc(100vw - 24px);
      border-radius: 14px;
      background: rgba(11, 15, 23, 0.94);
      backdrop-filter: blur(18px) saturate(190%);
      -webkit-backdrop-filter: blur(18px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(255, 85, 0, 0.22);
      color: #f4f0ea;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
      padding: 10px 14px;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      outline: none;
      cursor: grab;
      touch-action: none;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .mini-player-container[data-arrastando="true"] {
      cursor: grabbing !important;
      border-color: #ff5500;
      box-shadow: 0 28px 56px -10px rgba(0, 0, 0, 0.85), 0 0 0 2px rgba(255, 85, 0, 0.45);
    }

    .mini-player-container:focus-within {
      border-color: rgba(255, 85, 0, 0.6);
    }

    .mini-player-container[hidden] {
      display: none !important;
    }

    /* Cabeçalho e Alça de Arraste */
    .cabecalho-player {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      cursor: grab;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .bloco-marca-status {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .alca-arraste-icone {
      color: #ff5500;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(255, 85, 0, 0.16);
      color: #ff7733;
      border: 1px solid rgba(255, 85, 0, 0.35);
      white-space: nowrap;
    }

    .badge-status[data-modo="fallback"] {
      background: rgba(255, 184, 0, 0.16);
      color: #ffb800;
      border-color: rgba(255, 184, 0, 0.35);
    }

    .ponto-pulsante {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .contador-sentencas {
      font-size: 11.5px;
      color: #94a3b8;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .acoes-cabecalho-player {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .botao-acao-cabecalho,
    .botao-privacidade-modo {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 10.5px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    .botao-acao-cabecalho:hover,
    .botao-privacidade-modo:hover {
      background: rgba(255, 85, 0, 0.15);
      border-color: rgba(255, 85, 0, 0.45);
      color: #ffffff;
    }

    /* Linha Principal de Controles de Reprodução */
    .linha-controles-principais {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .grupo-botoes-transporte {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .botao-controle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(24, 32, 48, 0.85);
      color: #f4f0ea;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }

    .botao-controle:hover:not(:disabled) {
      background: rgba(38, 49, 71, 0.95);
      border-color: rgba(255, 85, 0, 0.55);
    }

    .botao-controle:active:not(:disabled) {
      transform: scale(0.95);
    }

    .botao-controle:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .botao-controle.destaque-play {
      width: 40px;
      height: 36px;
      background: linear-gradient(135deg, #ff5500, #d94600);
      border-color: rgba(255, 136, 0, 0.6);
      color: #ffffff;
    }

    .botao-controle.destaque-play:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff6a1a, #ff5500);
    }

    .botao-controle.botao-parar:hover:not(:disabled) {
      border-color: rgba(248, 113, 113, 0.55);
      color: #fca5a5;
    }

    /* Seletores de Velocidade, Idioma, Voz e Botão de Prévia */
    .bloco-velocidade {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .rotulo-compacto {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      white-space: nowrap;
    }

    .slider-velocidade-player {
      -webkit-appearance: none;
      appearance: none;
      width: 82px;
      height: 6px;
      border-radius: 999px;
      background: rgba(24, 32, 48, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.14);
      outline: none;
      cursor: pointer;
      flex-shrink: 0;
    }

    .slider-velocidade-player::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff5500, #d94600);
      border: 2px solid #f4f0ea;
      cursor: grab;
    }

    .valor-velocidade-player {
      min-width: 42px;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(24, 32, 48, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.14);
      font-size: 11px;
      font-weight: 600;
      color: #f4f0ea;
      font-variant-numeric: tabular-nums;
      text-align: center;
      flex-shrink: 0;
    }


    .rodape-atalhos {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: #64748b;
      padding-top: 2px;
    }

    .tecla-atalho {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      padding: 1px 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #94a3b8;
    }
  `;

  escopoGlobal.ReadForMe.CSS_SHADOW_UI = CSS_SHADOW_UI;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CSS_SHADOW_UI };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
