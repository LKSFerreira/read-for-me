import '../shared/constantes_sistema.js';
import '../shared/utilitarios_texto.js';
import { GeradorTokenSecMsGec } from './gerador_token_sec_ms_gec.js';

const { CONSTANTES_SISTEMA, UtilitariosTexto } = globalThis.ReadForMe;

/**
 * Cliente WebSocket do Edge TTS com logs detalhados de diagnóstico,
 * Circuit Breaker e alinhamento determinístico de WordBoundary.
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
   * Reseta manualmente o Circuit Breaker (ex.: ao testar prévia de voz).
   * @returns {void}
   */
  resetarCircuito() {
    this.timestampFimCircuitoAberto = 0;
    this.contagemFalhasConsecutivas = 0;
  }

  /**
   * Sintetiza uma sentença via WebSocket com retry automático, logs de diagnóstico e alinhamento de offsets.
   * @param {Object} parametrosSintese
   * @param {string} parametrosSintese.textoSentenca - Texto original da sentença.
   * @param {string} parametrosSintese.nomeVoz - Nome curto da voz (ex.: 'pt-BR-FranciscaNeural').
   * @param {AbortSignal} [parametrosSintese.sinalAborto] - Sinal para cancelamento imediato.
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array, logsDiagnostico: string[]}>}
   */
  async sintetizarSentenca({ textoSentenca, nomeVoz, sinalAborto }) {
    const logsDiagnostico = [];
    const registrarLog = (nivel, mensagem, detalhes) => {
      const carimbo = new Date().toISOString();
      const textoDetalhes =
        detalhes !== undefined
          ? ` | ${typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes)}`
          : '';
      const linha = `[ReadForMe][Background][${carimbo}] ${mensagem}${textoDetalhes}`;
      logsDiagnostico.push(linha);
      if (nivel === 'erro') {
        console.error(linha);
      } else {
        console.log(linha);
      }
    };

    registrarLog('info', 'Iniciando sintetizarSentenca', {
      nomeVozSolicitada: nomeVoz,
      tamanhoTexto: textoSentenca ? String(textoSentenca).length : 0,
      previaTexto: textoSentenca ? String(textoSentenca).slice(0, 60) : '',
      userAgentNat: typeof navigator !== 'undefined' ? navigator.userAgent : 'indisponivel'
    });

    if (!textoSentenca || !String(textoSentenca).trim()) {
      const erroVazio = new Error('O texto da sentença para síntese não pode ser vazio.');
      erroVazio.logsDiagnostico = logsDiagnostico;
      throw erroVazio;
    }

    if (this.estaComCircuitoAberto()) {
      const segundosRestantes = Math.ceil(
        (this.timestampFimCircuitoAberto - Date.now()) / 1000
      );
      registrarLog(
        'erro',
        `Circuito do Edge TTS temporariamente aberto (${segundosRestantes}s restantes); utilizar fallback local.`
      );
      const erroCircuito = new Error(
        'Circuito do Edge TTS temporariamente aberto; utilizar fallback local.'
      );
      erroCircuito.logsDiagnostico = logsDiagnostico;
      throw erroCircuito;
    }

    let ultimoErroCapturado = null;
    for (
      let tentativaAtual = 1;
      tentativaAtual <= CONSTANTES_SISTEMA.MAXIMO_TENTATIVAS_WS;
      tentativaAtual += 1
    ) {
      if (sinalAborto && sinalAborto.aborted) {
        const erroAborto = new Error('Síntese cancelada pelo AbortSignal.');
        erroAborto.logsDiagnostico = logsDiagnostico;
        throw erroAborto;
      }
      try {
        registrarLog(
          'info',
          `Tentativa WebSocket ${tentativaAtual} de ${CONSTANTES_SISTEMA.MAXIMO_TENTATIVAS_WS}`,
          { nomeVoz }
        );
        const resultadoSintese = await this.executarTransacaoWebSocketUnica({
          textoSentenca,
          nomeVoz,
          sinalAborto,
          tentativaAtual,
          registrarLog
        });
        this.contagemFalhasConsecutivas = 0;
        this.timestampFimCircuitoAberto = 0;
        registrarLog('info', 'Síntese concluída com sucesso no Edge TTS', {
          nomeVoz,
          tamanhoBase64: resultadoSintese.audioBase64.length,
          totalLimitesPalavras: resultadoSintese.limitesPalavras.length
        });
        return {
          ...resultadoSintese,
          logsDiagnostico
        };
      } catch (erroTentativa) {
        ultimoErroCapturado = erroTentativa;
        registrarLog(
          'erro',
          `Falha na tentativa ${tentativaAtual}: ${
            erroTentativa instanceof Error ? erroTentativa.message : String(erroTentativa)
          }`
        );
        if (sinalAborto && sinalAborto.aborted) {
          erroTentativa.logsDiagnostico = logsDiagnostico;
          throw erroTentativa;
        }
      }
    }

    this.registrarFalhaEndpoint();
    const erroFinal =
      ultimoErroCapturado || new Error('Falha desconhecida ao sintetizar no Edge TTS.');
    erroFinal.logsDiagnostico = logsDiagnostico;
    throw erroFinal;
  }

  /**
   * Executa uma única transação completa no WebSocket do Edge TTS.
   * @param {Object} parametros
   * @param {string} parametros.textoSentenca
   * @param {string} parametros.nomeVoz
   * @param {AbortSignal} [parametros.sinalAborto]
   * @param {number} [parametros.tentativaAtual=1]
   * @param {Function} [parametros.registrarLog]
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
   */
  async executarTransacaoWebSocketUnica({
    textoSentenca,
    nomeVoz,
    sinalAborto,
    registrarLog = () => {}
  }) {
    if (sinalAborto && sinalAborto.aborted) {
      throw new Error('Síntese cancelada pelo AbortSignal.');
    }

    const statusDnr = await ClienteWebSocketEdgeTts.garantirCabecalhosRedeEdgeTts();
    registrarLog('info', 'Estado das regras declarativeNetRequest', statusDnr);

    if (ClienteWebSocketEdgeTts.deveDelegarParaOffscreen()) {
      let documentoOffscreenDisponivel = false;
      try {
        await ClienteWebSocketEdgeTts.garantirDocumentoOffscreen();
        documentoOffscreenDisponivel = true;
      } catch (erroCriacaoOffscreen) {
        registrarLog(
          'erro',
          'Não foi possível criar Offscreen Document; tentando WebSocket direto',
          erroCriacaoOffscreen instanceof Error
            ? erroCriacaoOffscreen.message
            : String(erroCriacaoOffscreen)
        );
      }

      if (documentoOffscreenDisponivel) {
        return await this.executarTransacaoViaOffscreen({
          textoSentenca,
          nomeVoz,
          sinalAborto,
          registrarLog
        });
      }
    }

    return await this.executarTransacaoWebSocketDireta({
      textoSentenca,
      nomeVoz,
      sinalAborto,
      registrarLog
    });
  }

  /**
   * Verifica se o ambiente atual é um Service Worker com API chrome.offscreen disponível.
   * No Chromium, WebSockets abertos em ServiceWorkerGlobalScope ignoram modifyHeaders do DNR,
   * exigindo que o handshake ocorra em um documento HTML da extensão (Offscreen Document).
   * @returns {boolean}
   */
  static deveDelegarParaOffscreen() {
    return (
      typeof window === 'undefined' &&
      typeof chrome !== 'undefined' &&
      Boolean(
        chrome.offscreen &&
          typeof chrome.offscreen.createDocument === 'function' &&
          chrome.runtime &&
          typeof chrome.runtime.sendMessage === 'function'
      )
    );
  }

  /**
   * Garante que o documento Offscreen de síntese WebSocket esteja ativo.
   * @returns {Promise<boolean>}
   */
  static async garantirDocumentoOffscreen() {
    if (typeof chrome === 'undefined' || !chrome.offscreen) {
      return false;
    }

    if (typeof chrome.runtime?.getContexts === 'function') {
      const contextosExistentes = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      if (Array.isArray(contextosExistentes) && contextosExistentes.length > 0) {
        return true;
      }
    }

    if (!ClienteWebSocketEdgeTts.promessaCriacaoOffscreen) {
      ClienteWebSocketEdgeTts.promessaCriacaoOffscreen = chrome.offscreen
        .createDocument({
          url: 'src/offscreen/offscreen_sintese.html',
          reasons: ['AUDIO_PLAYBACK'],
          justification:
            'Executar WebSocket do Edge TTS em contexto de documento para aplicação de modifyHeaders do declarativeNetRequest.'
        })
        .catch((erroOffscreen) => {
          const mensagemErro = String(erroOffscreen?.message || erroOffscreen || '');
          if (!mensagemErro.includes('Only a single offscreen')) {
            throw erroOffscreen;
          }
        })
        .finally(() => {
          ClienteWebSocketEdgeTts.promessaCriacaoOffscreen = null;
        });
    }

    await ClienteWebSocketEdgeTts.promessaCriacaoOffscreen;

    for (let tentativaPing = 0; tentativaPing < 15; tentativaPing += 1) {
      try {
        const respostaPing = await chrome.runtime.sendMessage({
          tipoMensagem: 'PING_OFFSCREEN_TTS'
        });
        if (respostaPing && respostaPing.pronto) {
          return true;
        }
      } catch {
        // Aguardando carregamento assíncrono do módulo ES no Offscreen Document
      }
      await new Promise((r) => setTimeout(r, 30));
    }

    return true;
  }

  /**
   * Delega a transação WebSocket para o documento Offscreen da extensão.
   * @param {Object} parametros
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
   */
  async executarTransacaoViaOffscreen({
    textoSentenca,
    nomeVoz,
    sinalAborto,
    registrarLog = () => {}
  }) {
    if (sinalAborto && sinalAborto.aborted) {
      throw new Error('Síntese cancelada pelo AbortSignal.');
    }

    const idTransacaoOffscreen = UtilitariosTexto.gerarIdentificadorConexaoHex();
    registrarLog('info', 'Delegando conexão WebSocket ao Offscreen Document', {
      idTransacaoOffscreen,
      nomeVoz
    });

    return new Promise((resolver, rejeitar) => {
      let finalizada = false;

      const aoAbortar = () => {
        if (finalizada) {
          return;
        }
        finalizada = true;
        chrome.runtime
          .sendMessage({
            tipoMensagem: 'ABORTAR_TRANSACAO_OFFSCREEN_TTS',
            payload: { idTransacaoOffscreen }
          })
          .catch(() => {});
        rejeitar(new Error('Síntese abortada pelo controlador da sessão.'));
      };

      if (sinalAborto) {
        if (sinalAborto.aborted) {
          aoAbortar();
          return;
        }
        sinalAborto.addEventListener('abort', aoAbortar, { once: true });
      }

      chrome.runtime
        .sendMessage({
          tipoMensagem: 'EXECUTAR_TRANSACAO_OFFSCREEN_TTS',
          payload: {
            idTransacaoOffscreen,
            textoSentenca,
            nomeVoz
          }
        })
        .then((resposta) => {
          if (finalizada) {
            return;
          }
          finalizada = true;
          if (sinalAborto) {
            sinalAborto.removeEventListener('abort', aoAbortar);
          }

          if (resposta && Array.isArray(resposta.logsOffscreen)) {
            for (const linhaOffscreen of resposta.logsOffscreen) {
              registrarLog(
                linhaOffscreen.includes('[erro]') ? 'erro' : 'info',
                linhaOffscreen
              );
            }
          }

          if (!resposta || !resposta.sucesso) {
            rejeitar(
              new Error(
                (resposta && resposta.erro) ||
                  'Falha na síntese WebSocket dentro do Offscreen Document.'
              )
            );
            return;
          }

          resolver({
            audioBase64: resposta.audioBase64,
            limitesPalavras: resposta.limitesPalavras || []
          });
        })
        .catch((erroMensagem) => {
          if (finalizada) {
            return;
          }
          finalizada = true;
          if (sinalAborto) {
            sinalAborto.removeEventListener('abort', aoAbortar);
          }
          rejeitar(
            erroMensagem instanceof Error
              ? erroMensagem
              : new Error(String(erroMensagem))
          );
        });
    });
  }

  /**
   * Executa diretamente a transação WebSocket do Edge TTS (no Offscreen Document, Popup ou Node).
   * @param {Object} parametros
   * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
   */
  async executarTransacaoWebSocketDireta({
    textoSentenca,
    nomeVoz,
    sinalAborto,
    registrarLog = () => {}
  }) {
    if (sinalAborto && sinalAborto.aborted) {
      throw new Error('Síntese cancelada pelo AbortSignal.');
    }

    const idConexao = UtilitariosTexto.gerarIdentificadorConexaoHex();
    const idRequisicaoSsml = UtilitariosTexto.gerarIdentificadorConexaoHex();
    const versaoChromium = UtilitariosTexto.obterVersaoChromiumDinamica();
    const versaoSecMsGec =
      CONSTANTES_SISTEMA.VERSAO_SEC_MS_GEC || `2-${versaoChromium}`;
    const tokenSecMsGec = await GeradorTokenSecMsGec.gerarTokenSeguranca(
      CONSTANTES_SISTEMA.TOKEN_CLIENTE_CONFIAVEL_EDGE
    );

    const urlWebSocket =
      `${CONSTANTES_SISTEMA.URL_BASE_WEBSOCKET_EDGE}` +
      `?TrustedClientToken=${CONSTANTES_SISTEMA.TOKEN_CLIENTE_CONFIAVEL_EDGE}` +
      `&Sec-MS-GEC=${tokenSecMsGec}` +
      `&Sec-MS-GEC-Version=${versaoSecMsGec}` +
      `&ConnectionId=${idConexao}`;

    const vozSegura = String(nomeVoz || CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA);
    const idiomaExtraido = (vozSegura.match(/^[a-z]{2}-[A-Z]{2}/) || ['pt-BR'])[0];
    const {
      envelopeSsml,
      comprimentoPrefixoSsml,
      mapaIndiceEscapadoParaOriginal
    } = UtilitariosTexto.construirEnvelopeSsmlMapeado(
      textoSentenca,
      vozSegura,
      idiomaExtraido
    );

    registrarLog('info', 'Abrindo conexão WebSocket Edge TTS', {
      idConexao,
      vozSegura,
      idiomaExtraido,
      versaoSecMsGec,
      prefixoTokenGec: tokenSecMsGec.slice(0, 12)
    });

    return new Promise((resolver, rejeitar) => {
      const partesAudioMp3 = [];
      const limitesPalavras = [];
      let cursorBuscaCaractere = 0;
      let transacaoFinalizada = false;
      let socketAbriu = false;
      let houveErroEvento = false;

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
          try {
            socket.close(1000, 'Encerramento controlado');
          } catch {
            // Ignora erro ao fechar socket
          }
        }
      };

      const aoAbortarRequisicao = () => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        registrarLog('erro', 'Transação WebSocket abortada pelo controlador da sessão');
        limparRecursos();
        rejeitar(new Error('Síntese abortada pelo controlador da sessão.'));
      };

      const idTimerTimeout = setTimeout(() => {
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        registrarLog('erro', 'Timeout na conexão WebSocket com Edge TTS', {
          timeoutMs: CONSTANTES_SISTEMA.TIMEOUT_CONEXAO_WS_MS,
          socketAbriu,
          partesAudioRecebidas: partesAudioMp3.length
        });
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
        socketAbriu = true;
        registrarLog('info', 'WebSocket conectado (onopen). Enviando speech.config e SSML', {
          idRequisicaoSsml,
          vozSegura
        });

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
              } catch (erroJson) {
                registrarLog('erro', 'Erro ao analisar JSON de Path:audio.metadata', {
                  erro: erroJson instanceof Error ? erroJson.message : String(erroJson)
                });
              }
            }
          } else if (textoQuadro.includes('Path:turn.end')) {
            transacaoFinalizada = true;
            limparRecursos();
            const audioBase64 =
              ClienteWebSocketEdgeTts.concatenarBuffersParaBase64(partesAudioMp3);
            if (!audioBase64) {
              registrarLog(
                'erro',
                'Recebido Path:turn.end mas nenhum chunk binário de áudio foi enviado pelo servidor',
                { vozSegura, envelopeSsml }
              );
              rejeitar(
                new Error('O servidor Edge TTS encerrou o turno sem enviar bytes de áudio.')
              );
              return;
            }
            registrarLog('info', 'Recebido Path:turn.end com áudio completo', {
              partesRecebidas: partesAudioMp3.length,
              tamanhoBase64: audioBase64.length,
              limitesPalavras: limitesPalavras.length
            });
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
        houveErroEvento = true;
        registrarLog('erro', 'Evento socket.onerror disparado no WebSocket Edge TTS', {
          socketAbriu,
          readyState: socket.readyState,
          partesAudioRecebidas: partesAudioMp3.length
        });
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(
          new Error(
            `Erro de transporte no WebSocket do Edge TTS (socketAbriu=${socketAbriu}, partesAudio=${partesAudioMp3.length}).`
          )
        );
      };

      socket.onclose = (eventoFechamento) => {
        registrarLog(transacaoFinalizada ? 'info' : 'erro', 'Evento socket.onclose disparado no WebSocket Edge TTS', {
          code: eventoFechamento ? eventoFechamento.code : 'sem-codigo',
          reason: eventoFechamento ? eventoFechamento.reason : '',
          wasClean: eventoFechamento ? eventoFechamento.wasClean : false,
          socketAbriu,
          houveErroEvento,
          partesAudioRecebidas: partesAudioMp3.length
        });
        if (transacaoFinalizada) {
          return;
        }
        transacaoFinalizada = true;
        limparRecursos();
        rejeitar(
          new Error(
            `WebSocket do Edge TTS fechado prematuramente (código ${eventoFechamento.code}, motivo: ${
              eventoFechamento.reason || 'sem motivo'
            }, abriu=${socketAbriu}).`
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

  /**
   * Garante que os cabeçalhos Origin, User-Agent e Cookie exigidos pelo endpoint speech.platform.bing.com
   * estejam configurados via declarativeNetRequest no Chromium Manifest V3.
   * @returns {Promise<Object>}
   */
  static async garantirCabecalhosRedeEdgeTts() {
    if (
      typeof chrome === 'undefined' ||
      !chrome.declarativeNetRequest ||
      typeof chrome.declarativeNetRequest.updateDynamicRules !== 'function'
    ) {
      return { disponivel: false, motivo: 'API declarativeNetRequest indisponível' };
    }

    const ID_REGRA_CABECALHOS_EDGE_TTS = 1001;
    const muidSessao = GeradorTokenSecMsGec.gerarMuidAleatorio();
    const originPermitida =
      CONSTANTES_SISTEMA.ORIGIN_EXTENSAO_EDGE_TTS ||
      'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold';
    const userAgentSimulado =
      CONSTANTES_SISTEMA.USER_AGENT_EDGE_SIMULADO ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0';

    try {
      if (!ClienteWebSocketEdgeTts.cabecalhosRedeConfigurados) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [ID_REGRA_CABECALHOS_EDGE_TTS],
          addRules: [
            {
              id: ID_REGRA_CABECALHOS_EDGE_TTS,
              priority: 2,
              action: {
                type: 'modifyHeaders',
                requestHeaders: [
                  {
                    header: 'Origin',
                    operation: 'set',
                    value: originPermitida
                  },
                  {
                    header: 'User-Agent',
                    operation: 'set',
                    value: userAgentSimulado
                  },
                  {
                    header: 'Cookie',
                    operation: 'set',
                    value: `muid=${muidSessao};`
                  }
                ]
              },
              condition: {
                urlFilter: '||speech.platform.bing.com/',
                resourceTypes: ['websocket', 'xmlhttprequest', 'other']
              }
            }
          ]
        });
        ClienteWebSocketEdgeTts.cabecalhosRedeConfigurados = true;
      }

      let regrasMatchedWss = null;
      if (typeof chrome.declarativeNetRequest.testMatchOutcome === 'function') {
        try {
          regrasMatchedWss = await chrome.declarativeNetRequest.testMatchOutcome({
            url: CONSTANTES_SISTEMA.URL_BASE_WEBSOCKET_EDGE,
            type: 'websocket',
            tabId: -1
          });
        } catch (erroMatch) {
          regrasMatchedWss = {
            erroTestMatch: erroMatch instanceof Error ? erroMatch.message : String(erroMatch)
          };
        }
      }

      const regrasDinamicas =
        typeof chrome.declarativeNetRequest.getDynamicRules === 'function'
          ? await chrome.declarativeNetRequest.getDynamicRules()
          : [];

      return {
        disponivel: true,
        regraDinamicaAtiva: regrasDinamicas.map((r) => r.id),
        resultadoMatchWss: regrasMatchedWss
      };
    } catch (erroDnr) {
      console.error(
        '[ReadForMe ERRO] Falha ao configurar declarativeNetRequest:',
        erroDnr
      );
      return {
        disponivel: true,
        erro: erroDnr instanceof Error ? erroDnr.message : String(erroDnr)
      };
    }
  }
}

ClienteWebSocketEdgeTts.cabecalhosRedeConfigurados = false;
