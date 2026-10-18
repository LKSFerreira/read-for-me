import '../shared/constantes_sistema.js';
import '../shared/utilitarios_texto.js';
import { GeradorTokenSecMsGec } from './gerador_token_sec_ms_gec.js';

const { CONSTANTES_SISTEMA, UtilitariosTexto } = globalThis.ReadForMe;

/**
 * Cliente WebSocket do Edge TTS com Circuit Breaker e alinhamento determinístico de WordBoundary.
 */
export class ClienteWebSocketEdgeTts {
  constructor() {
    this.contagemFalhasConsecutivas = 0;
    this.timestampFimCircuitoAberto = 0;
    this.DURACAO_CIRCUITO_ABERTO_MS = CONSTANTES_SISTEMA.DURACAO_CIRCUITO_ABERTO_MS;
  }

  /**
   * Verifica se o Circuit Breaker está aberto devido a falhas repetidas no endpoint remoto.
   * @returns {boolean}
   */
  estaComCircuitoAberto() {
    if (this.timestampFimCircuitoAberto === 0) {
      return false;
    }
    if (Date.now() < this.timestampFimCircuitoAberto) {
      return true;
    }
    this.timestampFimCircuitoAberto = 0;
    this.contagemFalhasConsecutivas = 0;
    return false;
  }

  /**
   * Registra falha de comunicação e abre o disjuntor se atingir o limite tolerado.
   * @returns {void}
   */
  registrarFalhaEndpoint() {
    this.contagemFalhasConsecutivas += 1;
    if (this.contagemFalhasConsecutivas >= CONSTANTES_SISTEMA.MAXIMO_TENTATIVAS_WS) {
      this.timestampFimCircuitoAberto = Date.now() + this.DURACAO_CIRCUITO_ABERTO_MS;
    }
  }

  /**
   * Sintetiza uma sentença via WebSocket com retry automático e alinhamento de offsets.
   * @param {Object} parametrosSintese
   * @param {string} parametrosSintese.textoSentenca - Texto original da sentença.
   * @param {string} parametrosSintese.nomeVoz - Nome curto da voz (ex.: 'pt-BR-FranciscaNeural').
   * @param {AbortSignal} [parametrosSintese.sinalAborto] - Sinal para cancelamento imediato.
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array<{tempoInicioSegundos: number, duracaoSegundos: number, textoPalavra: string, indiceInicialCaractere: number, comprimentoPalavra: number}>}>}
   */
  async sintetizarSentenca({ textoSentenca, nomeVoz, sinalAborto }) {
    if (!textoSentenca || !String(textoSentenca).trim()) {
      throw new Error('O texto da sentença para síntese não pode ser vazio.');
    }
    if (this.estaComCircuitoAberto()) {
      throw new Error('Circuito do Edge TTS temporariamente aberto; utilizar fallback local.');
    }

    let ultimoErroCapturado = null;
    for (
      let tentativaAtual = 1;
      tentativaAtual <= CONSTANTES_SISTEMA.MAXIMO_TENTATIVAS_WS;
      tentativaAtual += 1
    ) {
      if (sinalAborto && sinalAborto.aborted) {
        throw new Error('Síntese cancelada pelo AbortSignal.');
      }
      try {
        const resultadoSintese = await this.executarTransacaoWebSocketUnica({
          textoSentenca,
          nomeVoz,
          sinalAborto
        });
        this.contagemFalhasConsecutivas = 0;
        this.timestampFimCircuitoAberto = 0;
        return resultadoSintese;
      } catch (erroTentativa) {
        ultimoErroCapturado = erroTentativa;
        if (sinalAborto && sinalAborto.aborted) {
          throw erroTentativa;
        }
      }
    }

    this.registrarFalhaEndpoint();
    throw ultimoErroCapturado || new Error('Falha desconhecida ao sintetizar no Edge TTS.');
  }

  /**
   * Executa uma única transação completa no WebSocket do Edge TTS.
   * @param {Object} parametros
   * @param {string} parametros.textoSentenca
   * @param {string} parametros.nomeVoz
   * @param {AbortSignal} [parametros.sinalAborto]
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
   */
  async executarTransacaoWebSocketUnica({ textoSentenca, nomeVoz, sinalAborto }) {
    if (sinalAborto && sinalAborto.aborted) {
      throw new Error('Síntese cancelada pelo AbortSignal.');
    }

    const idConexao = UtilitariosTexto.gerarIdentificadorConexaoHex();
    const idRequisicaoSsml = UtilitariosTexto.gerarIdentificadorConexaoHex();
    const versaoChromium = UtilitariosTexto.obterVersaoChromiumDinamica();
    const tokenSecMsGec = await GeradorTokenSecMsGec.gerarTokenSeguranca(
      CONSTANTES_SISTEMA.TOKEN_CLIENTE_CONFIAVEL_EDGE
    );

    const urlWebSocket =
      `${CONSTANTES_SISTEMA.URL_BASE_WEBSOCKET_EDGE}` +
      `?TrustedClientToken=${CONSTANTES_SISTEMA.TOKEN_CLIENTE_CONFIAVEL_EDGE}` +
      `&Sec-MS-GEC=${tokenSecMsGec}` +
      `&Sec-MS-GEC-Version=1-${versaoChromium}` +
      `&ConnectionId=${idConexao}`;

    const vozSegura = String(nomeVoz || CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA);
    const idiomaExtraido = (vozSegura.match(/^[a-z]{2}-[A-Z]{2}/) || ['pt-BR'])[0];
    const {
      envelopeSsml,
      comprimentoPrefixoSsml,
      mapaIndiceEscapadoParaOriginal
    } = UtilitariosTexto.construirEnvelopeSsmlMapeado(textoSentenca, vozSegura, idiomaExtraido);

    return new Promise((resolver, rejeitar) => {
      const partesAudioMp3 = [];
      const limitesPalavras = [];
      let cursorBuscaCaractere = 0;
      let transacaoFinalizada = false;

      const socket = new WebSocket(urlWebSocket);
      socket.binaryType = 'arraybuffer';

      const limparRecursos = () => {
        clearTimeout(idTimerTimeout);
        if (sinalAborto) {
          sinalAborto.removeEventListener('abort', aoAbortarRequisicao);
        }
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1000, 'Encerramento controlado');
        }
      };

      const aoAbortarRequisicao = () => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(new Error('Síntese abortada pelo controlador da sessão.'));
      };

      const idTimerTimeout = setTimeout(() => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(new Error('Tempo limite excedido na comunicação WebSocket com Edge TTS.'));
      }, CONSTANTES_SISTEMA.TIMEOUT_CONEXAO_WS_MS);

      if (sinalAborto) {
        if (sinalAborto.aborted) {
          aoAbortarRequisicao();
          return;
        }
        sinalAborto.addEventListener('abort', aoAbortarRequisicao, { once: true });
      }

      socket.onopen = () => {
        const carimboTempo = new Date().toString();
        const quadroConfiguracao =
          `X-Timestamp:${carimboTempo}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: 'false',
                    wordBoundaryEnabled: 'true'
                  },
                  outputFormat: CONSTANTES_SISTEMA.FORMATO_SAIDA_AUDIO
                }
              }
            }
          });

        const quadroSsml =
          `X-RequestId:${idRequisicaoSsml}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${carimboTempo}\r\n` +
          `Path:ssml\r\n\r\n` +
          envelopeSsml;

        socket.send(quadroConfiguracao);
        socket.send(quadroSsml);
      };

      socket.onmessage = (eventoMensagem) => {
        if (transacaoFinalizada) {
          return;
        }

        if (typeof eventoMensagem.data === 'string') {
          const textoQuadro = eventoMensagem.data;
          if (textoQuadro.includes('Path:audio.metadata')) {
            const indiceSeparador = textoQuadro.indexOf('\r\n\r\n');
            if (indiceSeparador !== -1) {
              try {
                const corpoJson = JSON.parse(textoQuadro.slice(indiceSeparador + 4));
                const listaMetadados = Array.isArray(corpoJson.Metadata)
                  ? corpoJson.Metadata
                  : [];
                for (const itemMetadado of listaMetadados) {
                  if (itemMetadado.Type === 'WordBoundary' && itemMetadado.Data) {
                    const dadosPalavra = itemMetadado.Data;
                    const objetoTexto = dadosPalavra.text || {};
                    const alinhamento = UtilitariosTexto.alinharPalavraAoTextoOriginal({
                      textoSentencaOriginal: textoSentenca,
                      textoPalavraEvento: objetoTexto.Text,
                      offsetTextoEvento:
                        typeof objetoTexto.TextOffset === 'number'
                          ? objetoTexto.TextOffset
                          : dadosPalavra.TextOffset,
                      comprimentoPrefixoSsml,
                      mapaIndiceEscapadoParaOriginal,
                      cursorBuscaCaractere
                    });
                    cursorBuscaCaractere = alinhamento.novoCursorBusca;
                    limitesPalavras.push({
                      tempoInicioSegundos: (dadosPalavra.Offset || 0) / 10000000,
                      duracaoSegundos: (dadosPalavra.Duration || 0) / 10000000,
                      textoPalavra: objetoTexto.Text || '',
                      indiceInicialCaractere: alinhamento.indiceInicialCaractere,
                      comprimentoPalavra: alinhamento.comprimentoPalavra
                    });
                  }
                }
              } catch {
                // Ignora frame de metadados malformado sem derrubar o stream de áudio
              }
            }
          } else if (textoQuadro.includes('Path:turn.end')) {
            transacaoFinalizada = true;
            limparRecursos();
            const audioBase64 =
              ClienteWebSocketEdgeTts.concatenarBuffersParaBase64(partesAudioMp3);
            if (!audioBase64) {
              rejeitar(
                new Error('O servidor Edge TTS encerrou o turno sem enviar bytes de áudio.')
              );
              return;
            }
            resolver({ audioBase64, limitesPalavras });
          }
          return;
        }

        if (eventoMensagem.data instanceof ArrayBuffer) {
          const bufferQuadro = eventoMensagem.data;
          if (bufferQuadro.byteLength < 2) {
            return;
          }
          const visaoDados = new DataView(bufferQuadro);
          const tamanhoCabecalho = visaoDados.getUint16(0, false);
          if (bufferQuadro.byteLength <= 2 + tamanhoCabecalho) {
            return;
          }
          const cabecalhoTexto = new TextDecoder().decode(
            bufferQuadro.slice(2, 2 + tamanhoCabecalho)
          );
          if (cabecalhoTexto.includes('Path:audio')) {
            partesAudioMp3.push(new Uint8Array(bufferQuadro, 2 + tamanhoCabecalho));
          }
        }
      };

      socket.onerror = () => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(new Error('Erro de transporte no WebSocket do Edge TTS.'));
      };

      socket.onclose = (eventoFechamento) => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(
          new Error(
            `WebSocket do Edge TTS fechado prematuramente (código ${eventoFechamento.code}).`
          )
        );
      };
    });
  }

  /**
   * Concatena múltiplos Uint8Array de áudio MP3 e codifica em Base64.
   * @param {Uint8Array[]} listaPartesMp3
   * @returns {string}
   */
  static concatenarBuffersParaBase64(listaPartesMp3) {
    const tamanhoTotal = listaPartesMp3.reduce(
      (acumulado, parteAtual) => acumulado + parteAtual.byteLength,
      0
    );
    if (tamanhoTotal === 0) {
      return '';
    }
    const bufferUnificado = new Uint8Array(tamanhoTotal);
    let deslocamentoEscrita = 0;
    for (const parteAtual of listaPartesMp3) {
      bufferUnificado.set(parteAtual, deslocamentoEscrita);
      deslocamentoEscrita += parteAtual.byteLength;
    }

    const TAMANHO_BLOCO_STRING = 32768;
    let cadeiaBinaria = '';
    for (let indice = 0; indice < bufferUnificado.length; indice += TAMANHO_BLOCO_STRING) {
      const fatia = bufferUnificado.subarray(indice, indice + TAMANHO_BLOCO_STRING);
      cadeiaBinaria += String.fromCharCode.apply(null, fatia);
    }
    return btoa(cadeiaBinaria);
  }
}
