/**
 * Funções utilitárias puras de manipulação de texto, codificação Base64,
 * sanitização SSML com mapa de offsets e alinhamento determinístico de metadados WordBoundary.
 */
(function inicializarUtilitariosTexto(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  /**
   * Extrai dinamicamente a versão do Chromium ou retorna a versão estável exigida pelo Sec-MS-GEC v2.
   * @param {string} [userAgentNavegador] - String navigator.userAgent.
   * @param {string} [versaoPadraoFallback='143.0.3650.75'] - Versão usada caso não detectada.
   * @returns {string} Versão completa no formato 'MAJOR.0.BUILD.PATCH'.
   */
  function obterVersaoChromiumDinamica(
    userAgentNavegador = typeof navigator !== 'undefined' ? navigator.userAgent : '',
    versaoPadraoFallback = '143.0.3650.75'
  ) {
    const cadeiaUserAgent = String(userAgentNavegador || '');
    const correspondenciaEdg = cadeiaUserAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (correspondenciaEdg && correspondenciaEdg[1]) {
      return correspondenciaEdg[1];
    }
    const correspondenciaChrome = cadeiaUserAgent.match(/Chrom(?:e|ium)\/(\d+\.\d+\.\d+\.\d+)/);
    if (correspondenciaChrome && correspondenciaChrome[1]) {
      return correspondenciaChrome[1];
    }
    return versaoPadraoFallback;
  }

  /**
   * Gera um identificador hexadecimal criptograficamente seguro de 32 caracteres sem hífens.
   * @returns {string} Identificador hexadecimal minúsculo.
   */
  function gerarIdentificadorConexaoHex() {
    const bytesAleatorios = new Uint8Array(16);
    crypto.getRandomValues(bytesAleatorios);
    return Array.from(bytesAleatorios, (byteAtual) =>
      byteAtual.toString(16).padStart(2, '0')
    ).join('');
  }

  /**
   * Converte uma string Base64 para Uint8Array binário.
   * @param {string} cadeiaBase64
   * @returns {Uint8Array}
   */
  function converterBase64ParaUint8Array(cadeiaBase64) {
    if (!cadeiaBase64 || typeof cadeiaBase64 !== 'string') {
      return new Uint8Array(0);
    }
    const stringBinaria = atob(cadeiaBase64);
    const comprimento = stringBinaria.length;
    const bytes = new Uint8Array(comprimento);
    for (let indice = 0; indice < comprimento; indice += 1) {
      bytes[indice] = stringBinaria.charCodeAt(indice);
    }
    return bytes;
  }

  /**
   * Escapa caracteres especiais XML (&, <, >, ", ') mantendo mapa exato de cada posição escapada
   * para o índice correspondente na string original não escapada.
   * @param {string} textoOriginal - Texto puro da sentença.
   * @returns {{ textoEscapado: string, mapaIndiceEscapadoParaOriginal: number[] }}
   */
  function escaparTextoParaSsmlComMapa(textoOriginal) {
    const textoEntrada = String(textoOriginal || '');
    const tabelaSubstituicaoXml = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };
    let textoEscapado = '';
    const mapaIndiceEscapadoParaOriginal = [];

    for (let indiceOriginal = 0; indiceOriginal < textoEntrada.length; indiceOriginal += 1) {
      const caractereAtual = textoEntrada[indiceOriginal];
      const entidadeSubstituta = tabelaSubstituicaoXml[caractereAtual];

      if (entidadeSubstituta) {
        textoEscapado += entidadeSubstituta;
        for (
          let indiceEntidade = 0;
          indiceEntidade < entidadeSubstituta.length;
          indiceEntidade += 1
        ) {
          mapaIndiceEscapadoParaOriginal.push(indiceOriginal);
        }
      } else {
        textoEscapado += caractereAtual;
        mapaIndiceEscapadoParaOriginal.push(indiceOriginal);
      }
    }

    mapaIndiceEscapadoParaOriginal.push(textoEntrada.length);
    return { textoEscapado, mapaIndiceEscapadoParaOriginal };
  }

  /**
   * Constrói o envelope SSML e informa o deslocamento exato onde o texto escapado começa.
   * @param {string} textoOriginal - Texto puro da sentença.
   * @param {string} nomeVoz - Nome curto da voz (ex.: 'pt-BR-FranciscaNeural').
   * @param {string} idiomaVoz - Código de idioma (ex.: 'pt-BR').
   * @returns {{ envelopeSsml: string, comprimentoPrefixoSsml: number, mapaIndiceEscapadoParaOriginal: number[] }}
   */
  function construirEnvelopeSsmlMapeado(textoOriginal, nomeVoz, idiomaVoz) {
    const { textoEscapado, mapaIndiceEscapadoParaOriginal } =
      escaparTextoParaSsmlComMapa(textoOriginal);
    const idiomaSeguro = String(idiomaVoz || 'pt-BR');
    const vozSegura = String(nomeVoz || 'pt-BR-FranciscaNeural');
    const prefixoSsml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${idiomaSeguro}'>` +
      `<voice name='${vozSegura}'>` +
      `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>`;
    const sufixoSsml = `</prosody></voice></speak>`;

    return {
      envelopeSsml: `${prefixoSsml}${textoEscapado}${sufixoSsml}`,
      comprimentoPrefixoSsml: prefixoSsml.length,
      mapaIndiceEscapadoParaOriginal
    };
  }

  /**
   * Localiza com precisão a posição inicial e o comprimento da palavra falada na sentença original.
   * @param {Object} parametrosAlinhamento
   * @returns {{ indiceInicialCaractere: number, comprimentoPalavra: number, novoCursorBusca: number }}
   */
  function alinharPalavraAoTextoOriginal({
    textoSentencaOriginal,
    textoPalavraEvento,
    offsetTextoEvento,
    comprimentoPrefixoSsml = 0,
    mapaIndiceEscapadoParaOriginal = [],
    cursorBuscaCaractere = 0
  }) {
    const textoOriginal = String(textoSentencaOriginal || '');
    const palavraLimpa = String(textoPalavraEvento || '').trim();
    const cursorSeguro = Math.max(0, cursorBuscaCaractere);

    if (!palavraLimpa) {
      return {
        indiceInicialCaractere: cursorSeguro,
        comprimentoPalavra: 0,
        novoCursorBusca: cursorSeguro
      };
    }

    if (typeof offsetTextoEvento === 'number' && !Number.isNaN(offsetTextoEvento)) {
      const candidatosIndiceEscapado = [];
      if (offsetTextoEvento >= comprimentoPrefixoSsml) {
        candidatosIndiceEscapado.push(offsetTextoEvento - comprimentoPrefixoSsml);
      }
      candidatosIndiceEscapado.push(offsetTextoEvento);

      for (const indiceNoTextoEscapado of candidatosIndiceEscapado) {
        if (
          indiceNoTextoEscapado >= 0 &&
          indiceNoTextoEscapado < mapaIndiceEscapadoParaOriginal.length
        ) {
          const indiceOriginalMapeado = mapaIndiceEscapadoParaOriginal[indiceNoTextoEscapado];
          const fatiaCandidata = textoOriginal.slice(
            indiceOriginalMapeado,
            indiceOriginalMapeado + palavraLimpa.length
          );
          if (
            indiceOriginalMapeado >= cursorSeguro &&
            fatiaCandidata.localeCompare(palavraLimpa, undefined, { sensitivity: 'base' }) === 0
          ) {
            return {
              indiceInicialCaractere: indiceOriginalMapeado,
              comprimentoPalavra: palavraLimpa.length,
              novoCursorBusca: indiceOriginalMapeado + palavraLimpa.length
            };
          }
        }
      }
    }

    const expressaoTokens = /[\p{L}\p{N}]+(?:[.,'’-][\p{L}\p{N}]+)*/gu;
    expressaoTokens.lastIndex = cursorSeguro;
    const palavraNormalizada = palavraLimpa.toLocaleLowerCase();
    let correspondenciaToken = expressaoTokens.exec(textoOriginal);

    while (correspondenciaToken !== null) {
      const tokenEncontrado = correspondenciaToken[0];
      const indiceToken = correspondenciaToken.index;

      if (tokenEncontrado.toLocaleLowerCase() === palavraNormalizada) {
        return {
          indiceInicialCaractere: indiceToken,
          comprimentoPalavra: tokenEncontrado.length,
          novoCursorBusca: indiceToken + tokenEncontrado.length
        };
      }

      const subTokens = tokenEncontrado.split(/[.,'’-]/);
      if (subTokens.length > 1) {
        let deslocamentoInterno = 0;
        for (const subToken of subTokens) {
          if (subToken.toLocaleLowerCase() === palavraNormalizada) {
            const indiceExatoSubToken = indiceToken + deslocamentoInterno;
            if (indiceExatoSubToken >= cursorSeguro) {
              return {
                indiceInicialCaractere: indiceExatoSubToken,
                comprimentoPalavra: subToken.length,
                novoCursorBusca: indiceExatoSubToken + subToken.length
              };
            }
          }
          deslocamentoInterno += subToken.length + 1;
        }
      }

      correspondenciaToken = expressaoTokens.exec(textoOriginal);
    }

    const eSimboloOuPontuacao = !/^[\p{L}]+$/u.test(palavraLimpa);
    if (eSimboloOuPontuacao) {
      const indiceSubcadeia = textoOriginal
        .toLocaleLowerCase()
        .indexOf(palavraNormalizada, cursorSeguro);
      if (indiceSubcadeia !== -1) {
        return {
          indiceInicialCaractere: indiceSubcadeia,
          comprimentoPalavra: palavraLimpa.length,
          novoCursorBusca: indiceSubcadeia + palavraLimpa.length
        };
      }
    }

    return {
      indiceInicialCaractere: cursorSeguro,
      comprimentoPalavra: Math.min(
        palavraLimpa.length,
        Math.max(0, textoOriginal.length - cursorSeguro)
      ),
      novoCursorBusca: cursorSeguro
    };
  }

  const UtilitariosTexto = Object.freeze({
    obterVersaoChromiumDinamica,
    gerarIdentificadorConexaoHex,
    converterBase64ParaUint8Array,
    escaparTextoParaSsmlComMapa,
    construirEnvelopeSsmlMapeado,
    alinharPalavraAoTextoOriginal
  });

  escopoGlobal.ReadForMe.UtilitariosTexto = UtilitariosTexto;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UtilitariosTexto;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
