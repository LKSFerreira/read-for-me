/**
 * Reprodutor de pacotes de áudio MP3 em memória (HTMLAudioElement + Blob URL com contingência Web Audio API)
 * com sincronização temporal de WordBoundary a 60fps via requestAnimationFrame
 * e alteração de velocidade em tempo real com preservação de tom (preservesPitch).
 */
(function inicializarReprodutorAudioBuffer(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  class ReprodutorAudioBuffer {
    /**
     * @param {Object} callbacks - Callbacks de ciclo de vida do áudio.
     * @param {function({indiceInicialCaractere: number, comprimentoPalavra: number, textoPalavra: string}): void} callbacks.aoAtivarPalavra
     * @param {function(): void} callbacks.aoConcluirSentenca
     * @param {function(Error): void} callbacks.aoOcorrerErroAudio
     */
    constructor({ aoAtivarPalavra, aoConcluirSentenca, aoOcorrerErroAudio }) {
      this.aoAtivarPalavra = aoAtivarPalavra;
      this.aoConcluirSentenca = aoConcluirSentenca;
      this.aoOcorrerErroAudio = aoOcorrerErroAudio;
      this.elementoAudio = typeof Audio !== 'undefined' ? new Audio() : null;
      if (this.elementoAudio) {
        this.elementoAudio.preload = 'auto';
        this.elementoAudio.preservesPitch = true;
      }
      this.urlObjetoAtual = null;
      this.idQuadrosAnimacao = null;
      this.limitesPalavrasAtuais = [];
      this.ultimoIndicePalavraDestacada = -1;
      this.velocidadeAtual = 1.0;
      this.emReproducao = false;
      this.aguardandoInicioElementoAudio = false;

      this.contextoAudio = null;
      this.fonteWebAudioAtiva = null;
      this.usandoWebAudioApi = false;
      this.instanteUltimoTickWebAudio = 0;
      this.posicaoSegundosWebAudio = 0;

      this.configurarEventosElementoAudio();
    }

    /**
     * Registra listeners de término e erro no HTMLAudioElement.
     * @returns {void}
     */
    configurarEventosElementoAudio() {
      if (!this.elementoAudio) {
        return;
      }

      this.elementoAudio.onended = () => {
        if (!this.emReproducao || this.usandoWebAudioApi) {
          return;
        }
        console.log('[ReadForMe][ReprodutorAudioBuffer] Sentença concluída (HTMLAudioElement.onended).');
        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        this.aoConcluirSentenca();
      };

      this.elementoAudio.onerror = () => {
        const detalheMidia =
          this.elementoAudio && this.elementoAudio.error
            ? `code=${this.elementoAudio.error.code}, message=${this.elementoAudio.error.message || 'sem detalhe'}`
            : 'sem MediaError detalhado';
        console.error(
          `[ReadForMe ERRO][ReprodutorAudioBuffer] Evento HTMLAudioElement.onerror disparado (${detalheMidia}).`
        );

        // Se ainda estamos dentro do await elementoAudio.play(), deixamos o catch de reproduzirPacote
        // tentar o AudioContext (Web Audio API) antes de abortar a voz neural!
        if (this.aguardandoInicioElementoAudio) {
          return;
        }

        if (!this.emReproducao || this.usandoWebAudioApi) {
          return;
        }
        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        this.aoOcorrerErroAudio(
          new Error(
            `Falha ao decodificar ou reproduzir o buffer MP3 da sentença (${detalheMidia}).`
          )
        );
      };
    }

    /**
     * Converte uma string Base64 de áudio MP3 em Blob URL e inicia a reprodução.
     * Caso o HTMLAudioElement falhe (ex.: bloqueio de blob: por CSP media-src da página),
     * decodifica e reproduz o mesmo áudio MP3 neural via Web Audio API (AudioContext).
     * @param {{audioBase64: string, limitesPalavras: Array}} pacoteSentenca
     * @param {number} velocidadeReproducao
     * @returns {Promise<void>}
     */
    async reproduzirPacote(pacoteSentenca, velocidadeReproducao = 1.0) {
      if (!this.elementoAudio) {
        throw new Error('Elemento de áudio HTML5 indisponível neste contexto.');
      }
      if (!pacoteSentenca || !pacoteSentenca.audioBase64) {
        throw new Error('Pacote de áudio inválido ou vazio.');
      }

      this.pararELimpar();

      this.velocidadeAtual = Number(velocidadeReproducao) || 1.0;
      this.limitesPalavrasAtuais = Array.isArray(pacoteSentenca.limitesPalavras)
        ? pacoteSentenca.limitesPalavras
        : [];
      this.ultimoIndicePalavraDestacada = -1;

      const bytesMp3 = ReprodutorAudioBuffer.converterBase64ParaUint8Array(
        pacoteSentenca.audioBase64
      );
      console.log('[ReadForMe][ReprodutorAudioBuffer] Iniciando reprodução de pacote MP3 neural:', {
        bytesMp3: bytesMp3.byteLength,
        limitesPalavras: this.limitesPalavrasAtuais.length,
        velocidade: this.velocidadeAtual
      });

      const blobMp3 = new Blob([bytesMp3], { type: 'audio/mpeg' });
      this.urlObjetoAtual = URL.createObjectURL(blobMp3);

      this.elementoAudio.src = this.urlObjetoAtual;
      this.elementoAudio.playbackRate = this.velocidadeAtual;
      this.elementoAudio.preservesPitch = true;
      this.emReproducao = true;
      this.usandoWebAudioApi = false;
      this.aguardandoInicioElementoAudio = true;

      this.iniciarLoopSincronizacao();

      try {
        await this.elementoAudio.play();
        this.aguardandoInicioElementoAudio = false;
        console.log('[ReadForMe][ReprodutorAudioBuffer] Reproduzindo MP3 neural com sucesso via HTMLAudioElement.');
      } catch (erroPlayHtmlAudio) {
        this.aguardandoInicioElementoAudio = false;
        console.warn(
          '[ReadForMe][ReprodutorAudioBuffer] HTMLAudioElement.play() falhou (possível bloqueio de blob: por CSP media-src da página). Tentando reproduzir o MP3 neural via Web Audio API (AudioContext)...',
          erroPlayHtmlAudio
        );

        if (this. podeUsarWebAudioApi()) {
          await this.reproduzirViaWebAudioApi(bytesMp3);
          return;
        }

        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        throw erroPlayHtmlAudio;
      }
    }

    /**
     * Verifica se o ambiente possui suporte a AudioContext (Web Audio API) real no navegador.
     * @returns {boolean}
     */
    podeUsarWebAudioApi() {
      if (typeof window === 'undefined') {
        return false;
      }
      const ConstrutorContexto = window.AudioContext || window.webkitAudioContext;
      return typeof ConstrutorContexto === 'function';
    }

    /**
     * Decodifica e reproduz o buffer MP3 diretamente via Web Audio API (imune a bloqueio de CSP media-src para blob:).
     * @param {Uint8Array} bytesMp3
     * @returns {Promise<void>}
     */
    async reproduzirViaWebAudioApi(bytesMp3) {
      const ConstrutorContexto = window.AudioContext || window.webkitAudioContext;
      if (!this.contextoAudio || this.contextoAudio.state === 'closed') {
        this.contextoAudio = new ConstrutorContexto();
      }
      if (this.contextoAudio.state === 'suspended') {
        await this.contextoAudio.resume();
      }

      const copiaArrayBuffer = bytesMp3.buffer.slice(
        bytesMp3.byteOffset,
        bytesMp3.byteOffset + bytesMp3.byteLength
      );
      const audioDecodificado = await this.contextoAudio.decodeAudioData(copiaArrayBuffer);

      const fonteBuffer = this.contextoAudio.createBufferSource();
      fonteBuffer.buffer = audioDecodificado;
      if (fonteBuffer.playbackRate) {
        fonteBuffer.playbackRate.value = this.velocidadeAtual;
      }
      fonteBuffer.connect(this.contextoAudio.destination);

      this.fonteWebAudioAtiva = fonteBuffer;
      this.usandoWebAudioApi = true;
      this.emReproducao = true;
      this.posicaoSegundosWebAudio = 0;
      this.instanteUltimoTickWebAudio = this.contextoAudio.currentTime;

      fonteBuffer.onended = () => {
        if (this.fonteWebAudioAtiva !== fonteBuffer || !this.emReproducao) {
          return;
        }
        console.log('[ReadForMe][ReprodutorAudioBuffer] Sentença concluída via Web Audio API (onended).');
        this.fonteWebAudioAtiva = null;
        this.usandoWebAudioApi = false;
        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        this.aoConcluirSentenca();
      };

      this.iniciarLoopSincronizacao();
      fonteBuffer.start(0);
      console.log('[ReadForMe][ReprodutorAudioBuffer] Reproduzindo MP3 neural com sucesso via Web Audio API (AudioContext).');
    }

    /**
     * Altera a taxa de reprodução em tempo real sem reiniciar a frase nem afetar o tom.
     * @param {number} novaVelocidade
     * @returns {void}
     */
    definirVelocidade(novaVelocidade) {
      const velocidadeSegura = Number(novaVelocidade) || 1.0;
      this.velocidadeAtual = velocidadeSegura;
      if (this.elementoAudio) {
        this.elementoAudio.playbackRate = velocidadeSegura;
      }
      if (this.fonteWebAudioAtiva && this.fonteWebAudioAtiva.playbackRate) {
        this.fonteWebAudioAtiva.playbackRate.value = velocidadeSegura;
      }
    }

    /**
     * Pausa a reprodução na posição exata atual.
     * @returns {void}
     */
    pausar() {
      this.emReproducao = false;
      this.cancelarLoopSincronizacao();
      if (this.usandoWebAudioApi && this.contextoAudio && this.contextoAudio.state === 'running') {
        this.contextoAudio.suspend().catch(() => {});
        return;
      }
      if (this.elementoAudio) {
        this.elementoAudio.pause();
      }
    }

    /**
     * Retoma a reprodução a partir do ponto em que foi pausada.
     * @returns {Promise<void>}
     */
    async retomar() {
      if (this.usandoWebAudioApi && this.contextoAudio) {
        this.emReproducao = true;
        await this.contextoAudio.resume();
        this.instanteUltimoTickWebAudio = this.contextoAudio.currentTime;
        this.iniciarLoopSincronizacao();
        return;
      }
      if (!this.elementoAudio) {
        return;
      }
      this.emReproducao = true;
      this.elementoAudio.playbackRate = this.velocidadeAtual;
      this.iniciarLoopSincronizacao();
      await this.elementoAudio.play();
    }

    /**
     * Interrompe imediatamente o áudio e libera o Blob URL da memória.
     * @returns {void}
     */
    pararELimpar() {
      this.emReproducao = false;
      this.aguardandoInicioElementoAudio = false;
      this.cancelarLoopSincronizacao();

      if (this.fonteWebAudioAtiva) {
        const fonteAntiga = this.fonteWebAudioAtiva;
        this.fonteWebAudioAtiva = null;
        try {
          fonteAntiga.onended = null;
          fonteAntiga.stop();
          fonteAntiga.disconnect();
        } catch {
          // Ignora se já havia parado
        }
      }
      this.usandoWebAudioApi = false;

      if (this.elementoAudio) {
        this.elementoAudio.pause();
        this.elementoAudio.removeAttribute('src');
        if (typeof this.elementoAudio.load === 'function') {
          this.elementoAudio.load();
        }
      }
      if (this.urlObjetoAtual && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(this.urlObjetoAtual);
        this.urlObjetoAtual = null;
      }
      this.limitesPalavrasAtuais = [];
      this.ultimoIndicePalavraDestacada = -1;
    }

    /**
     * Inicia o loop de alta frequência (requestAnimationFrame) para sincronizar WordBoundary.
     * @returns {void}
     */
    iniciarLoopSincronizacao() {
      this.cancelarLoopSincronizacao();
      const verificarTempoAtual = () => {
        if (!this.emReproducao) {
          return;
        }

        let tempoSegundos = 0;
        if (this.usandoWebAudioApi && this.contextoAudio) {
          const agoraContexto = this.contextoAudio.currentTime;
          const deltaContexto = Math.max(0, agoraContexto - this.instanteUltimoTickWebAudio);
          this.instanteUltimoTickWebAudio = agoraContexto;
          this.posicaoSegundosWebAudio += deltaContexto * this.velocidadeAtual;
          tempoSegundos = this.posicaoSegundosWebAudio;
        } else if (this.elementoAudio) {
          tempoSegundos = this.elementoAudio.currentTime || 0;
        } else {
          return;
        }

        this.sincronizarPalavraNoTempo(tempoSegundos);

        if (typeof requestAnimationFrame === 'function') {
          this.idQuadrosAnimacao = requestAnimationFrame(verificarTempoAtual);
        }
      };

      if (typeof requestAnimationFrame === 'function') {
        this.idQuadrosAnimacao = requestAnimationFrame(verificarTempoAtual);
      }
    }

    /**
     * Cancela o loop de animação ativo.
     * @returns {void}
     */
    cancelarLoopSincronizacao() {
      if (this.idQuadrosAnimacao !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.idQuadrosAnimacao);
        this.idQuadrosAnimacao = null;
      }
    }

    /**
     * Localiza a palavra correspondente ao tempo corrente do áudio e emite callback quando muda.
     * @param {number} tempoSegundos
     * @returns {void}
     */
    sincronizarPalavraNoTempo(tempoSegundos) {
      if (this.limitesPalavrasAtuais.length === 0) {
        return;
      }

      let indiceEncontrado = -1;
      for (let indice = 0; indice < this.limitesPalavrasAtuais.length; indice += 1) {
        const limite = this.limitesPalavrasAtuais[indice];
        if (tempoSegundos >= limite.tempoInicioSegundos) {
          indiceEncontrado = indice;
        } else {
          break;
        }
      }

      if (
        indiceEncontrado !== -1 &&
        indiceEncontrado !== this.ultimoIndicePalavraDestacada
      ) {
        this.ultimoIndicePalavraDestacada = indiceEncontrado;
        const palavraAtiva = this.limitesPalavrasAtuais[indiceEncontrado];
        this.aoAtivarPalavra({
          indiceInicialCaractere: palavraAtiva.indiceInicialCaractere,
          comprimentoPalavra: palavraAtiva.comprimentoPalavra,
          textoPalavra: palavraAtiva.textoPalavra
        });
      }
    }

    /**
     * Converte string Base64 para Uint8Array binário.
     * @param {string} cadeiaBase64
     * @returns {Uint8Array}
     */
    static converterBase64ParaUint8Array(cadeiaBase64) {
      const stringBinaria = atob(cadeiaBase64);
      const comprimento = stringBinaria.length;
      const bytes = new Uint8Array(comprimento);
      for (let indice = 0; indice < comprimento; indice += 1) {
        bytes[indice] = stringBinaria.charCodeAt(indice);
      }
      return bytes;
    }
  }

  escopoGlobal.ReadForMe.ReprodutorAudioBuffer = ReprodutorAudioBuffer;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReprodutorAudioBuffer;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
