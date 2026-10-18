/**
 * Segmentador inteligente de sentenças (Sentence Chunking).
 * Divide textos longos em sentenças lógicas preservando rigorosamente os índices
 * globais de início e fim no texto original para destaque com CSS Custom Highlight API.
 */
(function inicializarSegmentadorSentencas(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const ABREVIACOES_CONHECIDAS = new Set([
    'sr.',
    'sra.',
    'srta.',
    'dr.',
    'dra.',
    'prof.',
    'profa.',
    'eng.',
    'adv.',
    'fig.',
    'pág.',
    'pag.',
    'págs.',
    'art.',
    'inc.',
    'par.',
    'cap.',
    'vol.',
    'ed.',
    'nº.',
    'no.',
    'ex.',
    'obs.',
    'tel.',
    'av.',
    'est.',
    'min.',
    'máx.',
    'max.',
    'aprox.',
    'vs.',
    'mr.',
    'mrs.',
    'ms.',
    'st.',
    'jr.',
    'ltd.',
    'co.',
    'e.g.',
    'i.e.'
  ]);

  class SegmentadorSentencas {
    /**
     * Divide um texto linear em sentenças lógicas mantendo os índices globais exatos.
     * @param {string} textoCompleto - Texto linear extraído da seleção.
     * @param {number} [comprimentoMaximoSentenca=280] - Limite máximo de caracteres por chunk.
     * @returns {Array<{indiceSentenca: number, textoSentenca: string, indiceInicialGlobal: number, indiceFinalGlobal: number}>}
     */
    static segmentarTextoEmSentencas(textoCompleto, comprimentoMaximoSentenca = 280) {
      const textoFonte = String(textoCompleto || '');
      if (!textoFonte.trim()) {
        return [];
      }

      const blocosBrutos = SegmentadorSentencas.extrairSegmentosBrutos(textoFonte);
      const blocosComAbreviacoesUnidas =
        SegmentadorSentencas.unirFragmentosDeAbreviacoes(textoFonte, blocosBrutos);

      const sentencasFinais = [];
      for (const bloco of blocosComAbreviacoesUnidas) {
        const subBlocos = SegmentadorSentencas.subdividirBlocoLongo(
          textoFonte,
          bloco.inicio,
          bloco.fim,
          comprimentoMaximoSentenca
        );
        for (const subBloco of subBlocos) {
          const recorteAjustado = SegmentadorSentencas.ajustarEspacosNasBordas(
            textoFonte,
            subBloco.inicio,
            subBloco.fim
          );
          if (recorteAjustado) {
            sentencasFinais.push({
              indiceSentenca: sentencasFinais.length,
              textoSentenca: recorteAjustado.textoSentenca,
              indiceInicialGlobal: recorteAjustado.indiceInicialGlobal,
              indiceFinalGlobal: recorteAjustado.indiceFinalGlobal
            });
          }
        }
      }

      return sentencasFinais;
    }

    /**
     * Extrai os intervalos iniciais usando Intl.Segmenter e quebras explícitas de linha/parágrafo.
     * @param {string} textoFonte
     * @returns {Array<{inicio: number, fim: number}>}
     */
    static extrairSegmentosBrutos(textoFonte) {
      const intervalosPorLinha = [];
      let inicioLinha = 0;

      for (let indice = 0; indice <= textoFonte.length; indice += 1) {
        if (indice === textoFonte.length || textoFonte[indice] === '\n') {
          if (indice > inicioLinha) {
            intervalosPorLinha.push({ inicio: inicioLinha, fim: indice });
          }
          inicioLinha = indice + 1;
        }
      }

      const segmentosResultantes = [];
      const possuiSegmenterNativo =
        typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
      const segmentadorIntl = possuiSegmenterNativo
        ? new Intl.Segmenter('pt-BR', { granularity: 'sentence' })
        : null;

      for (const linha of intervalosPorLinha) {
        const textoLinha = textoFonte.slice(linha.inicio, linha.fim);
        if (!textoLinha.trim()) {
          continue;
        }

        if (segmentadorIntl) {
          for (const itemSegmento of segmentadorIntl.segment(textoLinha)) {
            const inicioAbsoluto = linha.inicio + itemSegmento.index;
            const fimAbsoluto = inicioAbsoluto + itemSegmento.segment.length;
            if (textoFonte.slice(inicioAbsoluto, fimAbsoluto).trim()) {
              segmentosResultantes.push({ inicio: inicioAbsoluto, fim: fimAbsoluto });
            }
          }
        } else {
          const expressaoPontuacao = /[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g;
          let correspondencia = expressaoPontuacao.exec(textoLinha);
          while (correspondencia !== null) {
            const inicioAbsoluto = linha.inicio + correspondencia.index;
            const fimAbsoluto = inicioAbsoluto + correspondencia[0].length;
            if (textoFonte.slice(inicioAbsoluto, fimAbsoluto).trim()) {
              segmentosResultantes.push({ inicio: inicioAbsoluto, fim: fimAbsoluto });
            }
            correspondencia = expressaoPontuacao.exec(textoLinha);
          }
        }
      }

      return segmentosResultantes;
    }

    /**
     * Reúne segmentos consecutivos caso o corte tenha ocorrido imediatamente após uma abreviação (ex.: "Dr.", "Sr.").
     * @param {string} textoFonte
     * @param {Array<{inicio: number, fim: number}>} segmentosBrutos
     * @returns {Array<{inicio: number, fim: number}>}
     */
    static unirFragmentosDeAbreviacoes(textoFonte, segmentosBrutos) {
      if (segmentosBrutos.length <= 1) {
        return segmentosBrutos;
      }

      const unidos = [];
      let acumuladoAtual = { ...segmentosBrutos[0] };

      for (let indice = 1; indice < segmentosBrutos.length; indice += 1) {
        const proximoSegmento = segmentosBrutos[indice];
        const textoAcumulado = textoFonte.slice(acumuladoAtual.inicio, acumuladoAtual.fim);
        const temQuebraDeParagrafoEntreEles = textoFonte
          .slice(acumuladoAtual.fim, proximoSegmento.inicio)
          .includes('\n');

        const proximoTextoLimpo = textoFonte
          .slice(proximoSegmento.inicio, proximoSegmento.fim)
          .trimStart();
        const terminaComEtc = /\betc\.$/i.test(textoAcumulado.trimEnd());
        const proximoIniciaMinuscula = /^[a-záéíóúâêôãõç,;:)—–-]/u.test(proximoTextoLimpo);

        if (
          !temQuebraDeParagrafoEntreEles &&
          (SegmentadorSentencas.terminaComAbreviacao(textoAcumulado) ||
            (terminaComEtc && proximoIniciaMinuscula))
        ) {
          acumuladoAtual.fim = proximoSegmento.fim;
        } else {
          unidos.push(acumuladoAtual);
          acumuladoAtual = { ...proximoSegmento };
        }
      }

      unidos.push(acumuladoAtual);
      return unidos;
    }

    /**
     * Verifica se um trecho termina em abreviação conhecida ou inicial de nome (ex.: "J. R. R.").
     * @param {string} trechoTexto
     * @returns {boolean}
     */
    static terminaComAbreviacao(trechoTexto) {
      const limpo = trechoTexto.trimEnd();
      if (!limpo.endsWith('.')) {
        return false;
      }
      const correspondenciaUltimaPalavra = limpo.match(/([\p{L}\p{N}.ºª]+)$/u);
      if (!correspondenciaUltimaPalavra) {
        return false;
      }
      const ultimaPalavra = correspondenciaUltimaPalavra[1].toLowerCase();
      if (ABREVIACOES_CONHECIDAS.has(ultimaPalavra)) {
        return true;
      }
      // Inicial maiúscula isolada como "A." ou "J."
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]\.$/.test(correspondenciaUltimaPalavra[1])) {
        return true;
      }
      return false;
    }

    /**
     * Subdivide sentenças que excedam o limite de caracteres em pausas naturais (, ; :) ou espaços.
     * @param {string} textoFonte
     * @param {number} inicioBloco
     * @param {number} fimBloco
     * @param {number} limiteMaximo
     * @returns {Array<{inicio: number, fim: number}>}
     */
    static subdividirBlocoLongo(textoFonte, inicioBloco, fimBloco, limiteMaximo) {
      const resultado = [];
      let cursorInicio = inicioBloco;

      while (fimBloco - cursorInicio > limiteMaximo) {
        const limiteJanela = cursorInicio + limiteMaximo;
        const fatiaJanela = textoFonte.slice(cursorInicio, limiteJanela);

        let melhorCorteRelativo = -1;
        const regexPausaPontuacao = /[,;:—–-]\s+/g;
        let correspondenciaPausa = regexPausaPontuacao.exec(fatiaJanela);
        while (correspondenciaPausa !== null) {
          if (correspondenciaPausa.index >= Math.floor(limiteMaximo * 0.35)) {
            melhorCorteRelativo = correspondenciaPausa.index + 1;
          }
          correspondenciaPausa = regexPausaPontuacao.exec(fatiaJanela);
        }

        if (melhorCorteRelativo === -1) {
          const ultimoEspaco = fatiaJanela.lastIndexOf(' ');
          if (ultimoEspaco > 0) {
            melhorCorteRelativo = ultimoEspaco;
          } else {
            melhorCorteRelativo = limiteMaximo;
          }
        }

        const pontoCorteAbsoluto = cursorInicio + melhorCorteRelativo;
        resultado.push({ inicio: cursorInicio, fim: pontoCorteAbsoluto });
        cursorInicio = pontoCorteAbsoluto;
      }

      if (cursorInicio < fimBloco) {
        resultado.push({ inicio: cursorInicio, fim: fimBloco });
      }

      return resultado;
    }

    /**
     * Remove espaços em branco nas extremidades ajustando os índices globais com precisão.
     * @param {string} textoFonte
     * @param {number} inicioBruto
     * @param {number} fimBruto
     * @returns {{textoSentenca: string, indiceInicialGlobal: number, indiceFinalGlobal: number} | null}
     */
    static ajustarEspacosNasBordas(textoFonte, inicioBruto, fimBruto) {
      let inicioAjustado = inicioBruto;
      let fimAjustado = fimBruto;

      while (inicioAjustado < fimAjustado && /\s/.test(textoFonte[inicioAjustado])) {
        inicioAjustado += 1;
      }
      while (fimAjustado > inicioAjustado && /\s/.test(textoFonte[fimAjustado - 1])) {
        fimAjustado -= 1;
      }

      if (fimAjustado <= inicioAjustado) {
        return null;
      }

      return {
        textoSentenca: textoFonte.slice(inicioAjustado, fimAjustado),
        indiceInicialGlobal: inicioAjustado,
        indiceFinalGlobal: fimAjustado
      };
    }
  }

  escopoGlobal.ReadForMe.SegmentadorSentencas = SegmentadorSentencas;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SegmentadorSentencas;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
