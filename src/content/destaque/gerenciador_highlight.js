/**
 * Controlador de destaques visuais não-destrutivos utilizando a CSS Custom Highlight API.
 * Renderiza simultaneamente o destaque suave da sentença ativa e o destaque forte da palavra falada.
 */
(function inicializarGerenciadorHighlight(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};
  const { CONSTANTES_SISTEMA } = escopoGlobal.ReadForMe;

  class GerenciadorHighlight {
    constructor() {
      this.suportaApiHighlight =
        typeof CSS !== 'undefined' &&
        'highlights' in CSS &&
        typeof Highlight !== 'undefined';
    }

    /**
     * Destaca visualmente a sentença ativa com cor de fundo suave.
     * @param {Range[]} rangesSentenca - Lista de objetos Range que cobrem a sentença.
     * @returns {void}
     */
    destacarSentenca(rangesSentenca) {
      if (
        !this.suportaApiHighlight ||
        !Array.isArray(rangesSentenca) ||
        rangesSentenca.length === 0
      ) {
        return;
      }

      const objetoHighlightSentenca = new Highlight(...rangesSentenca);
      CSS.highlights.set(
        CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA,
        objetoHighlightSentenca
      );
      CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA);
      this.garantirVisibilidadeNaViewport(rangesSentenca[0]);
    }

    /**
     * Destaca visualmente a palavra exata sendo pronunciada no instante atual.
     * @param {Range[]} rangesPalavra - Lista de objetos Range que cobrem a palavra ativa.
     * @returns {void}
     */
    destacarPalavra(rangesPalavra) {
      if (
        !this.suportaApiHighlight ||
        !Array.isArray(rangesPalavra) ||
        rangesPalavra.length === 0
      ) {
        return;
      }

      const objetoHighlightPalavra = new Highlight(...rangesPalavra);
      CSS.highlights.set(
        CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA,
        objetoHighlightPalavra
      );
    }

    /**
     * Remove apenas o destaque da palavra atual (mantendo o destaque da frase).
     * @returns {void}
     */
    limparDestaquePalavra() {
      if (!this.suportaApiHighlight) {
        return;
      }
      CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA);
    }

    /**
     * Remove imediatamente todos os destaques visuais de frase e palavra da página.
     * @returns {void}
     */
    limparTodosOsDestaques() {
      if (!this.suportaApiHighlight) {
        return;
      }
      CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA);
      CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA);
    }

    /**
     * Rola suavemente a página caso a sentença atual esteja fora da área visível da viewport.
     * @param {Range} primeiroRange - Primeiro Range da sentença ativa.
     * @returns {void}
     */
    garantirVisibilidadeNaViewport(primeiroRange) {
      if (!primeiroRange || typeof primeiroRange.getBoundingClientRect !== 'function') {
        return;
      }
      const retangulo = primeiroRange.getBoundingClientRect();
      if (retangulo.width === 0 && retangulo.height === 0) {
        return;
      }
      const margemSegurancaPx = 80;
      const alturaJanela = typeof window !== 'undefined' ? window.innerHeight : 800;
      const estaAcimaDaTela = retangulo.top < margemSegurancaPx;
      const estaAbaixoDaTela = retangulo.bottom > alturaJanela - margemSegurancaPx;

      if (estaAcimaDaTela || estaAbaixoDaTela) {
        const elementoAncora =
          primeiroRange.startContainer.nodeType === Node.ELEMENT_NODE
            ? primeiroRange.startContainer
            : primeiroRange.startContainer.parentElement;
        if (elementoAncora && typeof elementoAncora.scrollIntoView === 'function') {
          elementoAncora.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }

  escopoGlobal.ReadForMe.GerenciadorHighlight = GerenciadorHighlight;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GerenciadorHighlight;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
