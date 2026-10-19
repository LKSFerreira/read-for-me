/**
 * Repositório de persistência e sincronização reativa das preferências do usuário
 * em chrome.storage.local (voz, velocidade, filtro de idioma, posição do player,
 * exibição do player/botão, modo de leitura contínua, estilo dos highlights e privacidade).
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
          CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.EXIBIR_MINI_PLAYER_FLUTUANTE]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_MINI_PLAYER_FLUTUANTE,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.EXIBIR_BOTAO_FLUTUANTE_SELECAO]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_BOTAO_FLUTUANTE_SELECAO,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.MODO_LEITURA_CONTINUA]:
          CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_LEITURA_CONTINUA,
        [CONSTANTES_SISTEMA.CHAVES_STORAGE.ESTILO_HIGHLIGHT]: {
          ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO
        }
      };
      this.ouvintesMudanca = new Set();
      this.registrarOuvinteStorageNativo();
    }

    /**
     * Verifica se a API chrome.storage.local está acessível no contexto atual.
     * @returns {boolean}
     */
    possuiStorageNativo() {
      try {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local ||
          typeof chrome.storage.local.get !== 'function'
        ) {
          return false;
        }
        if (chrome.runtime && chrome.runtime.id !== undefined) {
          return Boolean(chrome.runtime.id);
        }
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Carrega todas as preferências salvas do usuário aplicando valores padrão seguros.
     * @returns {Promise<Object>}
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
            chaves.MODO_PRIVACIDADE_VOZ,
            chaves.EXIBIR_MINI_PLAYER_FLUTUANTE,
            chaves.EXIBIR_BOTAO_FLUTUANTE_SELECAO,
            chaves.MODO_LEITURA_CONTINUA,
            chaves.ESTILO_HIGHLIGHT
          ]);
          dadosArmazenados = { ...dadosArmazenados, ...respostaStorage };
        } catch {
          // Mantém valores da memória de contingência caso o contexto da extensão tenha sido invalidado
        }
      }

      const velocidadeBruta = Number(dadosArmazenados[chaves.VELOCIDADE_REPRODUCAO]);
      const velocidadeMinima = CONSTANTES_SISTEMA.VELOCIDADE_MINIMA || 0.75;
      const velocidadeMaxima = CONSTANTES_SISTEMA.VELOCIDADE_MAXIMA || 2.0;
      const velocidadeValida =
        Number.isFinite(velocidadeBruta) &&
        velocidadeBruta >= velocidadeMinima &&
        velocidadeBruta <= velocidadeMaxima
          ? Math.round(velocidadeBruta * 100) / 100
          : CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO;

      const estiloSalvo = dadosArmazenados[chaves.ESTILO_HIGHLIGHT];
      const ehEstiloLegadoLaranja =
        estiloSalvo &&
        (estiloSalvo.temaPreset === 'ambar-editorial' ||
          String(estiloSalvo.corFrase || '').toLowerCase() === '#ff5500');
      const estiloHighlightNormalizado = ehEstiloLegadoLaranja
        ? { ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO }
        : {
            ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
            ...(estiloSalvo && typeof estiloSalvo === 'object' ? estiloSalvo : {})
          };

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
          CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ,
        exibirMiniPlayerFlutuante:
          typeof dadosArmazenados[chaves.EXIBIR_MINI_PLAYER_FLUTUANTE] === 'boolean'
            ? dadosArmazenados[chaves.EXIBIR_MINI_PLAYER_FLUTUANTE]
            : CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_MINI_PLAYER_FLUTUANTE,
        exibirBotaoFlutuanteSelecao:
          typeof dadosArmazenados[chaves.EXIBIR_BOTAO_FLUTUANTE_SELECAO] === 'boolean'
            ? dadosArmazenados[chaves.EXIBIR_BOTAO_FLUTUANTE_SELECAO]
            : CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_BOTAO_FLUTUANTE_SELECAO,
        modoLeituraContinua:
          typeof dadosArmazenados[chaves.MODO_LEITURA_CONTINUA] === 'boolean'
            ? dadosArmazenados[chaves.MODO_LEITURA_CONTINUA]
            : CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_LEITURA_CONTINUA,
        estiloHighlight: estiloHighlightNormalizado
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
     * Salva a velocidade de reprodução preferida (0.75x a 2.00x com precisão de 0.01).
     * @param {number} novaVelocidade
     * @returns {Promise<void>}
     */
    async salvarVelocidadeReproducao(novaVelocidade) {
      const velocidadeNumerica = Number(novaVelocidade);
      const velocidadeMinima = CONSTANTES_SISTEMA.VELOCIDADE_MINIMA || 0.75;
      const velocidadeMaxima = CONSTANTES_SISTEMA.VELOCIDADE_MAXIMA || 2.0;
      if (
        !Number.isFinite(velocidadeNumerica) ||
        velocidadeNumerica < velocidadeMinima ||
        velocidadeNumerica > velocidadeMaxima
      ) {
        return;
      }
      const velocidadeArredondada = Math.round(velocidadeNumerica * 100) / 100;
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.VELOCIDADE_REPRODUCAO,
        velocidadeArredondada
      );
    }

    /**
     * Salva o filtro de idioma selecionado.
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
     * Salva a preferência de exibir ou ocultar o Mini-Player flutuante na página.
     * @param {boolean} exibir
     * @returns {Promise<void>}
     */
    async salvarExibirMiniPlayerFlutuante(exibir) {
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.EXIBIR_MINI_PLAYER_FLUTUANTE,
        Boolean(exibir)
      );
    }

    /**
     * Salva a preferência de exibir ou ocultar o botão flutuante ao selecionar texto.
     * @param {boolean} exibir
     * @returns {Promise<void>}
     */
    async salvarExibirBotaoFlutuanteSelecao(exibir) {
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.EXIBIR_BOTAO_FLUTUANTE_SELECAO,
        Boolean(exibir)
      );
    }

    /**
     * Salva a preferência de continuar lendo até o fim da página ao iniciar de uma palavra/seleção.
     * @param {boolean} leituraContinua
     * @returns {Promise<void>}
     */
    async salvarModoLeituraContinua(leituraContinua) {
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.MODO_LEITURA_CONTINUA,
        Boolean(leituraContinua)
      );
    }

    /**
     * Salva as preferências de cores e estilos do highlight de sentença e palavra.
     * @param {Object} novoEstiloHighlight
     * @returns {Promise<void>}
     */
    async salvarEstiloHighlight(novoEstiloHighlight) {
      if (!novoEstiloHighlight || typeof novoEstiloHighlight !== 'object') {
        return;
      }
      const estiloConsolidado = {
        ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
        ...novoEstiloHighlight
      };
      await this.gravarChaveValor(
        CONSTANTES_SISTEMA.CHAVES_STORAGE.ESTILO_HIGHLIGHT,
        estiloConsolidado
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
     * Registra callback para reagir a mudanças de configuração feitas no Popup ou em outras abas.
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
