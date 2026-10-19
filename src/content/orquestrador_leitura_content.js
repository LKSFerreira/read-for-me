/**
 * Máquina de estados central do Content Script (OrquestradorLeituraContent).
 * Coordena:
 * - Leitura contínua a partir de uma palavra/letra selecionada ou clique direito ("Ler a partir daqui") até o fim do conteúdo;
 * - Remoção automática da seleção nativa ao iniciar a leitura para não contaminar os highlights;
 * - Personalização dinâmica de cores e estilos da CSS Custom Highlight API em tempo real;
 * - Exibição do Mini-Player flutuante (habilitado por padrão; pode ser desativado nas Opções);
 * - Pipeline de Pre-fetching concorrente em janela deslizante (N, N+1, N+2) e Keep-Alive MV3.
 */
(function inicializarOrquestradorLeituraContent(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const {
    CONSTANTES_SISTEMA,
    RepositorioConfiguracao,
    MapeadorSelecaoDom,
    GerenciadorHighlight,
    ReprodutorAudioBuffer,
    MotorFallbackWebSpeech,
    CSS_SHADOW_UI,
    BotaoFlutuanteSelecao,
    MiniPlayerFlutuante,
    GerenciadorAtalhosTeclado,
    UtilitariosTexto
  } = escopoGlobal.ReadForMe;

  class OrquestradorLeituraContent {
    /**
     * @param {Object} [dependenciasInjetadas] - Permite injeção de mocks em testes unitários.
     */
    constructor(dependenciasInjetadas = {}) {
      this.estadoAtual = 'INATIVO';
      this.idSessaoLeitura = null;
      this.mapaSelecaoAtiva = null;
      this.indiceSentencaAtual = 0;
      this.promessasBufferSentencas = new Map();
      this.requisicoesPendentesPorta = new Map();
      this.contadorRequisicoes = 0;

      this.portaBackground = null;
      this.idIntervaloHeartbeat = null;
      this.tentativasReconexao = 0;
      this.idTimeoutReconexao = null;
      this.usandoFallbackLocal = false;
      this.ultimoPontoCliqueDireito = null;
      this.audioPreviaAtivo = null;

      this.configuracaoAtual = {
        vozSelecionada: CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA,
        velocidadeReproducao: CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO,
        idiomaFiltro: CONSTANTES_SISTEMA.VALORES_PADRAO.IDIOMA_FILTRO,
        posicaoMiniPlayer: null,
        modoPrivacidadeVoz: CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ,
        exibirMiniPlayerFlutuante:
          CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_MINI_PLAYER_FLUTUANTE,
        exibirBotaoFlutuanteSelecao:
          CONSTANTES_SISTEMA.VALORES_PADRAO.EXIBIR_BOTAO_FLUTUANTE_SELECAO,
        modoLeituraContinua: CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_LEITURA_CONTINUA,
        estiloHighlight: { ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO }
      };

      this.repositorioConfiguracao =
        dependenciasInjetadas.repositorioConfiguracao ||
        new RepositorioConfiguracao();
      this.gerenciadorHighlight =
        dependenciasInjetadas.gerenciadorHighlight || new GerenciadorHighlight();

      this.reprodutorAudio =
        dependenciasInjetadas.reprodutorAudio ||
        new ReprodutorAudioBuffer({
          aoAtivarPalavra: (dadosPalavra) =>
            this.destacarPalavraDaSentencaAtiva(dadosPalavra),
          aoConcluirSentenca: () => this.avancarAutomaticamenteParaProximaSentenca(),
          aoOcorrerErroAudio: (erroAudio) => {
            console.error(
              '[ReadForMe ERRO][Orquestrador] Erro reportado pelo ReprodutorAudioBuffer:',
              erroAudio
            );
            this.acionarFallbackParaSentencaAtual(erroAudio);
          }
        });

      this.motorFallback =
        dependenciasInjetadas.motorFallback ||
        new MotorFallbackWebSpeech({
          aoAtivarPalavra: (dadosPalavra) =>
            this.destacarPalavraDaSentencaAtiva(dadosPalavra),
          aoConcluirSentenca: () => this.avancarAutomaticamenteParaProximaSentenca(),
          aoOcorrerErroAudio: (erroFallback) => {
            console.error(
              '[ReadForMe ERRO][Orquestrador] Erro reportado pelo MotorFallbackWebSpeech:',
              erroFallback
            );
            this.avancarAutomaticamenteParaProximaSentenca();
          }
        });

      this.raizShadow = null;
      this.botaoFlutuante = dependenciasInjetadas.botaoFlutuante || null;
      this.miniPlayer = dependenciasInjetadas.miniPlayer || null;
      this.gerenciadorAtalhos = null;
    }

    /**
     * Inicializa o host Shadow DOM, componentes de UI, atalhos, estilos de highlight e listeners da página.
     * @returns {Promise<void>}
     */
    async inicializarNaPagina() {
      if (typeof document === 'undefined' || !document.documentElement) {
        return;
      }

      this.configuracaoAtual =
        await this.repositorioConfiguracao.carregarConfiguracaoCompleta();
      if (
        this.gerenciadorHighlight &&
        typeof this.gerenciadorHighlight.aplicarEstiloPersonalizado === 'function'
      ) {
        this.gerenciadorHighlight.aplicarEstiloPersonalizado(
          this.configuracaoAtual.estiloHighlight
        );
      }

      this.criarHostShadowDom();
      this.registrarListenersDeSelecaoEMensagens();
      this.registrarSincronizacaoReativaDeConfiguracoes();
      this.solicitarCatalogoDeVozesAoBackground();
    }

    /**
     * Cria o elemento host isolado com Shadow DOM e injeta o CSS encapsulado.
     * @returns {void}
     */
    criarHostShadowDom() {
      let elementoHost = document.getElementById(CONSTANTES_SISTEMA.ID_HOST_SHADOW_DOM);
      if (!elementoHost) {
        elementoHost = document.createElement('div');
        elementoHost.id = CONSTANTES_SISTEMA.ID_HOST_SHADOW_DOM;
        elementoHost.setAttribute('data-read-for-me-ignore', 'true');
        elementoHost.style.cssText =
          'all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
        document.documentElement.appendChild(elementoHost);
      }

      this.raizShadow =
        elementoHost.shadowRoot || elementoHost.attachShadow({ mode: 'open' });
      this.raizShadow.innerHTML = '';

      const elementoEstilo = document.createElement('style');
      elementoEstilo.textContent = CSS_SHADOW_UI;
      this.raizShadow.appendChild(elementoEstilo);

      if (!this.botaoFlutuante) {
        this.botaoFlutuante = new BotaoFlutuanteSelecao(this.raizShadow, () => {
          this.iniciarLeituraDaSelecaoAtual();
        });
      }

      if (!this.miniPlayer) {
        this.miniPlayer = new MiniPlayerFlutuante(this.raizShadow, {
          aoAlternarPlayPause: () => this.alternarPausaRetomada(),
          aoPararLeitura: () => this.encerrarLeituraCompleta(),
          aoVoltarSentenca: () => this.irParaSentencaAnterior(),
          aoAvancarSentenca: () => this.irParaProximaSentenca(),
          aoAlterarVelocidade: (novaVelocidade) =>
            this.alterarVelocidadeEmTempoReal(novaVelocidade),
          aoAlterarVoz: (novaVoz) => this.alterarVozDuranteLeitura(novaVoz),
          aoAlterarFiltroIdioma: (novoIdioma) => {
            this.configuracaoAtual.idiomaFiltro = novoIdioma;
            this.repositorioConfiguracao.salvarIdiomaFiltro(novoIdioma);
          },
          aoSalvarPosicao: (posicao) => {
            this.configuracaoAtual.posicaoMiniPlayer = posicao;
            this.repositorioConfiguracao.salvarPosicaoMiniPlayer(posicao);
          },
          aoDefinirModoPrivacidade: (decisao) => this.aplicarDecisaoPrivacidade(decisao),
          aoPrevisualizarVoz: (nomeVoz) => this.reproduzirPreviaDeVoz(nomeVoz),
          aoOcultarPlayerNaPagina: () => {
            this.configuracaoAtual.exibirMiniPlayerFlutuante = false;
            this.repositorioConfiguracao.salvarExibirMiniPlayerFlutuante(false);
          },
          aoAbrirConfiguracoes: () => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              if (typeof chrome.runtime.openOptionsPage === 'function') {
                try {
                  chrome.runtime.openOptionsPage();
                  return;
                } catch {
                  // Fallback para envio de mensagem ao Background
                }
              }
              chrome.runtime
                .sendMessage({
                  tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.ABRIR_CONFIGURACOES
                })
                .catch(() => {});
            }
          }
        });
      }

      this.gerenciadorAtalhos = new GerenciadorAtalhosTeclado({
        verificarLeituraAtiva: () => this.estadoAtual !== 'INATIVO',
        verificarFocoNoMiniPlayer: () =>
          Boolean(this.miniPlayer && this.miniPlayer.possuiFocoInterno()),
        aoAlternarPausa: () => this.alternarPausaRetomada(),
        aoEncerrarLeitura: () => this.encerrarLeituraCompleta()
      });
      this.gerenciadorAtalhos.inicializar();
    }

    /**
     * Escuta mudanças nas configurações salvas pelo Popup para atualizar voz, velocidade,
     * visibilidade do player e cores de highlight em tempo real.
     * @returns {void}
     */
    registrarSincronizacaoReativaDeConfiguracoes() {
      if (
        !this.repositorioConfiguracao ||
        typeof this.repositorioConfiguracao.aoMudarConfiguracao !== 'function'
      ) {
        return;
      }

      const chaves = CONSTANTES_SISTEMA.CHAVES_STORAGE;
      this.repositorioConfiguracao.aoMudarConfiguracao((mudancas) => {
        if (mudancas[chaves.ESTILO_HIGHLIGHT]) {
          const novoEstilo = mudancas[chaves.ESTILO_HIGHLIGHT].newValue;
          this.configuracaoAtual.estiloHighlight = {
            ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
            ...(novoEstilo || {})
          };
          if (
            this.gerenciadorHighlight &&
            typeof this.gerenciadorHighlight.aplicarEstiloPersonalizado === 'function'
          ) {
            this.gerenciadorHighlight.aplicarEstiloPersonalizado(
              this.configuracaoAtual.estiloHighlight
            );
          }
        }

        if (mudancas[chaves.EXIBIR_MINI_PLAYER_FLUTUANTE]) {
          const exibir = Boolean(mudancas[chaves.EXIBIR_MINI_PLAYER_FLUTUANTE].newValue);
          this.configuracaoAtual.exibirMiniPlayerFlutuante = exibir;
          if (this.miniPlayer) {
            if (exibir && this.estadoAtual !== 'INATIVO') {
              this.miniPlayer.exibir(this.configuracaoAtual, false);
              this.sincronizarInterfaceMiniPlayer();
            } else if (!exibir) {
              this.miniPlayer.ocultar();
            }
          }
        }

        if (mudancas[chaves.EXIBIR_BOTAO_FLUTUANTE_SELECAO]) {
          const exibirBotao = Boolean(
            mudancas[chaves.EXIBIR_BOTAO_FLUTUANTE_SELECAO].newValue
          );
          this.configuracaoAtual.exibirBotaoFlutuanteSelecao = exibirBotao;
          if (!exibirBotao && this.botaoFlutuante) {
            this.botaoFlutuante.ocultar();
          }
        }

        if (mudancas[chaves.MODO_LEITURA_CONTINUA]) {
          this.configuracaoAtual.modoLeituraContinua = Boolean(
            mudancas[chaves.MODO_LEITURA_CONTINUA].newValue
          );
        }

        if (mudancas[chaves.VELOCIDADE_REPRODUCAO]) {
          const novaVelocidade = Number(mudancas[chaves.VELOCIDADE_REPRODUCAO].newValue);
          const velocidadeMinima = CONSTANTES_SISTEMA.VELOCIDADE_MINIMA || 0.75;
          const velocidadeMaxima = CONSTANTES_SISTEMA.VELOCIDADE_MAXIMA || 2.0;
          if (
            Number.isFinite(novaVelocidade) &&
            novaVelocidade >= velocidadeMinima &&
            novaVelocidade <= velocidadeMaxima &&
            novaVelocidade !== this.configuracaoAtual.velocidadeReproducao
          ) {
            this.configuracaoAtual.velocidadeReproducao = novaVelocidade;
            this.reprodutorAudio.definirVelocidade(novaVelocidade);
            this.motorFallback.definirVelocidade(novaVelocidade);
            if (
              this.miniPlayer &&
              typeof this.miniPlayer.sincronizarSeletoresComConfiguracao === 'function'
            ) {
              this.miniPlayer.sincronizarSeletoresComConfiguracao(
                this.configuracaoAtual
              );
            }
          }
        }

        if (mudancas[chaves.VOZ_SELECIONADA]) {
          const novaVoz = mudancas[chaves.VOZ_SELECIONADA].newValue;
          if (novaVoz && novaVoz !== this.configuracaoAtual.vozSelecionada) {
            if (
              this.miniPlayer &&
              typeof this.miniPlayer.sincronizarSeletoresComConfiguracao === 'function'
            ) {
              this.miniPlayer.sincronizarSeletoresComConfiguracao({
                ...this.configuracaoAtual,
                vozSelecionada: novaVoz
              });
            }
            this.alterarVozDuranteLeitura(novaVoz);
          }
        }

        if (mudancas[chaves.MODO_PRIVACIDADE_VOZ]) {
          const novoModo = mudancas[chaves.MODO_PRIVACIDADE_VOZ].newValue;
          if (novoModo && novoModo !== this.configuracaoAtual.modoPrivacidadeVoz) {
            this.aplicarDecisaoPrivacidade(novoModo);
          }
        }
      });
    }

    /**
     * Registra listeners de seleção de texto, clique direito (contextmenu) e mensagens do Background/Popup.
     * @returns {void}
     */
    registrarListenersDeSelecaoEMensagens() {
      document.addEventListener(
        'contextmenu',
        (evento) => {
          if (
            evento.target &&
            evento.target.id === CONSTANTES_SISTEMA.ID_HOST_SHADOW_DOM
          ) {
            return;
          }
          const pontoCaret =
            typeof MapeadorSelecaoDom.obterNoEOffsetPorCoordenadas === 'function'
              ? MapeadorSelecaoDom.obterNoEOffsetPorCoordenadas(
                  evento.clientX,
                  evento.clientY
                )
              : null;
          this.ultimoPontoCliqueDireito = {
            clientX: evento.clientX,
            clientY: evento.clientY,
            elementoAlvo: evento.target,
            noInicial: pontoCaret ? pontoCaret.no : null,
            offsetInicial: pontoCaret ? pontoCaret.offset : 0
          };
        },
        true
      );

      document.addEventListener('mouseup', (evento) => {
        if (
          evento.target &&
          evento.target.id === CONSTANTES_SISTEMA.ID_HOST_SHADOW_DOM
        ) {
          return;
        }
        setTimeout(() => this.avaliarExibicaoBotaoFlutuante(), 15);
      });

      document.addEventListener('keyup', () => {
        setTimeout(() => this.avaliarExibicaoBotaoFlutuante(), 15);
      });

      document.addEventListener('mousedown', (evento) => {
        if (
          evento.target &&
          evento.target.id === CONSTANTES_SISTEMA.ID_HOST_SHADOW_DOM
        ) {
          return;
        }
        if (this.botaoFlutuante && this.botaoFlutuante.estaVisivel()) {
          this.botaoFlutuante.ocultar();
        }
      });

      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((mensagem, remetente, enviarResposta) => {
          if (!mensagem || typeof mensagem.tipoMensagem !== 'string') {
            return false;
          }

          const { TIPOS_MENSAGEM } = CONSTANTES_SISTEMA;

          if (
            mensagem.tipoMensagem === TIPOS_MENSAGEM.INICIAR_LEITURA_MENU ||
            mensagem.tipoMensagem === TIPOS_MENSAGEM.INICIAR_LEITURA_A_PARTIR_DAQUI
          ) {
            this.iniciarLeituraAPartirDaqui();
            enviarResposta({ sucesso: true });
            return false;
          }

          if (mensagem.tipoMensagem === TIPOS_MENSAGEM.INICIAR_LEITURA_SELECAO_EXATA) {
            this.iniciarLeituraDaSelecaoAtual({ apenasSelecaoExata: true });
            enviarResposta({ sucesso: true });
            return false;
          }

          if (mensagem.tipoMensagem === TIPOS_MENSAGEM.ALTERNAR_PAUSA_ATALHO) {
            if (this.estadoAtual !== 'INATIVO') {
              this.alternarPausaRetomada();
            } else {
              this.iniciarLeituraAPartirDaqui();
            }
            enviarResposta({ sucesso: true });
            return false;
          }

          if (mensagem.tipoMensagem === TIPOS_MENSAGEM.OBTER_ESTADO_LEITURA_ABA) {
            enviarResposta(this.obterResumoEstadoLeitura());
            return false;
          }

          if (mensagem.tipoMensagem === TIPOS_MENSAGEM.COMANDO_CONTROLE_ABA) {
            this.executarComandoControleExterno(mensagem.payload || {}).then(() => {
              enviarResposta(this.obterResumoEstadoLeitura());
            });
            return true;
          }

          return false;
        });
      }
    }

    /**
     * Retorna o resumo do estado atual da leitura na aba para exibição no Popup de Configurações.
     * @returns {Object}
     */
    obterResumoEstadoLeitura() {
      const totalSentencas = this.mapaSelecaoAtiva
        ? this.mapaSelecaoAtiva.sentencasMapeadas.length
        : 0;
      const sentencaAtiva =
        this.mapaSelecaoAtiva &&
        this.mapaSelecaoAtiva.sentencasMapeadas[this.indiceSentencaAtual]
          ? this.mapaSelecaoAtiva.sentencasMapeadas[this.indiceSentencaAtual].textoSentenca
          : '';

      return {
        estadoAtual: this.estadoAtual,
        indiceSentencaAtual: this.indiceSentencaAtual,
        totalSentencas,
        usandoFallbackLocal: this.usandoFallbackLocal,
        textoSentencaAtual: sentencaAtiva
      };
    }

    /**
     * Executa um comando enviado pelo Popup de Configurações (Play/Pause, Parar, Anterior, Próxima, Ler a partir daqui).
     * @param {Object} payload
     * @returns {Promise<void>}
     */
    async executarComandoControleExterno(payload) {
      const acao = payload.acao;
      if (acao === 'LER_A_PARTIR_DAQUI') {
        await this.iniciarLeituraAPartirDaqui();
      } else if (acao === 'ALTERNAR_PAUSA') {
        if (this.estadoAtual === 'INATIVO') {
          await this.iniciarLeituraAPartirDaqui();
        } else {
          await this.alternarPausaRetomada();
        }
      } else if (acao === 'PARAR') {
        this.encerrarLeituraCompleta();
      } else if (acao === 'ANTERIOR') {
        await this.irParaSentencaAnterior();
      } else if (acao === 'PROXIMA') {
        await this.irParaProximaSentenca();
      }
    }

    /**
     * Verifica se o contexto de execução da extensão continua ativo e válido no navegador.
     * @returns {boolean}
     */
    possuiContextoExtensaoValido() {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          return false;
        }
        if (typeof chrome.runtime.connect !== 'function') {
          return false;
        }
        if (chrome.runtime.id !== undefined) {
          return Boolean(chrome.runtime.id);
        }
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Consulta o catálogo de vozes Microsoft Natural junto ao Service Worker.
     * @returns {void}
     */
    solicitarCatalogoDeVozesAoBackground() {
      if (
        !this.possuiContextoExtensaoValido() ||
        typeof chrome.runtime.sendMessage !== 'function'
      ) {
        return;
      }
      try {
        chrome.runtime
          .sendMessage({
            tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.OBTER_CATALOGO_VOZES
          })
          .then((resposta) => {
            if (resposta && Array.isArray(resposta.vozes) && this.miniPlayer) {
              this.miniPlayer.atualizarCatalogoVozes(resposta.vozes);
            }
          })
          .catch(() => {});
      } catch {
        // Ignora caso contexto da extensão tenha sido invalidado
      }
    }

    /**
     * Verifica se há seleção de texto (mesmo de 1 única letra ou palavra) para exibir o botão rápido.
     * @returns {void}
     */
    avaliarExibicaoBotaoFlutuante() {
      if (!this.botaoFlutuante || typeof window === 'undefined') {
        return;
      }
      if (this.configuracaoAtual.exibirBotaoFlutuanteSelecao === false) {
        this.botaoFlutuante.ocultar();
        return;
      }

      const selecao = window.getSelection();
      if (!selecao || selecao.rangeCount === 0 || selecao.isCollapsed) {
        this.botaoFlutuante.ocultar();
        return;
      }

      const textoSelecionado = selecao.toString().trim();
      if (textoSelecionado.length < 1) {
        this.botaoFlutuante.ocultar();
        return;
      }

      const range = selecao.getRangeAt(0);
      if (MapeadorSelecaoDom.estaEmCampoSensivel(range.commonAncestorContainer)) {
        this.botaoFlutuante.ocultar();
        return;
      }

      const retangulo = range.getBoundingClientRect();
      if (retangulo.width === 0 && retangulo.height === 0) {
        this.botaoFlutuante.ocultar();
        return;
      }

      this.botaoFlutuante.exibirProximoAoRetangulo(retangulo);
    }

    /**
     * Desfaz a seleção azul nativa do navegador para não contaminar o highlight da leitura.
     * @param {Selection | null} selecao
     * @returns {void}
     */
    desfazerSelecaoNativaDaPagina(selecao) {
      try {
        const selecaoAlvo =
          selecao || (typeof window !== 'undefined' ? window.getSelection() : null);
        if (selecaoAlvo && typeof selecaoAlvo.removeAllRanges === 'function') {
          selecaoAlvo.removeAllRanges();
        }
      } catch {
        // Ignora erro caso a seleção pertença a elemento restrito
      }
    }

    /**
     * Inicia a leitura contínua ("Ler a partir daqui") começando na palavra/letra selecionada,
     * no parágrafo clicado com o botão direito ou no início do artigo até o fim do conteúdo.
     * @returns {Promise<void>}
     */
    async iniciarLeituraAPartirDaqui() {
      const selecao = typeof window !== 'undefined' ? window.getSelection() : null;
      const novoMapa = MapeadorSelecaoDom.mapearLeituraAPartirDaqui({
        selecaoNavegador: selecao,
        pontoClique: this.ultimoPontoCliqueDireito
      });
      if (!novoMapa || novoMapa.sentencasMapeadas.length === 0) {
        return;
      }

      this.desfazerSelecaoNativaDaPagina(selecao);
      await this.ativarSessaoDeLeituraComMapa(novoMapa);
    }

    /**
     * Inicia uma sessão de leitura a partir da seleção atual na página.
     * Respeita a preferência `modoLeituraContinua` (por padrão continua lendo até o fim do conteúdo).
     * @param {Object} [opcoes]
     * @param {boolean} [opcoes.apenasSelecaoExata=false]
     * @returns {Promise<void>}
     */
    async iniciarLeituraDaSelecaoAtual(opcoes = {}) {
      const selecao = typeof window !== 'undefined' ? window.getSelection() : null;
      const continuarAteFim =
        !opcoes.apenasSelecaoExata &&
        this.configuracaoAtual.modoLeituraContinua !== false;

      const novoMapaSelecao = MapeadorSelecaoDom.mapearSelecaoAtual(selecao, {
        continuarAteFimDoConteudo: continuarAteFim
      });

      if (!novoMapaSelecao || novoMapaSelecao.sentencasMapeadas.length === 0) {
        return;
      }

      this.desfazerSelecaoNativaDaPagina(selecao);
      await this.ativarSessaoDeLeituraComMapa(novoMapaSelecao);
    }

    /**
     * Configura o estado da sessão para o mapa de leitura fornecido e inicia a síntese.
     * @param {Object} novoMapaSelecao
     * @returns {Promise<void>}
     */
    async ativarSessaoDeLeituraComMapa(novoMapaSelecao) {
      this.encerrarLeituraCompleta();
      if (this.botaoFlutuante) {
        this.botaoFlutuante.ocultar();
      }

      this.configuracaoAtual =
        await this.repositorioConfiguracao.carregarConfiguracaoCompleta();
      if (
        this.gerenciadorHighlight &&
        typeof this.gerenciadorHighlight.aplicarEstiloPersonalizado === 'function'
      ) {
        this.gerenciadorHighlight.aplicarEstiloPersonalizado(
          this.configuracaoAtual.estiloHighlight
        );
      }

      this.mapaSelecaoAtiva = novoMapaSelecao;
      this.idSessaoLeitura = `sessao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.indiceSentencaAtual = 0;

      const modoPrivacidade = this.configuracaoAtual.modoPrivacidadeVoz;
      const exigeConsentimentoInicial =
        modoPrivacidade === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.NAO_DEFINIDO;

      this.usandoFallbackLocal =
        modoPrivacidade === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL;

      console.log('[ReadForMe][Orquestrador] Sessão de leitura ativada:', {
        idSessaoLeitura: this.idSessaoLeitura,
        vozSelecionada: this.configuracaoAtual.vozSelecionada,
        velocidadeReproducao: this.configuracaoAtual.velocidadeReproducao,
        modoPrivacidadeVoz: modoPrivacidade,
        usandoFallbackLocal: this.usandoFallbackLocal,
        totalSentencas: novoMapaSelecao.sentencasMapeadas.length
      });

      // Só exibe o Mini-Player flutuante na página se o usuário tiver ativado essa opção nas configurações
      // (ou caso o modo de privacidade tenha sido explicitamente configurado como NAO_DEFINIDO)
      if (
        this.miniPlayer &&
        (this.configuracaoAtual.exibirMiniPlayerFlutuante || exigeConsentimentoInicial)
      ) {
        this.miniPlayer.exibir(this.configuracaoAtual, exigeConsentimentoInicial);
      }

      if (exigeConsentimentoInicial) {
        this.estadoAtual = 'AGUARDANDO_CONSENTIMENTO';
        this.sincronizarInterfaceMiniPlayer();
        return;
      }

      await this.iniciarFluxoDeSinteseEReproducao();
    }

    /**
     * Reproduz uma amostra rápida (preview) da voz solicitada.
     * @param {string} nomeVoz
     * @returns {Promise<void>}
     */
    async reproduzirPreviaDeVoz(nomeVoz) {
      const vozAlvo = nomeVoz || this.configuracaoAtual.vozSelecionada;
      const idiomaPrefixo = vozAlvo.slice(0, 5);
      const textoPrevia =
        CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ[idiomaPrefixo] ||
        (vozAlvo.startsWith('en-')
          ? CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ['en-US']
          : CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ.PADRAO);

      console.log('[ReadForMe][Orquestrador] Iniciando prévia de voz na página:', {
        vozAlvo,
        usandoFallbackLocal: this.usandoFallbackLocal,
        modoPrivacidadeVoz: this.configuracaoAtual.modoPrivacidadeVoz
      });

      if (this.audioPreviaAtivo) {
        try {
          this.audioPreviaAtivo.pause();
        } catch {}
        this.audioPreviaAtivo = null;
      }

      if (
        this.usandoFallbackLocal ||
        typeof chrome === 'undefined' ||
        !chrome.runtime ||
        typeof chrome.runtime.sendMessage !== 'function'
      ) {
        console.warn(
          '[ReadForMe][Orquestrador] Prévia usando Fallback Local (modo local ativo ou chrome.runtime indisponível).'
        );
        await this.motorFallback.reproduzirSentencaFallback(
          textoPrevia,
          vozAlvo,
          this.configuracaoAtual.velocidadeReproducao
        );
        return;
      }

      try {
        const resposta = await chrome.runtime.sendMessage({
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PREVISUALIZAR_VOZ,
          payload: { nomeVoz: vozAlvo, textoPrevia }
        });

        if (resposta && Array.isArray(resposta.logsDiagnostico)) {
          for (const linhaLog of resposta.logsDiagnostico) {
            if (resposta.sucesso) {
              console.log(linhaLog);
            } else {
              console.error(linhaLog);
            }
          }
        }

        if (resposta && resposta.sucesso && resposta.audioBase64) {
          console.log('[ReadForMe][Orquestrador] Áudio de prévia neural recebido com sucesso:', {
            vozAlvo,
            tamanhoBase64: resposta.audioBase64.length
          });
          await this.reprodutorAudio.reproduzirPacote(
            { audioBase64: resposta.audioBase64, limitesPalavras: [] },
            this.configuracaoAtual.velocidadeReproducao
          );
          return;
        }

        console.error(
          '[ReadForMe ERRO][Orquestrador] Falha na síntese remota da prévia de voz:',
          resposta ? resposta.motivoErro : 'Sem resposta do Service Worker'
        );
      } catch (erroPrevia) {
        console.error(
          '[ReadForMe ERRO][Orquestrador] Exceção ao solicitar/reproduzir prévia de voz neural:',
          erroPrevia
        );
      }

      await this.motorFallback.reproduzirSentencaFallback(
        textoPrevia,
        vozAlvo,
        this.configuracaoAtual.velocidadeReproducao
      );
    }

    /**
     * Processa a decisão de privacidade tomada pelo usuário no painel do Mini-Player.
     * @param {string} decisao - 'REMOTO_AUTORIZADO' | 'SOMENTE_LOCAL' | 'CANCELAR'
     * @returns {Promise<void>}
     */
    async aplicarDecisaoPrivacidade(decisao) {
      if (decisao === 'CANCELAR') {
        this.encerrarLeituraCompleta();
        return;
      }

      const modoEscolhido =
        decisao === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL
          ? CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL
          : CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO;

      this.configuracaoAtual.modoPrivacidadeVoz = modoEscolhido;
      await this.repositorioConfiguracao.salvarModoPrivacidadeVoz(modoEscolhido);

      const estavaAguardandoConsentimento =
        this.estadoAtual === 'AGUARDANDO_CONSENTIMENTO';
      this.usandoFallbackLocal =
        modoEscolhido === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL;

      this.promessasBufferSentencas.clear();
      this.rejeitarTodasRequisicoesPendentes(
        new Error('Alteração de modo de privacidade.')
      );

      if (estavaAguardandoConsentimento || this.estadoAtual !== 'INATIVO') {
        await this.iniciarFluxoDeSinteseEReproducao();
      }
    }

    /**
     * Abre o canal Keep-Alive (quando em modo neural remoto) e inicia a reprodução da sentença atual.
     * @returns {Promise<void>}
     */
    async iniciarFluxoDeSinteseEReproducao() {
      if (!this.usandoFallbackLocal) {
        try {
          this.garantirPortaConectada();
          this.iniciarHeartbeatKeepAlive();
        } catch (erroPorta) {
          console.warn(
            '[ReadForMe][Orquestrador] Contexto de extensão indisponível para Keep-Alive, comutando para fallback local:',
            erroPorta
          );
          this.usandoFallbackLocal = true;
        }
      }
      await this.reproduzirSentencaPorIndice(this.indiceSentencaAtual);
    }

    /**
     * Reproduz a sentença de índice informado e dispara o pre-fetching de N+1 e N+2.
     * @param {number} indiceAlvo
     * @returns {Promise<void>}
     */
    async reproduzirSentencaPorIndice(indiceAlvo) {
      if (!this.mapaSelecaoAtiva) {
        return;
      }
      const listaSentencas = this.mapaSelecaoAtiva.sentencasMapeadas;
      if (indiceAlvo < 0 || indiceAlvo >= listaSentencas.length) {
        this.encerrarLeituraCompleta();
        return;
      }

      const idSessaoCapturado = this.idSessaoLeitura;
      this.indiceSentencaAtual = indiceAlvo;
      const sentencaAtual = listaSentencas[indiceAlvo];

      const rangesSentenca = this.mapaSelecaoAtiva.criarRangesParaIntervaloGlobal(
        sentencaAtual.indiceInicialGlobal,
        sentencaAtual.indiceFinalGlobal
      );
      this.gerenciadorHighlight.destacarSentenca(rangesSentenca);

      this.limparCacheDeSentencasAntigas(indiceAlvo);

      if (this.usandoFallbackLocal) {
        this.estadoAtual = 'REPRODUZINDO';
        this.sincronizarInterfaceMiniPlayer();
        await this.motorFallback.reproduzirSentencaFallback(
          sentencaAtual.textoSentenca,
          this.configuracaoAtual.vozSelecionada,
          this.configuracaoAtual.velocidadeReproducao
        );
        return;
      }

      // Dispara imediatamente a síntese de N e de N+1/N+2 em paralelo
      const promessaSentencaAtual = this.preCarregarSentencaNoBuffer(indiceAlvo);
      for (
        let deslocamento = 1;
        deslocamento <= CONSTANTES_SISTEMA.JANELA_PREFETCH_SENTENCAS;
        deslocamento += 1
      ) {
        const indiceFuturo = indiceAlvo + deslocamento;
        if (indiceFuturo < listaSentencas.length) {
          this.preCarregarSentencaNoBuffer(indiceFuturo);
        }
      }

      this.estadoAtual = 'BUFFERIZANDO';
      this.sincronizarInterfaceMiniPlayer();

      try {
        const pacoteAudio = await promessaSentencaAtual;
        if (
          this.idSessaoLeitura !== idSessaoCapturado ||
          this.indiceSentencaAtual !== indiceAlvo ||
          this.estadoAtual === 'INATIVO'
        ) {
          return;
        }

        if (this.estadoAtual === 'PAUSADO') {
          return;
        }

        this.estadoAtual = 'REPRODUZINDO';
        this.sincronizarInterfaceMiniPlayer();
        await this.reprodutorAudio.reproduzirPacote(
          pacoteAudio,
          this.configuracaoAtual.velocidadeReproducao
        );
      } catch (erroSinteseOuAudio) {
        console.error(
          `[ReadForMe ERRO][Orquestrador] Falha ao sintetizar ou reproduzir sentença #${indiceAlvo} (voz=${this.configuracaoAtual.vozSelecionada}):`,
          erroSinteseOuAudio
        );
        if (
          this.idSessaoLeitura !== idSessaoCapturado ||
          this.indiceSentencaAtual !== indiceAlvo ||
          this.estadoAtual === 'INATIVO'
        ) {
          return;
        }
        await this.acionarFallbackParaSentencaAtual(erroSinteseOuAudio);
      }
    }

    /**
     * Solicita antecipadamente a síntese de uma sentença e armazena sua Promise no buffer.
     * @param {number} indiceSentenca
     * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
     */
    preCarregarSentencaNoBuffer(indiceSentenca) {
      if (this.promessasBufferSentencas.has(indiceSentenca)) {
        return this.promessasBufferSentencas.get(indiceSentenca);
      }

      const sentencaAlvo =
        this.mapaSelecaoAtiva &&
        this.mapaSelecaoAtiva.sentencasMapeadas[indiceSentenca];
      if (!sentencaAlvo) {
        return Promise.reject(new Error('Índice de sentença inexistente.'));
      }

      const promessaSintese = this.requisitarSinteseViaPorta({
        idSessaoLeitura: this.idSessaoLeitura,
        indiceSentenca,
        textoSentenca: sentencaAlvo.textoSentenca,
        nomeVoz: this.configuracaoAtual.vozSelecionada
      });

      promessaSintese.catch(() => {});

      this.promessasBufferSentencas.set(indiceSentenca, promessaSintese);
      return promessaSintese;
    }

    /**
     * Envia requisição SINTETIZAR_SENTENCA pela porta persistente e rastreia para reidratação.
     * @param {Object} dadosPedido
     * @returns {Promise<{audioBase64: string, limitesPalavras: Array}>}
     */
    requisitarSinteseViaPorta(dadosPedido) {
      this.contadorRequisicoes += 1;
      const idRequisicao = `req-${this.contadorRequisicoes}-${Date.now()}`;
      const mensagemOriginal = {
        tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.SINTETIZAR_SENTENCA,
        payload: {
          ...dadosPedido,
          idRequisicao
        }
      };

      return new Promise((resolver, rejeitar) => {
        this.requisicoesPendentesPorta.set(idRequisicao, {
          idRequisicao,
          idSessaoLeitura: dadosPedido.idSessaoLeitura,
          indiceSentenca: dadosPedido.indiceSentenca,
          mensagemOriginal,
          tentativasReenvio: 0,
          resolver,
          rejeitar
        });

        try {
          const porta = this.garantirPortaConectada();
          porta.postMessage(mensagemOriginal);
        } catch (erroPorta) {
          console.error(
            '[ReadForMe ERRO][Orquestrador] Falha ao enviar mensagem na porta Keep-Alive:',
            erroPorta
          );
          if (this.possuiContextoExtensaoValido()) {
            this.agendarReidratacaoDaPorta();
          } else {
            this.iniciarFallbackParaRequisicoesPendentes();
          }
        }
      });
    }

    /**
     * Garante que a porta chrome.runtime.Port esteja conectada ao Service Worker.
     * @returns {chrome.runtime.Port}
     */
    garantirPortaConectada() {
      if (this.portaBackground) {
        return this.portaBackground;
      }

      if (!this.possuiContextoExtensaoValido()) {
        this.iniciarFallbackParaRequisicoesPendentes();
        throw new Error('Contexto da extensão invalidado.');
      }

      try {
        const novaPorta = chrome.runtime.connect({
          name: CONSTANTES_SISTEMA.NOME_PORTA_KEEP_ALIVE
        });

        novaPorta.onMessage.addListener((mensagemRecebida) => {
          this.processarMensagemDaPorta(mensagemRecebida);
        });

        novaPorta.onDisconnect.addListener(() => {
          this.portaBackground = null;
          if (this.estadoAtual === 'INATIVO') {
            this.rejeitarTodasRequisicoesPendentes(new Error('Sessão encerrada.'));
            return;
          }
          if (!this.possuiContextoExtensaoValido()) {
            this.iniciarFallbackParaRequisicoesPendentes();
            return;
          }
          console.warn('[ReadForMe][Orquestrador] Porta Keep-Alive desconectada; reconectando...');
          this.agendarReidratacaoDaPorta();
        });

        this.portaBackground = novaPorta;
        return novaPorta;
      } catch (erroConexao) {
        this.portaBackground = null;
        this.iniciarFallbackParaRequisicoesPendentes();
        throw erroConexao;
      }
    }

    /**
     * Agenda a reconexão da porta e o reenvio das requisições em voo com atrasos de [250, 500, 1000] ms.
     * @returns {void}
     */
    agendarReidratacaoDaPorta() {
      if (!this.possuiContextoExtensaoValido()) {
        this.iniciarFallbackParaRequisicoesPendentes();
        return;
      }

      const atrasosReconexaoMs = CONSTANTES_SISTEMA.ATRASOS_RECONEXAO_PORTA_MS;
      if (this.tentativasReconexao >= atrasosReconexaoMs.length) {
        this.iniciarFallbackParaRequisicoesPendentes();
        return;
      }

      const atrasoMs = atrasosReconexaoMs[this.tentativasReconexao];
      this.tentativasReconexao += 1;
      clearTimeout(this.idTimeoutReconexao);
      this.idTimeoutReconexao = setTimeout(() => {
        if (this.estadoAtual === 'INATIVO' || !this.possuiContextoExtensaoValido()) {
          if (!this.possuiContextoExtensaoValido()) {
            this.iniciarFallbackParaRequisicoesPendentes();
          }
          return;
        }
        try {
          const portaReconectada = this.garantirPortaConectada();
          for (const [idRequisicao, registroPendente] of this.requisicoesPendentesPorta.entries()) {
            if (registroPendente.idSessaoLeitura !== this.idSessaoLeitura) {
              this.requisicoesPendentesPorta.delete(idRequisicao);
              continue;
            }
            portaReconectada.postMessage(registroPendente.mensagemOriginal);
          }
        } catch {
          this.agendarReidratacaoDaPorta();
        }
      }, atrasoMs);
    }

    /**
     * Processa as respostas enviadas pelo Service Worker através da porta persistente.
     * @param {Object} mensagemRecebida
     * @returns {void}
     */
    processarMensagemDaPorta(mensagemRecebida) {
      if (!mensagemRecebida || typeof mensagemRecebida.tipoMensagem !== 'string') {
        return;
      }

      const { tipoMensagem, payload = {} } = mensagemRecebida;
      const tiposValidosConfirmacao = new Set([
        CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_CONFIRMADO,
        CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO,
        CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE_USAR_FALLBACK,
        CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE
      ]);

      if (!tiposValidosConfirmacao.has(tipoMensagem)) {
        return;
      }

      if (payload.idSessaoLeitura !== this.idSessaoLeitura) {
        if (payload.idRequisicao) {
          this.requisicoesPendentesPorta.delete(payload.idRequisicao);
        }
        return;
      }

      this.tentativasReconexao = 0;
      clearTimeout(this.idTimeoutReconexao);

      if (tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_CONFIRMADO) {
        return;
      }

      if (Array.isArray(payload.logsDiagnostico)) {
        const ehFalha =
          tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE_USAR_FALLBACK ||
          tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE;
        for (const linhaLog of payload.logsDiagnostico) {
          if (ehFalha) {
            console.error(linhaLog);
          } else {
            console.log(linhaLog);
          }
        }
      }

      const registroPendente = this.localizarERemoverRequisicaoPendente(payload);
      if (!registroPendente) {
        return;
      }

      if (tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO) {
        console.log(
          `[ReadForMe][Orquestrador] PACOTE_AUDIO_PRONTO recebido para sentença #${payload.indiceSentenca} (voz=${payload.nomeVoz || this.configuracaoAtual.vozSelecionada}).`
        );
        registroPendente.resolver({
          audioBase64: payload.audioBase64,
          limitesPalavras: payload.limitesPalavras || []
        });
        return;
      }

      if (
        tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE_USAR_FALLBACK ||
        tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE
      ) {
        console.error(
          `[ReadForMe ERRO][Orquestrador] Service Worker reportou falha de síntese na sentença #${payload.indiceSentenca}:`,
          payload.motivoErro
        );
        registroPendente.rejeitar(
          new Error(payload.motivoErro || 'Falha na síntese remota.')
        );
      }
    }

    /**
     * Localiza e remove uma requisição pendente por idRequisicao ou por (idSessaoLeitura + indiceSentenca).
     * @param {Object} payload
     * @returns {Object | null}
     */
    localizarERemoverRequisicaoPendente(payload) {
      if (
        payload.idRequisicao &&
        this.requisicoesPendentesPorta.has(payload.idRequisicao)
      ) {
        const encontrado = this.requisicoesPendentesPorta.get(payload.idRequisicao);
        this.requisicoesPendentesPorta.delete(payload.idRequisicao);
        return encontrado;
      }

      for (const [chave, item] of this.requisicoesPendentesPorta.entries()) {
        if (
          item.idSessaoLeitura === payload.idSessaoLeitura &&
          item.indiceSentenca === payload.indiceSentenca
        ) {
          this.requisicoesPendentesPorta.delete(chave);
          return item;
        }
      }
      return null;
    }

    /**
     * Comuta toda a sessão para o fallback local quando as 3 tentativas de reconexão da porta se esgotam.
     * @returns {void}
     */
    iniciarFallbackParaRequisicoesPendentes() {
      console.error(
        '[ReadForMe ERRO][Orquestrador] Limite de reconexões da porta excedido; comutando para fallback local.'
      );
      this.usandoFallbackLocal = true;
      this.rejeitarTodasRequisicoesPendentes(
        new Error('Limite de reconexões da porta excedido; comutando para fallback local.')
      );
    }

    /**
     * Aciona o motor de contingência (window.speechSynthesis) para a sentença atual.
     * @param {Error} [erroCausa]
     * @returns {Promise<void>}
     */
    async acionarFallbackParaSentencaAtual(erroCausa) {
      if (this.estadoAtual === 'INATIVO' || !this.mapaSelecaoAtiva) {
        return;
      }
      console.error(
        `[ReadForMe ERRO][Orquestrador] Acionando Fallback Local (Web Speech API) para a sentença #${this.indiceSentencaAtual}. Causa:`,
        erroCausa ? erroCausa.message || erroCausa : 'Erro de síntese/reprodução'
      );
      this.usandoFallbackLocal = true;
      const sentencaAtual =
        this.mapaSelecaoAtiva.sentencasMapeadas[this.indiceSentencaAtual];
      if (!sentencaAtual) {
        return;
      }
      this.estadoAtual = 'REPRODUZINDO';
      this.sincronizarInterfaceMiniPlayer();
      await this.motorFallback.reproduzirSentencaFallback(
        sentencaAtual.textoSentenca,
        this.configuracaoAtual.vozSelecionada,
        this.configuracaoAtual.velocidadeReproducao
      );
    }

    /**
     * Destaca visualmente a palavra corrente dentro da sentença ativa usando CSS.highlights.
     * @param {{indiceInicialCaractere: number, comprimentoPalavra: number}} dadosPalavra
     * @returns {void}
     */
    destacarPalavraDaSentencaAtiva({ indiceInicialCaractere, comprimentoPalavra }) {
      if (
        this.estadoAtual !== 'REPRODUZINDO' ||
        !this.mapaSelecaoAtiva ||
        comprimentoPalavra <= 0
      ) {
        return;
      }
      const sentencaAtual =
        this.mapaSelecaoAtiva.sentencasMapeadas[this.indiceSentencaAtual];
      if (!sentencaAtual) {
        return;
      }

      const inicioGlobalPalavra =
        sentencaAtual.indiceInicialGlobal + indiceInicialCaractere;
      const fimGlobalPalavra = Math.min(
        sentencaAtual.indiceFinalGlobal,
        inicioGlobalPalavra + comprimentoPalavra
      );

      const rangesPalavra = this.mapaSelecaoAtiva.criarRangesParaIntervaloGlobal(
        inicioGlobalPalavra,
        fimGlobalPalavra
      );
      this.gerenciadorHighlight.destacarPalavra(rangesPalavra);
    }

    /**
     * Chamado quando a sentença atual termina de tocar para avançar imediatamente à próxima.
     * Se atingir o fim das sentenças atuais no modo contínuo, verifica se o DOM recebeu novos parágrafos.
     * @returns {void}
     */
    avancarAutomaticamenteParaProximaSentenca() {
      if (this.estadoAtual !== 'REPRODUZINDO' || !this.mapaSelecaoAtiva) {
        return;
      }
      const proximoIndice = this.indiceSentencaAtual + 1;
      if (proximoIndice >= this.mapaSelecaoAtiva.sentencasMapeadas.length) {
        if (
          typeof this.mapaSelecaoAtiva.tentarExpandirConteudoDinamico === 'function' &&
          this.mapaSelecaoAtiva.tentarExpandirConteudoDinamico() &&
          proximoIndice < this.mapaSelecaoAtiva.sentencasMapeadas.length
        ) {
          this.reproduzirSentencaPorIndice(proximoIndice);
          return;
        }
        this.encerrarLeituraCompleta();
        return;
      }
      this.reproduzirSentencaPorIndice(proximoIndice);
    }

    /**
     * Alterna entre Pausado e Reproduzindo.
     * @returns {Promise<void>}
     */
    async alternarPausaRetomada() {
      if (this.estadoAtual === 'REPRODUZINDO') {
        this.estadoAtual = 'PAUSADO';
        if (this.usandoFallbackLocal) {
          this.motorFallback.pausar();
        } else {
          this.reprodutorAudio.pausar();
        }
        this.sincronizarInterfaceMiniPlayer();
        return;
      }

      if (this.estadoAtual === 'PAUSADO') {
        this.estadoAtual = 'REPRODUZINDO';
        this.sincronizarInterfaceMiniPlayer();
        if (this.usandoFallbackLocal) {
          this.motorFallback.retomar();
        } else {
          await this.reprodutorAudio.retomar();
        }
      }
    }

    /**
     * Pula para a sentença anterior.
     * @returns {Promise<void>}
     */
    async irParaSentencaAnterior() {
      if (!this.mapaSelecaoAtiva || this.indiceSentencaAtual <= 0) {
        return;
      }
      this.reprodutorAudio.pararELimpar();
      this.motorFallback.pararELimpar();
      await this.reproduzirSentencaPorIndice(this.indiceSentencaAtual - 1);
    }

    /**
     * Pula para a próxima sentença.
     * @returns {Promise<void>}
     */
    async irParaProximaSentenca() {
      if (!this.mapaSelecaoAtiva) {
        return;
      }
      if (
        this.indiceSentencaAtual >=
        this.mapaSelecaoAtiva.sentencasMapeadas.length - 1
      ) {
        if (
          typeof this.mapaSelecaoAtiva.tentarExpandirConteudoDinamico !== 'function' ||
          !this.mapaSelecaoAtiva.tentarExpandirConteudoDinamico()
        ) {
          return;
        }
      }
      this.reprodutorAudio.pararELimpar();
      this.motorFallback.pararELimpar();
      await this.reproduzirSentencaPorIndice(this.indiceSentencaAtual + 1);
    }

    /**
     * Altera a velocidade em tempo real (0.75x a 2.0x) e persiste a preferência.
     * @param {number} novaVelocidade
     * @returns {Promise<void>}
     */
    async alterarVelocidadeEmTempoReal(novaVelocidade) {
      this.configuracaoAtual.velocidadeReproducao = novaVelocidade;
      this.reprodutorAudio.definirVelocidade(novaVelocidade);
      this.motorFallback.definirVelocidade(novaVelocidade);
      await this.repositorioConfiguracao.salvarVelocidadeReproducao(novaVelocidade);
    }

    /**
     * Altera a voz selecionada, limpa os buffers futuros da voz antiga e reinicia a frase atual.
     * @param {string} novaVoz
     * @returns {Promise<void>}
     */
    async alterarVozDuranteLeitura(novaVoz) {
      this.configuracaoAtual.vozSelecionada = novaVoz;
      this.usandoFallbackLocal =
        this.configuracaoAtual.modoPrivacidadeVoz ===
        CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL;

      console.log('[ReadForMe][Orquestrador] Alterando voz selecionada:', {
        novaVoz,
        estadoAtual: this.estadoAtual,
        modoPrivacidadeVoz: this.configuracaoAtual.modoPrivacidadeVoz,
        usandoFallbackLocal: this.usandoFallbackLocal
      });

      if (this.estadoAtual === 'INATIVO') {
        await this.repositorioConfiguracao.salvarVozSelecionada(novaVoz);
        return;
      }

      this.notificarCancelamentoAoBackground();
      this.idSessaoLeitura = `sessao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      this.reprodutorAudio.pararELimpar();
      this.motorFallback.pararELimpar();
      this.promessasBufferSentencas.clear();
      this.rejeitarTodasRequisicoesPendentes(new Error('Troca de voz pelo usuário.'));

      await this.repositorioConfiguracao.salvarVozSelecionada(novaVoz);
      await this.iniciarFluxoDeSinteseEReproducao();
    }

    /**
     * Encerra completamente a leitura, limpa todos os highlights, buffers e timers.
     * @returns {void}
     */
    encerrarLeituraCompleta() {
      this.notificarCancelamentoAoBackground();
      this.estadoAtual = 'INATIVO';
      this.idSessaoLeitura = null;
      this.mapaSelecaoAtiva = null;
      this.indiceSentencaAtual = 0;
      this.tentativasReconexao = 0;

      clearTimeout(this.idTimeoutReconexao);
      this.idTimeoutReconexao = null;
      this.pararHeartbeatKeepAlive();

      this.promessasBufferSentencas.clear();
      this.rejeitarTodasRequisicoesPendentes(new Error('Leitura encerrada pelo usuário.'));

      this.reprodutorAudio.pararELimpar();
      this.motorFallback.pararELimpar();
      this.gerenciadorHighlight.limparTodosOsDestaques();

      if (this.miniPlayer) {
        this.miniPlayer.ocultar();
      }
    }

    /**
     * Remove do buffer de memória sentenças anteriores a (indiceAtual - 1).
     * @param {number} indiceAtual
     * @returns {void}
     */
    limparCacheDeSentencasAntigas(indiceAtual) {
      for (const chaveIndice of this.promessasBufferSentencas.keys()) {
        if (chaveIndice < indiceAtual - 1) {
          this.promessasBufferSentencas.delete(chaveIndice);
        }
      }
    }

    /**
     * Rejeita todas as Promises de requisições de porta pendentes.
     * @param {Error} erroMotivo
     * @returns {void}
     */
    rejeitarTodasRequisicoesPendentes(erroMotivo) {
      const pendentes = Array.from(this.requisicoesPendentesPorta.values());
      this.requisicoesPendentesPorta.clear();
      for (const item of pendentes) {
        try {
          item.rejeitar(erroMotivo);
        } catch {
          // Ignora rejeição já tratada
        }
      }
    }

    /**
     * Envia comando CANCELAR_SINTESE_ABA ao Service Worker para abortar conexões WebSocket ativas.
     * @returns {void}
     */
    notificarCancelamentoAoBackground() {
      if (
        !this.portaBackground ||
        !this.idSessaoLeitura ||
        !this.possuiContextoExtensaoValido()
      ) {
        return;
      }
      try {
        this.portaBackground.postMessage({
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.CANCELAR_SINTESE_ABA,
          payload: { idSessaoLeitura: this.idSessaoLeitura }
        });
      } catch {
        // Porta já fechada ou contexto invalidado
      }
    }

    /**
     * Inicia o envio periódico de HEARTBEAT_KEEP_ALIVE a cada 20 segundos.
     * @returns {void}
     */
    iniciarHeartbeatKeepAlive() {
      this.pararHeartbeatKeepAlive();
      this.idIntervaloHeartbeat = setInterval(() => {
        if (
          this.estadoAtual === 'INATIVO' ||
          !this.portaBackground ||
          !this.possuiContextoExtensaoValido()
        ) {
          if (!this.possuiContextoExtensaoValido()) {
            this.pararHeartbeatKeepAlive();
          }
          return;
        }
        try {
          this.portaBackground.postMessage({
            tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_KEEP_ALIVE,
            payload: { idSessaoLeitura: this.idSessaoLeitura }
          });
        } catch {
          // Ignora falha; onDisconnect tratará a reconexão
        }
      }, CONSTANTES_SISTEMA.INTERVALO_HEARTBEAT_MS);
    }

    /**
     * Encerra o timer de heartbeat.
     * @returns {void}
     */
    pararHeartbeatKeepAlive() {
      if (this.idIntervaloHeartbeat !== null) {
        clearInterval(this.idIntervaloHeartbeat);
        this.idIntervaloHeartbeat = null;
      }
    }

    /**
     * Sincroniza os indicadores do Mini-Player com o estado atual do orquestrador.
     * @returns {void}
     */
    sincronizarInterfaceMiniPlayer() {
      if (!this.miniPlayer || !this.mapaSelecaoAtiva) {
        return;
      }
      this.miniPlayer.atualizarEstadoVisual({
        estadoAtual: this.estadoAtual,
        indiceSentencaAtual: this.indiceSentencaAtual,
        totalSentencas: this.mapaSelecaoAtiva.sentencasMapeadas.length,
        usandoFallbackLocal: this.usandoFallbackLocal
      });
    }
  }

  escopoGlobal.ReadForMe.OrquestradorLeituraContent = OrquestradorLeituraContent;

  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.id &&
    !escopoGlobal.__READ_FOR_ME_DESATIVAR_AUTO_INIT__
  ) {
    const instanciaOrquestrador = new OrquestradorLeituraContent();
    instanciaOrquestrador.inicializarNaPagina();
    escopoGlobal.ReadForMe.instanciaAtiva = instanciaOrquestrador;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrquestradorLeituraContent;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
