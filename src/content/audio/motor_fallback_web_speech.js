/**
 * Motor de contingência (Fallback) baseado em window.speechSynthesis.
 * Inclui espera assíncrona do evento voiceschanged e cascata de seleção de voz local
 * quando uma voz neural (ex.: pt-BR-FranciscaNeural) não está presente no navegador.
 */
(function inicializarMotorFallbackWebSpeech(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  class MotorFallbackWebSpeech {
    /**
     * @param {Object} callbacks
     * @param {function({indiceInicialCaractere: number, comprimentoPalavra: number, textoPalavra: string}): void} callbacks.aoAtivarPalavra
     * @param {function(): void} callbacks.aoConcluirSentenca
     * @param {function(Error): void} callbacks.aoOcorrerErroAudio
     */
    constructor({ aoAtivarPalavra, aoConcluirSentenca, aoOcorrerErroAudio }) {
      this.aoAtivarPalavra = aoAtivarPalavra;
      this.aoConcluirSentenca = aoConcluirSentenca;
      this.aoOcorrerErroAudio = aoOcorrerErroAudio;
      this.velocidadeAtual = 1.0;
      this.enunciadoAtivo = null;
    }

    /**
     * Aguarda o carregamento assíncrono das vozes locais do navegador via voiceschanged.
     * @returns {Promise<SpeechSynthesisVoice[]>}
     */
    static async obterVozesLocaisProntas() {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return [];
      }
      const vozesImediatas = window.speechSynthesis.getVoices();
      if (Array.isArray(vozesImediatas) && vozesImediatas.length > 0) {
        return vozesImediatas;
      }

      return new Promise((resolver) => {
        const idTimer = setTimeout(() => {
          if (window.speechSynthesis.removeEventListener) {
            window.speechSynthesis.removeEventListener('voiceschanged', aoCarregarVozes);
          }
          resolver(window.speechSynthesis.getVoices() || []);
        }, 1500);

        function aoCarregarVozes() {
          clearTimeout(idTimer);
          if (window.speechSynthesis.removeEventListener) {
            window.speechSynthesis.removeEventListener('voiceschanged', aoCarregarVozes);
          }
          resolver(window.speechSynthesis.getVoices() || []);
        }

        if (window.speechSynthesis.addEventListener) {
          window.speechSynthesis.addEventListener('voiceschanged', aoCarregarVozes);
        } else {
          clearTimeout(idTimer);
          resolver([]);
        }
      });
    }

    /**
     * Localiza a melhor voz local equivalente quando a voz neural online não existe no sistema.
     * @param {SpeechSynthesisVoice[]} listaVozesLocais
     * @param {string} nomeVozPreferida
     * @returns {{ vozEscolhida: SpeechSynthesisVoice | null, idiomaResolvido: string }}
     */
    static selecionarMelhorVozEquivalente(listaVozesLocais, nomeVozPreferida) {
      const vozesValidas = Array.isArray(listaVozesLocais) ? listaVozesLocais : [];
      const idiomaAlvo = (String(nomeVozPreferida || '').match(/^[a-z]{2}-[A-Z]{2}/) || [
        'pt-BR'
      ])[0];
      const prefixoLingua = idiomaAlvo.split('-')[0].toLowerCase();
      const normalizarTag = (tag) => String(tag || '').replace('_', '-').toLowerCase();

      const correspondenciaExataNome = vozesValidas.find((voz) =>
        String(voz.name || '')
          .toLowerCase()
          .includes(String(nomeVozPreferida || '').toLowerCase())
      );
      if (correspondenciaExataNome) {
        return { vozEscolhida: correspondenciaExataNome, idiomaResolvido: idiomaAlvo };
      }

      const correspondenciaIdiomaRegiao = vozesValidas.find(
        (voz) => normalizarTag(voz.lang) === normalizarTag(idiomaAlvo)
      );
      if (correspondenciaIdiomaRegiao) {
        return { vozEscolhida: correspondenciaIdiomaRegiao, idiomaResolvido: idiomaAlvo };
      }

      const correspondenciaFamiliaLingua = vozesValidas.find((voz) =>
        normalizarTag(voz.lang).startsWith(prefixoLingua)
      );
      if (correspondenciaFamiliaLingua) {
        return {
          vozEscolhida: correspondenciaFamiliaLingua,
          idiomaResolvido: correspondenciaFamiliaLingua.lang || idiomaAlvo
        };
      }

      const vozPadraoSistema =
        vozesValidas.find((voz) => voz.default) || vozesValidas[0] || null;
      return { vozEscolhida: vozPadraoSistema, idiomaResolvido: idiomaAlvo };
    }

    /**
     * Reproduz uma sentença usando window.speechSynthesis e emite WordBoundary via onboundary.
     * @param {string} textoSentenca
     * @param {string} nomeVozPreferida
     * @param {number} velocidadeReproducao
     * @returns {Promise<void>}
     */
    async reproduzirSentencaFallback(
      textoSentenca,
      nomeVozPreferida,
      velocidadeReproducao = 1.0
    ) {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof SpeechSynthesisUtterance === 'undefined'
      ) {
        this.aoOcorrerErroAudio(new Error('Web Speech API indisponível neste navegador.'));
        return;
      }

      this.pararELimpar();
      this.velocidadeAtual = Number(velocidadeReproducao) || 1.0;

      const vozesLocais = await MotorFallbackWebSpeech.obterVozesLocaisProntas();
      const { vozEscolhida, idiomaResolvido } =
        MotorFallbackWebSpeech.selecionarMelhorVozEquivalente(
          vozesLocais,
          nomeVozPreferida
        );

      const enunciado = new SpeechSynthesisUtterance(textoSentenca);
      enunciado.lang = idiomaResolvido;
      enunciado.rate = this.velocidadeAtual;
      if (vozEscolhida) {
        enunciado.voice = vozEscolhida;
      }

      enunciado.onboundary = (eventoFronteira) => {
        if (
          eventoFronteira.name &&
          eventoFronteira.name !== 'word' &&
          typeof eventoFronteira.charIndex !== 'number'
        ) {
          return;
        }
        const indiceInicialCaractere = Math.max(0, eventoFronteira.charIndex || 0);
        let comprimentoPalavra = eventoFronteira.charLength || 0;
        if (comprimentoPalavra <= 0) {
          const restante = textoSentenca.slice(indiceInicialCaractere);
          const correspondenciaPalavra = restante.match(/^[\p{L}\p{N}]+/u);
          comprimentoPalavra = correspondenciaPalavra
            ? correspondenciaPalavra[0].length
            : Math.min(1, restante.length);
        }
        if (comprimentoPalavra > 0) {
          this.aoAtivarPalavra({
            indiceInicialCaractere,
            comprimentoPalavra,
            textoPalavra: textoSentenca.slice(
              indiceInicialCaractere,
              indiceInicialCaractere + comprimentoPalavra
            )
          });
        }
      };

      enunciado.onend = () => {
        if (this.enunciadoAtivo === enunciado) {
          this.enunciadoAtivo = null;
          this.aoConcluirSentenca();
        }
      };

      enunciado.onerror = (eventoErro) => {
        if (
          eventoErro &&
          (eventoErro.error === 'canceled' || eventoErro.error === 'interrupted')
        ) {
          return;
        }
        this.aoOcorrerErroAudio(
          new Error(
            `Erro no fallback Web Speech API: ${
              eventoErro && eventoErro.error ? eventoErro.error : 'desconhecido'
            }`
          )
        );
      };

      this.enunciadoAtivo = enunciado;
      window.speechSynthesis.speak(enunciado);
    }

    /**
     * Atualiza a velocidade para as próximas sentenças no fallback.
     * @param {number} novaVelocidade
     * @returns {void}
     */
    definirVelocidade(novaVelocidade) {
      this.velocidadeAtual = Number(novaVelocidade) || 1.0;
    }

    /**
     * Pausa a síntese de voz nativa.
     * @returns {void}
     */
    pausar() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
    }

    /**
     * Retoma a síntese de voz nativa.
     * @returns {void}
     */
    retomar() {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    }

    /**
     * Cancela imediatamente qualquer fala ativa no speechSynthesis.
     * @returns {void}
     */
    pararELimpar() {
      this.enunciadoAtivo = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }

  escopoGlobal.ReadForMe.MotorFallbackWebSpeech = MotorFallbackWebSpeech;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotorFallbackWebSpeech;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
