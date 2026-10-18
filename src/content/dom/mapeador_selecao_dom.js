/**
 * Mapeia seleções de texto ou qualquer ponto clicado na página em referências concretas
 * de TextNodes e fabrica objetos Range nativos para a CSS Custom Highlight API sem mutar o DOM.
 * Suporta:
 * 1. Leitura Contínua ("Ler a partir daqui"): inicia em uma letra, palavra ou parágrafo
 *    clicado/selecionado e continua buscando e lendo todas as sentenças até o fim do conteúdo;
 * 2. Expansão dinâmica de DOM caso novos parágrafos sejam carregados durante a leitura;
 * 3. Leitura restrita apenas ao trecho selecionado;
 * 4. Recuperação resiliente caso uma aplicação SPA re-renderize o parágrafo.
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
    'FOOTER',
    'MAIN',
    'ASIDE',
    'FIGCAPTION',
    'DT',
    'DD'
  ]);

  const TAGS_IGNORADAS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEMPLATE',
    'SVG',
    'CANVAS',
    'IFRAME',
    'OBJECT',
    'HEAD',
    'BUTTON',
    'SELECT',
    'TEXTAREA',
    'INPUT'
  ]);

  const SELETOR_ESTRUTURAS_NAVEGACAO_SECUNDARIA =
    'nav, [role="navigation"], [aria-hidden="true"], #read-for-me-host-raiz, [data-read-for-me-ignore="true"]';

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
     * Verifica se um nó está visível e legível para o fluxo contínuo da página.
     * @param {Node} noTexto
     * @param {Element | null} [ancestralExplicitoUsuario] - Se o usuário clicou dentro de um nav/header, permite ler dentro dele.
     * @returns {boolean}
     */
    static ehNoTextoLegivelNoFluxo(noTexto, ancestralExplicitoUsuario = null) {
      if (!noTexto || noTexto.nodeType !== Node.TEXT_NODE) {
        return false;
      }
      if (!noTexto.nodeValue || !noTexto.nodeValue.trim()) {
        return false;
      }

      const elementoPai = noTexto.parentElement;
      if (!elementoPai || TAGS_IGNORADAS.has(elementoPai.tagName)) {
        return false;
      }
      if (MapeadorSelecaoDom.estaEmCampoSensivel(elementoPai)) {
        return false;
      }

      if (typeof elementoPai.closest === 'function') {
        if (elementoPai.closest('[hidden], script, style, noscript, template, svg')) {
          return false;
        }
        const estruturaSecundaria = elementoPai.closest(
          SELETOR_ESTRUTURAS_NAVEGACAO_SECUNDARIA
        );
        if (
          estruturaSecundaria &&
          (!ancestralExplicitoUsuario ||
            !estruturaSecundaria.contains(ancestralExplicitoUsuario))
        ) {
          return false;
        }
      }

      return true;
    }

    /**
     * Captura a seleção atual do navegador e constrói o mapa de nós e sentenças.
     * @param {Selection} selecaoNavegador
     * @param {Object} [opcoes]
     * @param {boolean} [opcoes.continuarAteFimDoConteudo=false] - Se true, lê a partir do início da seleção até o fim da página.
     * @returns {Object | null}
     */
    static mapearSelecaoAtual(selecaoNavegador, opcoes = {}) {
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

      if (opcoes.continuarAteFimDoConteudo) {
        return MapeadorSelecaoDom.mapearFluxoContinuoAPartirDeRangeInicial(rangeOriginal);
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

      return MapeadorSelecaoDom.construirObjetoMapaDeLeitura({
        dadosExtracao,
        retanguloAncoraInicial,
        elementoAncestralRaiz,
        leituraContinuaAtiva: false
      });
    }

    /**
     * Inicia o mapeamento contínuo a partir de uma letra/palavra selecionada, do ponto de clique
     * direito ("Ler a partir daqui") ou do início do conteúdo principal da página.
     * @param {Object} parametros
     * @param {Selection | null} [parametros.selecaoNavegador]
     * @param {{ noInicial?: Node, offsetInicial?: number, elementoAlvo?: Element, clientX?: number, clientY?: number } | null} [parametros.pontoClique]
     * @returns {Object | null}
     */
    static mapearLeituraAPartirDaqui({ selecaoNavegador = null, pontoClique = null } = {}) {
      // 1. Se houver seleção não-colapsada na página (mesmo de 1 única letra ou palavra), usa o início dela
      if (
        selecaoNavegador &&
        selecaoNavegador.rangeCount > 0 &&
        !selecaoNavegador.isCollapsed
      ) {
        const rangeSelecao = selecaoNavegador.getRangeAt(0).cloneRange();
        if (!MapeadorSelecaoDom.estaEmCampoSensivel(rangeSelecao.commonAncestorContainer)) {
          const mapaAPartirDaSelecao =
            MapeadorSelecaoDom.mapearFluxoContinuoAPartirDeRangeInicial(rangeSelecao);
          if (mapaAPartirDaSelecao) {
            return mapaAPartirDaSelecao;
          }
        }
      }

      // 2. Se houver um cursor/caret colapsado ou ponto de clique direito ("Ler a partir daqui" sem seleção)
      const rangePonto = MapeadorSelecaoDom.resolverRangeInicialDePontoOuPagina(
        selecaoNavegador,
        pontoClique
      );
      if (!rangePonto) {
        return null;
      }

      return MapeadorSelecaoDom.mapearFluxoContinuoAPartirDeRangeInicial(rangePonto, true);
    }

    /**
     * Resolve o Range inicial exato quando o usuário aciona "Ler a partir daqui" sem selecionar texto.
     * @param {Selection | null} selecaoNavegador
     * @param {Object | null} pontoClique
     * @returns {Range | null}
     */
    static resolverRangeInicialDePontoOuPagina(selecaoNavegador, pontoClique) {
      if (typeof document === 'undefined' || !document.body) {
        return null;
      }

      // A. Se já temos noInicial capturado no momento do contextmenu
      if (pontoClique && pontoClique.noInicial && pontoClique.noInicial.isConnected) {
        const rangeDireto = MapeadorSelecaoDom.criarRangeAPartirDeNoEOffset(
          pontoClique.noInicial,
          pontoClique.offsetInicial || 0,
          true
        );
        if (rangeDireto) {
          return rangeDireto;
        }
      }

      // B. Tenta descobrir via coordenadas (clientX, clientY) usando APIs de Caret do navegador
      if (
        pontoClique &&
        typeof pontoClique.clientX === 'number' &&
        typeof pontoClique.clientY === 'number'
      ) {
        const pontoCaret = MapeadorSelecaoDom.obterNoEOffsetPorCoordenadas(
          pontoClique.clientX,
          pontoClique.clientY
        );
        if (pontoCaret) {
          const rangePorCoordenada = MapeadorSelecaoDom.criarRangeAPartirDeNoEOffset(
            pontoCaret.no,
            pontoCaret.offset,
            true
          );
          if (rangePorCoordenada) {
            return rangePorCoordenada;
          }
        }
      }

      // C. Se o usuário clicou sobre um elemento específico (ex.: <p>, <li>, <h2>, <div>)
      if (
        pontoClique &&
        pontoClique.elementoAlvo &&
        pontoClique.elementoAlvo.isConnected &&
        !MapeadorSelecaoDom.estaEmCampoSensivel(pontoClique.elementoAlvo)
      ) {
        const primeiroNoNoElemento = MapeadorSelecaoDom.encontrarPrimeiroNoTextoLegivel(
          pontoClique.elementoAlvo,
          pontoClique.elementoAlvo
        );
        if (primeiroNoNoElemento) {
          const rangeElemento = document.createRange();
          rangeElemento.setStart(primeiroNoNoElemento, 0);
          rangeElemento.setEnd(primeiroNoNoElemento, primeiroNoNoElemento.nodeValue.length);
          return rangeElemento;
        }
      }

      // D. Se houver um cursor (caret) posicionado na página
      if (selecaoNavegador && selecaoNavegador.rangeCount > 0) {
        const rangeCursor = selecaoNavegador.getRangeAt(0);
        if (
          rangeCursor.startContainer &&
          rangeCursor.startContainer.isConnected &&
          !MapeadorSelecaoDom.estaEmCampoSensivel(rangeCursor.startContainer)
        ) {
          const rangeDoCursor = MapeadorSelecaoDom.criarRangeAPartirDeNoEOffset(
            rangeCursor.startContainer,
            rangeCursor.startOffset,
            true
          );
          if (rangeDoCursor) {
            return rangeDoCursor;
          }
        }
      }

      // E. Fallback: começa do início do conteúdo principal da página (<article>, <main> ou <body>)
      const containerPrincipal =
        document.querySelector('article, main, [role="main"]') || document.body;
      const primeiroNoPagina = MapeadorSelecaoDom.encontrarPrimeiroNoTextoLegivel(
        containerPrincipal
      );
      if (!primeiroNoPagina) {
        return null;
      }

      const rangePagina = document.createRange();
      rangePagina.setStart(primeiroNoPagina, 0);
      rangePagina.setEnd(primeiroNoPagina, primeiroNoPagina.nodeValue.length);
      return rangePagina;
    }

    /**
     * Usa caretRangeFromPoint ou caretPositionFromPoint para encontrar o nó de texto sob (x, y).
     * @param {number} clientX
     * @param {number} clientY
     * @returns {{ no: Node, offset: number } | null}
     */
    static obterNoEOffsetPorCoordenadas(clientX, clientY) {
      if (typeof document === 'undefined') {
        return null;
      }
      if (typeof document.caretPositionFromPoint === 'function') {
        const posicao = document.caretPositionFromPoint(clientX, clientY);
        if (posicao && posicao.offsetNode) {
          return { no: posicao.offsetNode, offset: posicao.offset || 0 };
        }
      }
      if (typeof document.caretRangeFromPoint === 'function') {
        const range = document.caretRangeFromPoint(clientX, clientY);
        if (range && range.startContainer) {
          return { no: range.startContainer, offset: range.startOffset || 0 };
        }
      }
      return null;
    }

    /**
     * Cria um Range posicionado no início da palavra correspondente ao (no, offset).
     * @param {Node} noAlvo
     * @param {number} offsetAlvo
     * @param {boolean} recuarParaInicioDaPalavra
     * @returns {Range | null}
     */
    static criarRangeAPartirDeNoEOffset(
      noAlvo,
      offsetAlvo,
      recuarParaInicioDaPalavra = false
    ) {
      if (!noAlvo || MapeadorSelecaoDom.estaEmCampoSensivel(noAlvo)) {
        return null;
      }

      if (noAlvo.nodeType === Node.TEXT_NODE && noAlvo.nodeValue.trim().length > 0) {
        const texto = noAlvo.nodeValue;
        let offsetAjustado = Math.max(0, Math.min(texto.length, offsetAlvo));

        if (recuarParaInicioDaPalavra) {
          // Se clicou em um espaço em branco logo antes da palavra, avança até a palavra;
          // se clicou no meio da palavra, recua até o começo daquela palavra.
          while (offsetAjustado > 0 && /\S/.test(texto[offsetAjustado - 1])) {
            offsetAjustado -= 1;
          }
        }

        const range = document.createRange();
        range.setStart(noAlvo, offsetAjustado);
        range.setEnd(noAlvo, texto.length);
        return range;
      }

      const raizBusca =
        noAlvo.nodeType === Node.ELEMENT_NODE ? noAlvo : noAlvo.parentElement;
      const primeiroNoTexto = MapeadorSelecaoDom.encontrarPrimeiroNoTextoLegivel(
        raizBusca,
        raizBusca
      );
      if (!primeiroNoTexto) {
        return null;
      }

      const range = document.createRange();
      range.setStart(primeiroNoTexto, 0);
      range.setEnd(primeiroNoTexto, primeiroNoTexto.nodeValue.length);
      return range;
    }

    /**
     * Encontra o primeiro TextNode legível dentro de um container DOM.
     * @param {Element | null} elementoContainer
     * @param {Element | null} [ancestralExplicitoUsuario]
     * @returns {Text | null}
     */
    static encontrarPrimeiroNoTextoLegivel(
      elementoContainer,
      ancestralExplicitoUsuario = null
    ) {
      if (!elementoContainer) {
        return null;
      }
      const caminhante = document.createTreeWalker(
        elementoContainer,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(noCandidato) {
            return MapeadorSelecaoDom.ehNoTextoLegivelNoFluxo(
              noCandidato,
              ancestralExplicitoUsuario
            )
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      return caminhante.nextNode();
    }

    /**
     * Constrói um mapa de leitura contínua que começa no início de `rangeInicial`
     * e prossegue por todos os nós de texto legíveis até o final do documento.
     * @param {Range} rangeInicial
     * @param {boolean} [recuarPalavraInicial=false]
     * @returns {Object | null}
     */
    static mapearFluxoContinuoAPartirDeRangeInicial(
      rangeInicial,
      recuarPalavraInicial = false
    ) {
      if (typeof document === 'undefined' || !document.body || !rangeInicial) {
        return null;
      }

      const ancestralPontoInicial =
        rangeInicial.startContainer.nodeType === Node.ELEMENT_NODE
          ? rangeInicial.startContainer
          : rangeInicial.startContainer.parentElement;

      const rangeAteFimDaPagina = rangeInicial.cloneRange();

      // Se o início está no meio de uma palavra e recuarPalavraInicial for solicitado, recua até o começo da palavra
      if (
        recuarPalavraInicial &&
        rangeAteFimDaPagina.startContainer.nodeType === Node.TEXT_NODE
      ) {
        const textoNo = rangeAteFimDaPagina.startContainer.nodeValue || '';
        let novoOffset = rangeAteFimDaPagina.startOffset;
        while (novoOffset > 0 && /\S/.test(textoNo[novoOffset - 1])) {
          novoOffset -= 1;
        }
        rangeAteFimDaPagina.setStart(rangeAteFimDaPagina.startContainer, novoOffset);
      }

      if (document.body.lastChild) {
        rangeAteFimDaPagina.setEndAfter(document.body.lastChild);
      } else {
        rangeAteFimDaPagina.selectNodeContents(document.body);
      }

      const dadosExtracao = MapeadorSelecaoDom.extrairSegmentosTextoDeRange(
        rangeAteFimDaPagina,
        {
          filtrarEstruturasSecundarias: true,
          ancestralExplicitoUsuario: ancestralPontoInicial
        }
      );

      if (!dadosExtracao.textoCompleto.trim()) {
        return null;
      }

      const retanguloAncoraInicial =
        typeof rangeInicial.getBoundingClientRect === 'function'
          ? rangeInicial.getBoundingClientRect()
          : { top: 20, bottom: 40, left: 20, right: 120, width: 100, height: 20 };

      return MapeadorSelecaoDom.construirObjetoMapaDeLeitura({
        dadosExtracao,
        retanguloAncoraInicial,
        elementoAncestralRaiz: document.body,
        leituraContinuaAtiva: true,
        ancestralExplicitoUsuario: ancestralPontoInicial
      });
    }

    /**
     * Empacota os segmentos extraídos e sentenças mapeadas com suporte a busca de Ranges
     * e expansão dinâmica ao atingir o fim do conteúdo em páginas que carregam mais texto.
     * @param {Object} config
     * @returns {Object | null}
     */
    static construirObjetoMapaDeLeitura({
      dadosExtracao,
      retanguloAncoraInicial,
      elementoAncestralRaiz,
      leituraContinuaAtiva = false,
      ancestralExplicitoUsuario = null
    }) {
      const { SegmentadorSentencas } = escopoGlobal.ReadForMe;
      const sentencasMapeadas = SegmentadorSentencas.segmentarTextoEmSentencas(
        dadosExtracao.textoCompleto
      );
      if (sentencasMapeadas.length === 0) {
        return null;
      }

      let textoCompletoAtual = dadosExtracao.textoCompleto;
      let segmentosNosTextoAtuais = dadosExtracao.segmentosNosTexto;

      return {
        get textoCompleto() {
          return textoCompletoAtual;
        },
        sentencasMapeadas,
        retanguloAncoraInicial,
        elementoAncestralRaiz,
        leituraContinuaAtiva,

        /**
         * Verifica se novos nós de texto foram adicionados ao DOM após o último nó mapeado
         * (ex.: infinite scroll ou carregamento tardio) e anexa as novas sentenças à fila.
         * @returns {boolean} True se novas sentenças foram encontradas e adicionadas.
         */
        tentarExpandirConteudoDinamico() {
          if (!leituraContinuaAtiva || typeof document === 'undefined' || !document.body) {
            return false;
          }

          const ultimoSegmento =
            segmentosNosTextoAtuais[segmentosNosTextoAtuais.length - 1];
          if (!ultimoSegmento || !ultimoSegmento.noTexto || !ultimoSegmento.noTexto.isConnected) {
            return false;
          }

          const caminhante = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(noCandidato) {
                return MapeadorSelecaoDom.ehNoTextoLegivelNoFluxo(
                  noCandidato,
                  ancestralExplicitoUsuario
                )
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT;
              }
            }
          );

          caminhante.currentNode = ultimoSegmento.noTexto;
          const primeiroNovoNo = caminhante.nextNode();
          if (!primeiroNovoNo) {
            return false;
          }

          const rangeNovosNos = document.createRange();
          rangeNovosNos.setStart(primeiroNovoNo, 0);
          rangeNovosNos.setEndAfter(document.body.lastChild);

          const novaExtracao = MapeadorSelecaoDom.extrairSegmentosTextoDeRange(
            rangeNovosNos,
            {
              filtrarEstruturasSecundarias: true,
              ancestralExplicitoUsuario
            }
          );

          if (!novaExtracao.textoCompleto.trim()) {
            return false;
          }

          const separador = textoCompletoAtual.endsWith('\n') ? '' : '\n';
          const deslocamentoGlobalBase = textoCompletoAtual.length + separador.length;

          const novasSentencas = SegmentadorSentencas.segmentarTextoEmSentencas(
            novaExtracao.textoCompleto
          );
          if (novasSentencas.length === 0) {
            return false;
          }

          textoCompletoAtual =
            textoCompletoAtual + separador + novaExtracao.textoCompleto;

          for (const novoSegmento of novaExtracao.segmentosNosTexto) {
            segmentosNosTextoAtuais.push({
              noTexto: novoSegmento.noTexto,
              offsetInicialNoNo: novoSegmento.offsetInicialNoNo,
              offsetFinalNoNo: novoSegmento.offsetFinalNoNo,
              inicioGlobal: novoSegmento.inicioGlobal + deslocamentoGlobalBase,
              fimGlobal: novoSegmento.fimGlobal + deslocamentoGlobalBase
            });
          }

          for (const novaSentenca of novasSentencas) {
            sentencasMapeadas.push({
              textoSentenca: novaSentenca.textoSentenca,
              indiceInicialGlobal:
                novaSentenca.indiceInicialGlobal + deslocamentoGlobalBase,
              indiceFinalGlobal:
                novaSentenca.indiceFinalGlobal + deslocamentoGlobalBase
            });
          }

          return true;
        },

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

          if (
            algumNoDesconectado &&
            elementoAncestralRaiz &&
            elementoAncestralRaiz.isConnected
          ) {
            const remapeado = MapeadorSelecaoDom.remapearTextoEmElementoAncestral(
              elementoAncestralRaiz,
              textoCompletoAtual
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
            const comprimentoSegmento =
              segmento.offsetFinalNoNo - segmento.offsetInicialNoNo;
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
     * @param {Object} [opcoes]
     * @param {boolean} [opcoes.filtrarEstruturasSecundarias=false]
     * @param {Element | null} [opcoes.ancestralExplicitoUsuario=null]
     * @returns {{ textoCompleto: string, segmentosNosTexto: Array }}
     */
    static extrairSegmentosTextoDeRange(rangeSelecao, opcoes = {}) {
      const {
        filtrarEstruturasSecundarias = false,
        ancestralExplicitoUsuario = null
      } = opcoes;
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
        if (
          filtrarEstruturasSecundarias &&
          !MapeadorSelecaoDom.ehNoTextoLegivelNoFluxo(
            noTexto,
            ancestralExplicitoUsuario
          )
        ) {
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

        const trechoTexto = noTexto.nodeValue.slice(
          offsetInicialNoNo,
          offsetFinalNoNo
        );
        if (filtrarEstruturasSecundarias && !trechoTexto.trim()) {
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
    static remapearTextoEmElementoAncestral(
      elementoAncestralRaiz,
      textoOriginalEsperado
    ) {
      const rangeInteiroAncestral = document.createRange();
      rangeInteiroAncestral.selectNodeContents(elementoAncestralRaiz);
      const extracaoAncestral = MapeadorSelecaoDom.extrairSegmentosTextoDeRange(
        rangeInteiroAncestral
      );
      const deslocamentoBase = extracaoAncestral.textoCompleto.indexOf(
        textoOriginalEsperado
      );
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
          fimGlobal: Math.min(
            textoOriginalEsperado.length,
            seg.fimGlobal - deslocamentoBase
          )
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
