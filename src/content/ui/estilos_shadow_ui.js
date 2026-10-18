/**
 * Folha de estilos encapsulada para a ShadowRoot da extensão Read For Me.
 * Implementa estética Glassmorphism / Dark Mode elegante sem interferir na página hospedeira.
 */
(function inicializarEstilosShadowUi(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const CSS_SHADOW_UI = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif;
      color: #f8fafc;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Botão Flutuante Discreto de Seleção */
    .botao-flutuante-selecao {
      position: fixed;
      z-index: 2147483646;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 1px solid rgba(56, 189, 248, 0.38);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.06);
      color: #f8fafc;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      pointer-events: auto;
      transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.16s ease, border-color 0.16s ease, background 0.16s ease;
    }

    .botao-flutuante-selecao:hover {
      background: rgba(30, 41, 59, 0.96);
      border-color: #38bdf8;
      transform: translateY(-1px) scale(1.02);
    }

    .botao-flutuante-selecao:active {
      transform: translateY(0) scale(0.98);
    }

    .botao-flutuante-selecao[hidden] {
      display: none !important;
    }

    .icone-onda-audio {
      width: 15px;
      height: 15px;
      color: #38bdf8;
      flex-shrink: 0;
    }

    /* Mini-Player Flutuante (Glassmorphism Dark Mode) */
    .mini-player-container {
      position: fixed;
      z-index: 2147483647;
      width: 440px;
      max-width: calc(100vw - 24px);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(18px) saturate(190%);
      -webkit-backdrop-filter: blur(18px) saturate(190%);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 22px 45px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.14);
      color: #f8fafc;
      padding: 12px 14px;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      outline: none;
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .mini-player-container:focus-within {
      border-color: rgba(56, 189, 248, 0.55);
      box-shadow: 0 22px 45px -12px rgba(0, 0, 0, 0.75), 0 0 0 2px rgba(56, 189, 248, 0.32);
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
      touch-action: none;
    }

    .cabecalho-player:active {
      cursor: grabbing;
    }

    .bloco-marca-status {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .alca-arraste-icone {
      color: #64748b;
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
      background: rgba(56, 189, 248, 0.14);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.28);
      white-space: nowrap;
    }

    .badge-status[data-modo="fallback"] {
      background: rgba(250, 204, 21, 0.14);
      color: #facc15;
      border-color: rgba(250, 204, 21, 0.3);
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

    .botao-privacidade-modo {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      border-radius: 6px;
      padding: 2px 7px;
      font-size: 10.5px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .botao-privacidade-modo:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    /* Banner de Consentimento de Privacidade */
    .painel-consentimento {
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .painel-consentimento[hidden] {
      display: none !important;
    }

    .texto-consentimento {
      font-size: 12px;
      line-height: 1.45;
      color: #e2e8f0;
      margin: 0;
    }

    .acoes-consentimento {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    .botao-consentimento {
      padding: 5px 10px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: filter 0.15s ease, background 0.15s ease;
    }

    .botao-consentimento.primario {
      background: #0284c7;
      color: #ffffff;
    }

    .botao-consentimento.secundario {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.16);
      color: #f8fafc;
    }

    .botao-consentimento.perigo {
      background: transparent;
      color: #94a3b8;
    }

    .botao-consentimento:hover {
      filter: brightness(1.12);
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
    }

    .botao-controle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(30, 41, 59, 0.75);
      color: #f1f5f9;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
    }

    .botao-controle:hover:not(:disabled) {
      background: rgba(51, 65, 85, 0.9);
      border-color: rgba(56, 189, 248, 0.45);
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
      background: linear-gradient(135deg, #0284c7, #0369a1);
      border-color: rgba(56, 189, 248, 0.5);
      color: #ffffff;
    }

    .botao-controle.destaque-play:hover:not(:disabled) {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
    }

    .botao-controle.botao-parar:hover:not(:disabled) {
      border-color: rgba(248, 113, 113, 0.55);
      color: #fca5a5;
    }

    /* Seletores de Velocidade, Idioma e Voz */
    .bloco-velocidade {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .rotulo-compacto {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
    }

    .seletor-estilizado {
      appearance: none;
      -webkit-appearance: none;
      background-color: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 10px;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s ease, background-color 0.15s ease;
    }

    .seletor-estilizado:hover, .seletor-estilizado:focus {
      border-color: #38bdf8;
      background-color: rgba(30, 41, 59, 1);
    }

    .seletor-estilizado option, .seletor-estilizado optgroup {
      background-color: #0f172a;
      color: #f8fafc;
    }

    .linha-seletores-voz {
      display: grid;
      grid-template-columns: 125px 1fr;
      gap: 8px;
      align-items: center;
    }

    .seletor-voz-expandido {
      width: 100%;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
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
