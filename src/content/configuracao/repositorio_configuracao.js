/**
 * Repositório de persistência e sincronização reativa das preferências do usuário
 * em chrome.storage.local (voz, velocidade, filtro de idioma, posição do player e modo de privacidade).
 */
(function inicializarRepositorioConfiguracao(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};
  const { CONSTANTES_SISTEMA } = escopoGlobal.ReadForMe;

  class RepositorioConfiguracao {
    constructor() {
      this.memoriaContingencia = {
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.VOZ_SELECIONADA]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.VELOCIDADE_REPRODUCAO]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.IDIOMA_FILTRO]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.IDIOMA_FILTRO,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.POSICAO_MINI_PLAYER]: null,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.MODO_PRIVACIDADE_VOZ]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ
      };
      this.ouvintesMudanca = new Set();
      this.registrarOuvinteStorageNativo();
    }

    /**
     * Verifica se a API chrome.storage.local está acessível no contexto atual.
     * @returns {boolean}
     */
    possuiStorageNativo() {
      return Boolean(
        typeof chrome !== 'undefined' &&
          chrome.storage &&
          chrome.storage.local &&
          typeof chrome.storage.local.get === 'function'
      );
    }

    /**
     * Carrega todas as preferências salvas do usuário aplicando valores padrão seguros.
     * @returns {Promise<{vozSelecionada: string, velocidadeReproducao: number, idiomaFiltro: string, posicaoMiniPlayer: {x: number, y: number} | null, modoPrivacidadeVoz: string}>}
     */
    async carregarConfiguracaoCompleta() {
      const chaves = CONSTANTES_SISTEMA.CHAVES_STORAGE;
      let dadosArmazenados = { ...this.memoriaContingencia };

      if (this.possuiStorageNativo()) {
        try {
          const respostaStorage = await chrome.storage.local.get([
            chaves.VOZ_SELECIONADA,
            chaves.VELOCIDADE_REPRODUCAO,
            chaves.IDIOMA_FILTRO,
            chaves.POSICAO_MINI_PLAYER,
            chaves.MODO_PRIVACIDADE_VOZ
          ]);
          dadosArmazenados = { ...dadosArmazenados, ...respostaStorage };
        } catch {
          // Mantém valores da memória de contingência caso o contexto da extensão tenha sido invalidado
        }
      }

      const velocidadeBruta = Number(dadosArmazenados[chaves.VELOCIDADE_REPRODUCAO]);
      const velocidadeValida = CONSTANTES_SISTEMA.VELOCIDADES_DISPONIVEIS.includes(velocidadeBruta)
        ? velocidadeBruta
        : CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO;

      return {
        vozSelecionada:
          dadosArmazenados[chaves.VOZ_SELECIONADA] ||
          CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA,
        velocidadeReproducao: velocidadeValida,
        idiomaFiltro:
          dadosArmazenados[chaves.IDIOMA_FILTRO] ||
          CONSTANTES_SISTEMA.VALORES_PADRAO.IDIOMA_FILTRO,
        posicaoMiniPlayer: dadosArmazenados[chaves.POSICAO_MINI_PLAYER] || null,
        modoPrivacidadeVoz:
          dadosArmazenados[chaves.MODO_PRIVACIDADE_VOZ] ||
          CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ
      };
    }

    /**
     * Salva a voz natural escolhida pelo usuário.
     * @param {string} nomeCurtoVoz
     * @returns {Promise<void>}
     */
    async salvarVozSelecionada(nomeCurtoVoz) {
      if (!nomeCurtoVoz || typeof nomeCurtoVoz !== 'string') {
        return;
      }
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.VOZ_SELECIONADA,
        nomeCurtoVoz
      );
    }

    /**
     * Salva a velocidade de reprodução preferida (0.75x a 2.0x).
     * @param {number} novaVelocidade
     * @returns {Promise<void>}
     */
    async salvarVelocidadeReproducao(novaVelocidade) {
      const velocidadeNumerica = Number(novaVelocidade);
      if (!CONSTANTES_SISTEMA.VELOCIDADES_DISPONIVEIS.includes(velocidadeNumerica)) {
        return;
      }
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.VELOCIDADE_REPRODUCAO,
        velocidadeNumerica
      );
    }

    /**
     * Salva o filtro de idioma selecionado no Mini-Player.
     * @param {string} codigoIdiomaFiltro
     * @returns {Promise<void>}
     */
    async salvarIdiomaFiltro(codigoIdiomaFiltro) {
      if (!codigoIdiomaFiltro || typeof codigoIdiomaFiltro !== 'string') {
        return;
      }
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.IDIOMA_FILTRO,
        codigoIdiomaFiltro
      );
    }

    /**
     * Salva as coordenadas (x, y) personalizadas do Mini-Player na viewport.
     * @param {{x: number, y: number}} coordenadasPosicao
     * @returns {Promise<void>}
     */
    async salvarPosicaoMiniPlayer(coordenadasPosicao) {
      if (
        !coordenadasPosicao ||
        typeof coordenadasPosicao.x !== 'number' ||
        typeof coordenadasPosicao.y !== 'number'
      ) {
        return;
      }
      await this.gravarChaveValor(CONSTANTES_SISTEMA.CHAVES_STORAGE.POSICAO_MINI_PLAYER, {
        x: Math.round(coordenadasPosicao.x),
        y: Math.round(coordenadasPosicao.y)
      });
    }

    /**
     * Salva a decisão de privacidade do usuário ('NAO_DEFINIDO' | 'REMOTO_AUTORIZADO' | 'SOMENTE_LOCAL').
     * @param {string} modoPrivacidade
     * @returns {Promise<void>}
     */
    async salvarModoPrivacidadeVoz(modoPrivacidade) {
      const modosValidos = Object.values(CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ);
      if (!modosValidos.includes(modoPrivacidade)) {
        return;
      }
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.MODO_PRIVACIDADE_VOZ,
        modoPrivacidade
      );
    }

    /**
     * Grava um par chave-valor na memória local e no chrome.storage.local.
     * @param {string} chaveStorage
     * @param {*} valor
     * @returns {Promise<void>}
     */
    async gravarChaveValor(chaveStorage, valor) {
      this.memoriaContingencia[chaveStorage] = valor;
      if (this.possuiStorageNativo()) {
        try {
          await chrome.storage.local.set({ [chaveStorage]: valor });
        } catch {
          // Ignora falha silenciosa se storage estiver indisponível
        }
      }
    }

    /**
     * Registra callback para reagir a mudanças de configuração feitas em outras abas.
     * @param {function(Object): void} callbackMudanca
     * @returns {function(): void} Função para cancelar inscrição.
     */
    aoMudarConfiguracao(callbackMudanca) {
      this.ouvintesMudanca.add(callbackMudanca);
      return () => {
        this.ouvintesMudanca.delete(callbackMudanca);
      };
    }

    /**
     * Escuta chrome.storage.onChanged para sincronizar abas em tempo real.
     * @returns {void}
     */
    registrarOuvinteStorageNativo() {
      if (
        typeof chrome === 'undefined' ||
        !chrome.storage ||
        !chrome.storage.onChanged
      ) {
        return;
      }
      chrome.storage.onChanged.addListener((mudancas, areaStorage) => {
        if (areaStorage !== 'local') {
          return;
        }
        for (const [chave, objetoMudanca] of Object.entries(mudancas)) {
          this.memoriaContingencia[chave] = objetoMudanca.newValue;
        }
        for (const ouvinte of this.ouvintesMudanca) {
          try {
            ouvinte(mudancas);
          } catch {
            // Protege demais ouvintes
          }
        }
      });
    }
  }

  escopoGlobal.ReadForMe.RepositorioConfiguracao = RepositorioConfiguracao;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RepositorioConfiguracao;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
