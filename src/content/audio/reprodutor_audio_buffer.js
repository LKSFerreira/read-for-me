/**
 * Reprodutor de pacotes de áudio MP3 em memória (HTMLAudioElement + Blob URL)
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
        if (!this.emReproducao) {
          return;
        }
        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        this.aoConcluirSentenca();
      };

      this.elementoAudio.onerror = () => {
        if (!this.emReproducao) {
          return;
        }
        this.emReproducao = false;
        this.cancelarLoopSincronizacao();
        this.aoOcorrerErroAudio(
          new Error('Falha ao decodificar ou reproduzir o buffer MP3 da sentença.')
        );
      };
    }

    /**
     * Converte uma string Base64 de áudio MP3 em Blob URL e inicia a reprodução.
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
      const blobMp3 = new Blob([bytesMp3], { type: 'audio/mpeg' });
      this.urlObjetoAtual = URL.createObjectURL(blobMp3);

      this.elementoAudio.src = this.urlObjetoAtual;
      this.elementoAudio.playbackRate = this.velocidadeAtual;
      this.elementoAudio.preservesPitch = true;
      this.emReproducao = true;

      this.iniciarLoopSincronizacao();
      await this.elementoAudio.play();
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
    }

    /**
     * Pausa a reprodução na posição exata atual.
     * @returns {void}
     */
    pausar() {
      this.emReproducao = false;
      this.cancelarLoopSincronizacao();
      if (this.elementoAudio) {
        this.elementoAudio.pause();
      }
    }

    /**
     * Retoma a reprodução a partir do ponto em que foi pausada.
     * @returns {Promise<void>}
     */
    async retomar() {
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
      this.cancelarLoopSincronizacao();
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
        if (!this.emReproducao || !this.elementoAudio) {
          return;
        }
        const tempoSegundos = this.elementoAudio.currentTime || 0;
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
