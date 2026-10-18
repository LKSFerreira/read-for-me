/**
 * Mapeia a seleção de texto do usuário em referências concretas de TextNodes
 * e fabrica objetos Range nativos para a CSS Custom Highlight API sem mutar o DOM,
 * incluindo recuperação resiliente caso uma aplicação SPA re-renderize o parágrafo.
 */
(function inicializarMapeadorSelecaoDom(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const TAGS_BLOCO_HTML = new Set([
    'P',
    'DIV',
    'LI',
    'UL',
    'OL',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'BLOCKQUOTE',
    'PRE',
    'TR',
    'TD',
    'TH',
    'ARTICLE',
    'SECTION',
    'HEADER',
    'FOOTER'
  ]);

  const TAGS_IGNORADAS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

  class MapeadorSelecaoDom {
    /**
     * Verifica se o nó pertence a um campo sensível (ex.: senha) ou ao próprio host da extensão.
     * @param {Node | null} noAlvo
     * @returns {boolean}
     */
    static estaEmCampoSensivel(noAlvo) {
      if (!noAlvo) {
        return false;
      }
      const elementoBase =
        noAlvo.nodeType === Node.ELEMENT_NODE ? noAlvo : noAlvo.parentElement;
      if (!elementoBase || typeof elementoBase.closest !== 'function') {
        return false;
      }
      return Boolean(
        elementoBase.closest(
          'input[type="password"], [data-read-for-me-ignore="true"], #read-for-me-host-raiz'
        )
      );
    }

    /**
     * Captura a seleção atual do navegador e constrói o mapa completo de nós e sentenças.
     * @param {Selection} selecaoNavegador
     * @returns {Object | null}
     */
    static mapearSelecaoAtual(selecaoNavegador) {
      if (
        !selecaoNavegador ||
        selecaoNavegador.rangeCount === 0 ||
        selecaoNavegador.isCollapsed
      ) {
        return null;
      }

      const rangeOriginal = selecaoNavegador.getRangeAt(0).cloneRange();
      if (MapeadorSelecaoDom.estaEmCampoSensivel(rangeOriginal.commonAncestorContainer)) {
        return null;
      }

      const retanguloAncoraInicial =
        typeof rangeOriginal.getBoundingClientRect === 'function'
          ? rangeOriginal.getBoundingClientRect()
          : { top: 20, bottom: 40, left: 20, right: 120, width: 100, height: 20 };

      const elementoAncestralRaiz =
        rangeOriginal.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? rangeOriginal.commonAncestorContainer
          : rangeOriginal.commonAncestorContainer.parentElement;

      const dadosExtracao = MapeadorSelecaoDom.extrairSegmentosTextoDeRange(rangeOriginal);
      if (!dadosExtracao.textoCompleto.trim()) {
        return null;
      }

      const { SegmentadorSentencas } = escopoGlobal.ReadForMe;
      const sentencasMapeadas = SegmentadorSentencas.segmentarTextoEmSentencas(
        dadosExtracao.textoCompleto
      );
      if (sentencasMapeadas.length === 0) {
        return null;
      }

      let segmentosNosTextoAtuais = dadosExtracao.segmentosNosTexto;

      return {
        textoCompleto: dadosExtracao.textoCompleto,
        sentencasMapeadas,
        retanguloAncoraInicial,
        elementoAncestralRaiz,

        /**
         * Cria a lista de objetos Range para o intervalo global [inicioGlobalAlvo, fimGlobalAlvo].
         * Se uma SPA tiver re-renderizado os nós de texto, tenta remapear no ancestral conectado.
         * @param {number} inicioGlobalAlvo
         * @param {number} fimGlobalAlvo
         * @returns {Range[]}
         */
        criarRangesParaIntervaloGlobal(inicioGlobalAlvo, fimGlobalAlvo) {
          let segmentosCandidatos = segmentosNosTextoAtuais.filter(
            (segmento) =>
              segmento.fimGlobal > inicioGlobalAlvo &&
              segmento.inicioGlobal < fimGlobalAlvo
          );

          const algumNoDesconectado =
            segmentosCandidatos.length === 0 ||
            segmentosCandidatos.some((segmento) => !segmento.noTexto.isConnected);

          if (algumNoDesconectado && elementoAncestralRaiz && elementoAncestralRaiz.isConnected) {
            const remapeado = MapeadorSelecaoDom.remapearTextoEmElementoAncestral(
              elementoAncestralRaiz,
              dadosExtracao.textoCompleto
            );
            if (remapeado.length > 0) {
              segmentosNosTextoAtuais = remapeado;
              segmentosCandidatos = segmentosNosTextoAtuais.filter(
                (segmento) =>
                  segmento.fimGlobal > inicioGlobalAlvo &&
                  segmento.inicioGlobal < fimGlobalAlvo &&
                  segmento.noTexto.isConnected
              );
            }
          }

          const rangesGerados = [];
          for (const segmento of segmentosCandidatos) {
            if (!segmento.noTexto.isConnected) {
              continue;
            }
            const comprimentoSegmento = segmento.offsetFinalNoNo - segmento.offsetInicialNoNo;
            const deslocamentoRelativoInicio = Math.max(
              0,
              inicioGlobalAlvo - segmento.inicioGlobal
            );
            const deslocamentoRelativoFim = Math.min(
              comprimentoSegmento,
              fimGlobalAlvo - segmento.inicioGlobal
            );

            if (deslocamentoRelativoFim > deslocamentoRelativoInicio) {
              const novoRange = document.createRange();
              novoRange.setStart(
                segmento.noTexto,
                segmento.offsetInicialNoNo + deslocamentoRelativoInicio
              );
              novoRange.setEnd(
                segmento.noTexto,
                segmento.offsetInicialNoNo + deslocamentoRelativoFim
              );
              rangesGerados.push(novoRange);
            }
          }
          return rangesGerados;
        }
      };
    }

    /**
     * Extrai todos os TextNodes intersectados pelo Range e constrói o texto linear com offsets.
     * @param {Range} rangeSelecao
     * @returns {{ textoCompleto: string, segmentosNosTexto: Array }}
     */
    static extrairSegmentosTextoDeRange(rangeSelecao) {
      const segmentosNosTexto = [];
      let textoCompleto = '';
      let ultimoElementoBloco = null;

      const obterBlocoPai = (noTexto) => {
        let atual = noTexto.parentElement;
        while (atual && atual !== document.body) {
          if (TAGS_BLOCO_HTML.has(atual.tagName)) {
            return atual;
          }
          atual = atual.parentElement;
        }
        return document.body;
      };

      const registrarNoTexto = (noTexto) => {
        const elementoPai = noTexto.parentElement;
        if (!elementoPai || TAGS_IGNORADAS.has(elementoPai.tagName)) {
          return;
        }
        if (MapeadorSelecaoDom.estaEmCampoSensivel(elementoPai)) {
          return;
        }

        const offsetInicialNoNo =
          noTexto === rangeSelecao.startContainer ? rangeSelecao.startOffset : 0;
        const offsetFinalNoNo =
          noTexto === rangeSelecao.endContainer
            ? rangeSelecao.endOffset
            : noTexto.nodeValue.length;

        if (offsetFinalNoNo <= offsetInicialNoNo) {
          return;
        }

        const blocoAtual = obterBlocoPai(noTexto);
        if (
          ultimoElementoBloco !== null &&
          blocoAtual !== ultimoElementoBloco &&
          !textoCompleto.endsWith('\n')
        ) {
          textoCompleto += '\n';
        }
        ultimoElementoBloco = blocoAtual;

        const trechoTexto = noTexto.nodeValue.slice(offsetInicialNoNo, offsetFinalNoNo);
        const inicioGlobal = textoCompleto.length;
        textoCompleto += trechoTexto;
        const fimGlobal = textoCompleto.length;

        segmentosNosTexto.push({
          noTexto,
          offsetInicialNoNo,
          offsetFinalNoNo,
          inicioGlobal,
          fimGlobal
        });
      };

      if (rangeSelecao.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        registrarNoTexto(rangeSelecao.commonAncestorContainer);
      } else {
        const caminhanteArvore = document.createTreeWalker(
          rangeSelecao.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(noCandidato) {
              return rangeSelecao.intersectsNode(noCandidato)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            }
          }
        );
        let noAtual = caminhanteArvore.nextNode();
        while (noAtual) {
          registrarNoTexto(noAtual);
          noAtual = caminhanteArvore.nextNode();
        }
      }

      return { textoCompleto, segmentosNosTexto };
    }

    /**
     * Tenta reconstruir os segmentos de TextNodes após re-renderização de um componente SPA.
     * @param {Element} elementoAncestralRaiz
     * @param {string} textoOriginalEsperado
     * @returns {Array}
     */
    static remapearTextoEmElementoAncestral(elementoAncestralRaiz, textoOriginalEsperado) {
      const rangeInteiroAncestral = document.createRange();
      rangeInteiroAncestral.selectNodeContents(elementoAncestralRaiz);
      const extracaoAncestral = MapeadorSelecaoDom.extrairSegmentosTextoDeRange(
        rangeInteiroAncestral
      );
      const deslocamentoBase = extracaoAncestral.textoCompleto.indexOf(textoOriginalEsperado);
      if (deslocamentoBase === -1) {
        return [];
      }

      const fimBase = deslocamentoBase + textoOriginalEsperado.length;
      const novosSegmentos = [];
      for (const seg of extracaoAncestral.segmentosNosTexto) {
        if (seg.fimGlobal <= deslocamentoBase || seg.inicioGlobal >= fimBase) {
          continue;
        }
        const recorteInicio = Math.max(0, deslocamentoBase - seg.inicioGlobal);
        const recorteFim = Math.min(
          seg.offsetFinalNoNo - seg.offsetInicialNoNo,
          fimBase - seg.inicioGlobal
        );
        novosSegmentos.push({
          noTexto: seg.noTexto,
          offsetInicialNoNo: seg.offsetInicialNoNo + recorteInicio,
          offsetFinalNoNo: seg.offsetInicialNoNo + recorteFim,
          inicioGlobal: Math.max(0, seg.inicioGlobal - deslocamentoBase),
          fimGlobal: Math.min(textoOriginalEsperado.length, seg.fimGlobal - deslocamentoBase)
        });
      }
      return novosSegmentos;
    }
  }

  escopoGlobal.ReadForMe.MapeadorSelecaoDom = MapeadorSelecaoDom;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapeadorSelecaoDom;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
