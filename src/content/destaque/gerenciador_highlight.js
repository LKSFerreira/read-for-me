/**
 * Controlador de destaques visuais não-destrutivos utilizando a CSS Custom Highlight API.
 * Renderiza simultaneamente o destaque suave da sentença ativa e o destaque forte da palavra falada,
 * com suporte a personalização dinâmica de cores, opacidade e sublinhado em tempo real.
 */
(function inicializarGerenciadorHighlight(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};
  const { CONSTANTES_SISTEMA } = escopoGlobal.ReadForMe;

  /**
   * Converte uma cor hexadecimal (#RRGGBB ou #RGB) e opacidade em rgba(r, g, b, a).
   * @param {string} corHex
   * @param {number} opacidade
   * @returns {string}
   */
  function converterHexParaRgba(corHex, opacidade) {
    const alfa = Number.isFinite(Number(opacidade))
      ? Math.max(0, Math.min(1, Number(opacidade)))
      : 0.14;
    if (typeof corHex !== 'string' || !corHex.startsWith('#')) {
      return `rgba(100, 116, 139, ${alfa})`;
    }
    let hexLimpo = corHex.slice(1).trim();
    if (hexLimpo.length === 3) {
      hexLimpo = hexLimpo
        .split('')
        .map((caractere) => caractere + caractere)
        .join('');
    }
    if (hexLimpo.length !== 6) {
      return `rgba(100, 116, 139, ${alfa})`;
    }
    const vermelho = parseInt(hexLimpo.slice(0, 2), 16);
    const verde = parseInt(hexLimpo.slice(2, 4), 16);
    const azul = parseInt(hexLimpo.slice(4, 6), 16);
    if (Number.isNaN(vermelho) || Number.isNaN(verde) || Number.isNaN(azul)) {
      return `rgba(100, 116, 139, ${alfa})`;
    }
    return `rgba(${vermelho}, ${verde}, ${azul}, ${alfa})`;
  }

  class GerenciadorHighlight {
    constructor() {
      this.suportaApiHighlight =
        typeof CSS !== 'undefined' &&
        'highlights' in CSS &&
        typeof Highlight !== 'undefined';
      this.estiloAtual = {
        ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO
      };
    }

    /**
     * Aplica as cores e preferências de destaque na página através de folha de estilo dinâmica.
     * @param {Object} novoEstilo
     * @returns {void}
     */
    aplicarEstiloPersonalizado(novoEstilo = {}) {
      this.estiloAtual = {
        ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
        ...(novoEstilo && typeof novoEstilo === 'object' ? novoEstilo : {})
      };

      if (this.suportaApiHighlight) {
        if (!this.estiloAtual.destacarFrase) {
          CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA);
        }
        if (!this.estiloAtual.destacarPalavra) {
          CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA);
        }
      }

      if (typeof document === 'undefined' || !document.head) {
        return;
      }

      let elementoEstilo = document.getElementById(
        CONSTANTES_SISTEMA.ID_ESTILO_HIGHLIGHT_DINAMICO
      );
      if (!elementoEstilo) {
        elementoEstilo = document.createElement('style');
        elementoEstilo.id = CONSTANTES_SISTEMA.ID_ESTILO_HIGHLIGHT_DINAMICO;
        document.head.appendChild(elementoEstilo);
      }

      const fundoFraseRgba = this.estiloAtual.destacarFrase
        ? converterHexParaRgba(
            this.estiloAtual.corFrase,
            this.estiloAtual.opacidadeFrase
          )
        : 'transparent';

      const fundoPalavra = this.estiloAtual.destacarPalavra
        ? this.estiloAtual.corFundoPalavra || '#e2e8f0'
        : 'transparent';

      const corTextoPalavra =
        this.estiloAtual.destacarPalavra &&
        this.estiloAtual.corFundoPalavra !== 'transparent'
          ? this.estiloAtual.corTextoPalavra || '#0f172a'
          : 'inherit';

      const decoracaoSublinhado =
        this.estiloAtual.destacarPalavra && this.estiloAtual.sublinharPalavra
          ? `text-decoration: underline; text-decoration-color: ${this.estiloAtual.corFrase || '#64748b'}; text-underline-offset: 3px;`
          : 'text-decoration: none;';

      elementoEstilo.textContent = `
        ::highlight(${CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA}) {
          background-color: ${fundoFraseRgba} !important;
          color: inherit !important;
        }
        ::highlight(${CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA}) {
          background-color: ${fundoPalavra} !important;
          color: ${corTextoPalavra} !important;
          ${decoracaoSublinhado}
        }
      `;
    }

    /**
     * Destaca visualmente a sentença ativa com cor de fundo suave.
     * @param {Range[]} rangesSentenca - Lista de objetos Range que cobrem a sentença.
     * @returns {void}
     */
    destacarSentenca(rangesSentenca) {
      if (!Array.isArray(rangesSentenca) || rangesSentenca.length === 0) {
        return;
      }

      this.garantirVisibilidadeNaViewport(rangesSentenca[0]);

      if (!this.suportaApiHighlight) {
        return;
      }

      CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.PALAVRA_ATIVA);

      if (!this.estiloAtual.destacarFrase) {
        CSS.highlights.delete(CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA);
        return;
      }

      const objetoHighlightSentenca = new Highlight(...rangesSentenca);
      CSS.highlights.set(
        CONSTANTES_SISTEMA.NOMES_HIGHLIGHT.FRASE_ATIVA,
        objetoHighlightSentenca
      );
    }

    /**
     * Destaca visualmente a palavra exata sendo pronunciada no instante atual.
     * @param {Range[]} rangesPalavra - Lista de objetos Range que cobrem a palavra ativa.
     * @returns {void}
     */
    destacarPalavra(rangesPalavra) {
      if (
        !this.suportaApiHighlight ||
        !this.estiloAtual.destacarPalavra ||
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
  escopoGlobal.ReadForMe.converterHexParaRgba = converterHexParaRgba;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GerenciadorHighlight;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
