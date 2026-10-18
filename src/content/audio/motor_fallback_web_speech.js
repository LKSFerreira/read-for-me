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
     * Extrai o nome próprio de um identificador ShortName (ex.: 'pt-BR-AntonioNeural' -> 'antonio').
     * @param {string} nomeVozPreferida
     * @returns {string}
     */
    static extrairNomeProprioVoz(nomeVozPreferida) {
      const limpo = String(nomeVozPreferida || '')
        .replace(/^[a-z]{2,3}-[A-Z]{2,4}-/i, '')
        .replace(/MultilingualNeural$/i, '')
        .replace(/Neural$/i, '')
        .trim()
        .toLowerCase();
      return limpo;
    }

    /**
     * Localiza a melhor voz local equivalente quando a voz neural online não existe no sistema.
     * @param {SpeechSynthesisVoice[]} listaVozesLocais
     * @param {string} nomeVozPreferida
     * @returns {{ vozEscolhida: SpeechSynthesisVoice | null, idiomaResolvido: string, tomVoz: number }}
     */
    static selecionarMelhorVozEquivalente(listaVozesLocais, nomeVozPreferida) {
      const vozesValidas = Array.isArray(listaVozesLocais) ? listaVozesLocais : [];
      const textoPreferido = String(nomeVozPreferida || '').trim();
      const idiomaAlvo = (textoPreferido.match(/^[a-z]{2}-[A-Z]{2}/) || ['pt-BR'])[0];
      const prefixoLingua = idiomaAlvo.split('-')[0].toLowerCase();
      const normalizarTag = (tag) => String(tag || '').replace('_', '-').toLowerCase();
      const nomeProprio = MotorFallbackWebSpeech.extrairNomeProprioVoz(textoPreferido);

      const nomesMasculinos = new Set([
        'antonio',
        'duarte',
        'guy',
        'christopher',
        'alvaro',
        'daniel',
        'ricardo',
        'felipe',
        'jorge',
        'david',
        'mark'
      ]);
      const ehVozMasculina = nomesMasculinos.has(nomeProprio);

      if (textoPreferido) {
        const correspondenciaExataNome = vozesValidas.find((voz) =>
          String(voz.name || '')
            .toLowerCase()
            .includes(textoPreferido.toLowerCase())
        );
        if (correspondenciaExataNome) {
          return {
            vozEscolhida: correspondenciaExataNome,
            idiomaResolvido: idiomaAlvo,
            tomVoz: 1.0
          };
        }
      }

      if (nomeProprio && nomeProprio.length >= 3) {
        const correspondenciaNomeProprio = vozesValidas.find((voz) => {
          const nomeVozLocal = String(voz.name || '').toLowerCase();
          return (
            nomeVozLocal.includes(nomeProprio) &&
            normalizarTag(voz.lang).startsWith(prefixoLingua)
          );
        });
        if (correspondenciaNomeProprio) {
          return {
            vozEscolhida: correspondenciaNomeProprio,
            idiomaResolvido: idiomaAlvo,
            tomVoz: 1.0
          };
        }
      }

      const vozesIdiomaRegiao = vozesValidas.filter(
        (voz) => normalizarTag(voz.lang) === normalizarTag(idiomaAlvo)
      );
      if (vozesIdiomaRegiao.length > 0) {
        if (vozesIdiomaRegiao.length > 1 && nomeProprio) {
          const pistaGenero = ehVozMasculina
            ? ['daniel', 'antonio', 'ricardo', 'felipe', 'male', 'david', 'mark', 'guy']
            : ['maria', 'francisca', 'thalita', 'luciana', 'heluga', 'female', 'zira', 'jenny'];
          const vozPorGenero = vozesIdiomaRegiao.find((voz) => {
            const nomeLower = String(voz.name || '').toLowerCase();
            return pistaGenero.some((termo) => nomeLower.includes(termo));
          });
          if (vozPorGenero) {
            return {
              vozEscolhida: vozPorGenero,
              idiomaResolvido: idiomaAlvo,
              tomVoz: nomeProprio === 'thalita' ? 1.05 : 1.0
            };
          }
        }
        const tomCalculado = ehVozMasculina ? 0.88 : nomeProprio === 'thalita' ? 1.06 : 1.0;
        return {
          vozEscolhida: vozesIdiomaRegiao[0],
          idiomaResolvido: idiomaAlvo,
          tomVoz: tomCalculado
        };
      }

      const correspondenciaFamiliaLingua = vozesValidas.find((voz) =>
        normalizarTag(voz.lang).startsWith(prefixoLingua)
      );
      if (correspondenciaFamiliaLingua) {
        return {
          vozEscolhida: correspondenciaFamiliaLingua,
          idiomaResolvido: correspondenciaFamiliaLingua.lang || idiomaAlvo,
          tomVoz: ehVozMasculina ? 0.88 : 1.0
        };
      }

      const vozPadraoSistema =
        vozesValidas.find((voz) => voz.default) || vozesValidas[0] || null;
      return {
        vozEscolhida: vozPadraoSistema,
        idiomaResolvido: idiomaAlvo,
        tomVoz: 1.0
      };
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
      const { vozEscolhida, idiomaResolvido, tomVoz } =
        MotorFallbackWebSpeech.selecionarMelhorVozEquivalente(
          vozesLocais,
          nomeVozPreferida
        );

      console.warn(
        '[ReadForMe][MotorFallbackWebSpeech] Reproduzindo via Web Speech API local (Fallback):',
        {
          nomeVozPreferida,
          vozLocalEscolhida: vozEscolhida ? vozEscolhida.name : 'nenhuma (padrão sistema)',
          idiomaVozLocal: vozEscolhida ? vozEscolhida.lang : idiomaResolvido,
          tomVoz,
          velocidade: this.velocidadeAtual,
          totalVozesLocaisNoNavegador: vozesLocais.length,
          nomesVozesLocais: vozesLocais.map((v) => `${v.name} (${v.lang})`)
        }
      );

      const enunciado = new SpeechSynthesisUtterance(textoSentenca);
      enunciado.lang = idiomaResolvido;
      enunciado.rate = this.velocidadeAtual;
      enunciado.pitch = typeof tomVoz === 'number' ? tomVoz : 1.0;
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
