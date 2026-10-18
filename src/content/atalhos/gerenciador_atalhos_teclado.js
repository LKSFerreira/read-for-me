/**
 * Gerenciador de atalhos de teclado da extensão Read For Me.
 * Atende aos atalhos:
 * - Espaço (quando o Mini-Player possui foco interno no Shadow DOM) -> Pausar/Retomar
 * - Alt+Shift+S -> Pausar/Retomar
 * - Esc -> Encerrar leitura e limpar todos os highlights
 */
(function inicializarGerenciadorAtalhosTeclado(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  class GerenciadorAtalhosTeclado {
    /**
     * @param {Object} parametros
     * @param {function(): boolean} parametros.verificarLeituraAtiva
     * @param {function(): boolean} parametros.verificarFocoNoMiniPlayer
     * @param {function(): void} parametros.aoAlternarPausa
     * @param {function(): void} parametros.aoEncerrarLeitura
     */
    constructor({
      verificarLeituraAtiva,
      verificarFocoNoMiniPlayer,
      aoAlternarPausa,
      aoEncerrarLeitura
    }) {
      this.verificarLeituraAtiva = verificarLeituraAtiva;
      this.verificarFocoNoMiniPlayer = verificarFocoNoMiniPlayer;
      this.aoAlternarPausa = aoAlternarPausa;
      this.aoEncerrarLeitura = aoEncerrarLeitura;
      this.ouvinteKeydownVinculado = this.tratarEventoTeclado.bind(this);
    }

    /**
     * Ativa o listener de teclado no documento.
     * @returns {void}
     */
    inicializar() {
      if (typeof window === 'undefined') {
        return;
      }
      window.addEventListener('keydown', this.ouvinteKeydownVinculado, true);
    }

    /**
     * Remove o listener de teclado do documento.
     * @returns {void}
     */
    destruir() {
      if (typeof window === 'undefined') {
        return;
      }
      window.removeEventListener('keydown', this.ouvinteKeydownVinculado, true);
    }

    /**
     * Trata pressionamentos de teclas para acionar controles de leitura.
     * @param {KeyboardEvent} eventoTeclado
     * @returns {void}
     */
    tratarEventoTeclado(eventoTeclado) {
      if (!eventoTeclado) {
        return;
      }

      // 1. Atalho Global Alt+Shift+S para Pausar/Retomar
      const pressionouAltShiftS =
        eventoTeclado.altKey &&
        eventoTeclado.shiftKey &&
        !eventoTeclado.ctrlKey &&
        !eventoTeclado.metaKey &&
        (eventoTeclado.code === 'KeyS' ||
          String(eventoTeclado.key || '').toUpperCase() === 'S');

      if (pressionouAltShiftS && this.verificarLeituraAtiva()) {
        eventoTeclado.preventDefault();
        eventoTeclado.stopPropagation();
        this.aoAlternarPausa();
        return;
      }

      // 2. Tecla Esc para encerrar imediatamente a leitura e limpar highlights
      if (eventoTeclado.key === 'Escape' && this.verificarLeituraAtiva()) {
        eventoTeclado.preventDefault();
        eventoTeclado.stopPropagation();
        this.aoEncerrarLeitura();
        return;
      }

      // 3. Tecla Espaço quando o Mini-Player estiver em foco dentro do Shadow DOM
      if (
        (eventoTeclado.code === 'Space' || eventoTeclado.key === ' ') &&
        this.verificarLeituraAtiva() &&
        this.verificarFocoNoMiniPlayer()
      ) {
        eventoTeclado.preventDefault();
        eventoTeclado.stopPropagation();
        this.aoAlternarPausa();
      }
    }
  }

  escopoGlobal.ReadForMe.GerenciadorAtalhosTeclado = GerenciadorAtalhosTeclado;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GerenciadorAtalhosTeclado;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
