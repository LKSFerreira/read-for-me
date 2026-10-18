/**
 * Máquina de estados central do Content Script (OrquestradorLeituraContent).
 * Coordena:
 * - Mapeamento de seleção DOM e Sentence Chunking;
 * - Pipeline de Pre-fetching concorrente em janela deslizante (N, N+1, N+2);
 * - Canal persistente Keep-Alive com o Service Worker e reidratação com backoff [250, 500, 1000] ms;
 * - Sincronização de highlight (CSS Custom Highlight API) e reprodução de áudio com fallback local.
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
    GerenciadorAtalhosTeclado
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

      this.configuracaoAtual = {
        vozSelecionada: CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA,
        velocidadeReproducao: CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO,
        idiomaFiltro: CONSTANTES_SISTEMA.VALORES_PADRAO.IDIOMA_FILTRO,
        posicaoMiniPlayer: null,
        modoPrivacidadeVoz: CONSTANTES_SISTEMA.VALORES_PADRAO.MODO_PRIVACIDADE_VOZ
      };

      this.repositorioConfiguracao =
        dependenciasInjetadas.repositorioConfiguracao ||
        new RepositorioConfiguracao();
      this.gerenciadorHighlight =
        dependenciasInjetadas.gerenciadorHighlight || new GerenciadorHighlight();

      this.reprodutorAudio =
        dependenciasInjetadas.reprodutorAudio ||
        new ReprodutorAudioBuffer({
          aoAtivarPalavra: (dadosPalavra) => this.destacarPalavraDaSentencaAtiva(dadosPalavra),
          aoConcluirSentenca: () => this.avancarAutomaticamenteParaProximaSentenca(),
          aoOcorrerErroAudio: () => this.acionarFallbackParaSentencaAtual()
        });

      this.motorFallback =
        dependenciasInjetadas.motorFallback ||
        new MotorFallbackWebSpeech({
          aoAtivarPalavra: (dadosPalavra) => this.destacarPalavraDaSentencaAtiva(dadosPalavra),
          aoConcluirSentenca: () => this.avancarAutomaticamenteParaProximaSentenca(),
          aoOcorrerErroAudio: () => this.avancarAutomaticamenteParaProximaSentenca()
        });

      this.raizShadow = null;
      this.botaoFlutuante = dependenciasInjetadas.botaoFlutuante || null;
      this.miniPlayer = dependenciasInjetadas.miniPlayer || null;
      this.gerenciadorAtalhos = null;
    }

    /**
     * Inicializa o host Shadow DOM, componentes de UI, atalhos e listeners de eventos da página.
     * @returns {Promise<void>}
     */
    async inicializarNaPagina() {
      if (typeof document === 'undefined' || !document.documentElement) {
        return;
      }

      this.configuracaoAtual =
        await this.repositorioConfiguracao.carregarConfiguracaoCompleta();
      this.criarHostShadowDom();
      this.registrarListenersDeSelecaoEMensagens();
      this.solicitarCatalogoDeVozesAoBackground();
    }

    /**
     * Cria o elemento host isolado com Shadow DOM (mode: 'open') e injeta o CSS encapsulado.
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
          aoAlterarVelocidade: (novaVelocidade) => this.alterarVelocidadeEmTempoReal(novaVelocidade),
          aoAlterarVoz: (novaVoz) => this.alterarVozDuranteLeitura(novaVoz),
          aoAlterarFiltroIdioma: (novoIdioma) => {
            this.configuracaoAtual.idiomaFiltro = novoIdioma;
            this.repositorioConfiguracao.salvarIdiomaFiltro(novoIdioma);
          },
          aoSalvarPosicao: (posicao) => {
            this.configuracaoAtual.posicaoMiniPlayer = posicao;
            this.repositorioConfiguracao.salvarPosicaoMiniPlayer(posicao);
          },
          aoDefinirModoPrivacidade: (decisao) => this.aplicarDecisaoPrivacidade(decisao)
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
     * Registra listeners de seleção de texto na página e mensagens do Service Worker.
     * @returns {void}
     */
    registrarListenersDeSelecaoEMensagens() {
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
        chrome.runtime.onMessage.addListener((mensagem) => {
          if (!mensagem || typeof mensagem.tipoMensagem !== 'string') {
            return;
          }
          if (
            mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.INICIAR_LEITURA_MENU
          ) {
            this.iniciarLeituraDaSelecaoAtual();
          } else if (
            mensagem.tipoMensagem ===
            CONSTANTES_SISTEMA.TIPOS_MENSAGEM.ALTERNAR_PAUSA_ATALHO
          ) {
            if (this.estadoAtual !== 'INATIVO') {
              this.alternarPausaRetomada();
            } else {
              this.iniciarLeituraDaSelecaoAtual();
            }
          }
        });
      }
    }

    /**
     * Consulta o catálogo de vozes Microsoft Natural junto ao Service Worker.
     * @returns {void}
     */
    solicitarCatalogoDeVozesAoBackground() {
      if (
        typeof chrome === 'undefined' ||
        !chrome.runtime ||
        typeof chrome.runtime.sendMessage !== 'function'
      ) {
        return;
      }
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
    }

    /**
     * Verifica se há seleção de texto válida para exibir o botão flutuante discreto.
     * Jamais envia qualquer texto para a rede nesta etapa.
     * @returns {void}
     */
    avaliarExibicaoBotaoFlutuante() {
      if (!this.botaoFlutuante || typeof window === 'undefined') {
        return;
      }
      const selecao = window.getSelection();
      if (!selecao || selecao.rangeCount === 0 || selecao.isCollapsed) {
        this.botaoFlutuante.ocultar();
        return;
      }

      const textoSelecionado = selecao.toString().trim();
      if (textoSelecionado.length < 2) {
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
     * Inicia uma nova sessão de leitura a partir da seleção de texto atual na página.
     * @returns {Promise<void>}
     */
    async iniciarLeituraDaSelecaoAtual() {
      const selecao = typeof window !== 'undefined' ? window.getSelection() : null;
      const novoMapaSelecao = MapeadorSelecaoDom.mapearSelecaoAtual(selecao);
      if (!novoMapaSelecao || novoMapaSelecao.sentencasMapeadas.length === 0) {
        return;
      }

      this.encerrarLeituraCompleta();
      if (this.botaoFlutuante) {
        this.botaoFlutuante.ocultar();
      }

      this.configuracaoAtual =
        await this.repositorioConfiguracao.carregarConfiguracaoCompleta();
      this.mapaSelecaoAtiva = novoMapaSelecao;
      this.idSessaoLeitura = `sessao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      this.indiceSentencaAtual = 0;

      const modoPrivacidade = this.configuracaoAtual.modoPrivacidadeVoz;
      const exigeConsentimentoInicial =
        modoPrivacidade === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.NAO_DEFINIDO;

      this.usandoFallbackLocal =
        modoPrivacidade === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL;

      if (this.miniPlayer) {
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
        this.garantirPortaConectada();
        this.iniciarHeartbeatKeepAlive();
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

      // Dispara imediatamente a síntese de N e de N+1 em paralelo já na partida
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
      } catch {
        if (
          this.idSessaoLeitura !== idSessaoCapturado ||
          this.indiceSentencaAtual !== indiceAlvo ||
          this.estadoAtual === 'INATIVO'
        ) {
          return;
        }
        await this.acionarFallbackParaSentencaAtual();
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

      // Evita UnhandledPromiseRejection quando o pre-fetch futuro falha antes de ser consumido
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
        } catch {
          this.agendarReidratacaoDaPorta();
        }
      });
    }

    /**
     * Garante que a porta chrome.runtime.Port esteja conectada ao Service Worker.
     * Observação Crítica: Abrir a porta NÃO zera tentativasReconexao. O contador só é zerado
     * quando chega confirmação válida em processarMensagemDaPorta.
     * @returns {chrome.runtime.Port}
     */
    garantirPortaConectada() {
      if (this.portaBackground) {
        return this.portaBackground;
      }

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
        this.agendarReidratacaoDaPorta();
      });

      this.portaBackground = novaPorta;
      return novaPorta;
    }

    /**
     * Agenda a reconexão da porta e o reenvio das requisições em voo com atrasos de [250, 500, 1000] ms.
     * @returns {void}
     */
    agendarReidratacaoDaPorta() {
      const atrasosReconexaoMs = CONSTANTES_SISTEMA.ATRASOS_RECONEXAO_PORTA_MS;
      if (this.tentativasReconexao >= atrasosReconexaoMs.length) {
        this.iniciarFallbackParaRequisicoesPendentes();
        return;
      }

      const atrasoMs = atrasosReconexaoMs[this.tentativasReconexao];
      this.tentativasReconexao += 1;
      clearTimeout(this.idTimeoutReconexao);
      this.idTimeoutReconexao = setTimeout(() => {
        if (this.estadoAtual === 'INATIVO') {
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
     * Redefine tentativasReconexao para 0 apenas ao receber confirmação válida da sessão atual.
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

      // Descarta respostas pertencentes a sessões antigas já encerradas ou substituídas
      if (payload.idSessaoLeitura !== this.idSessaoLeitura) {
        if (payload.idRequisicao) {
          this.requisicoesPendentesPorta.delete(payload.idRequisicao);
        }
        return;
      }

      // A porta confirmou atividade válida na sessão atual: zera o contador de reconexão
      this.tentativasReconexao = 0;
      clearTimeout(this.idTimeoutReconexao);

      if (tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_CONFIRMADO) {
        return;
      }

      const registroPendente = this.localizarERemoverRequisicaoPendente(payload);
      if (!registroPendente) {
        return;
      }

      if (tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO) {
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
      this.usandoFallbackLocal = true;
      this.rejeitarTodasRequisicoesPendentes(
        new Error('Limite de reconexões da porta excedido; comutando para fallback local.')
      );
    }

    /**
     * Aciona o motor de contingência (window.speechSynthesis) para a sentença atual.
     * @returns {Promise<void>}
     */
    async acionarFallbackParaSentencaAtual() {
      if (this.estadoAtual === 'INATIVO' || !this.mapaSelecaoAtiva) {
        return;
      }
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
     * @returns {void}
     */
    avancarAutomaticamenteParaProximaSentenca() {
      if (this.estadoAtual !== 'REPRODUZINDO' || !this.mapaSelecaoAtiva) {
        return;
      }
      const proximoIndice = this.indiceSentencaAtual + 1;
      if (proximoIndice >= this.mapaSelecaoAtiva.sentencasMapeadas.length) {
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
      if (
        !this.mapaSelecaoAtiva ||
        this.indiceSentencaAtual >= this.mapaSelecaoAtiva.sentencasMapeadas.length - 1
      ) {
        return;
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

      if (this.estadoAtual === 'INATIVO') {
        await this.repositorioConfiguracao.salvarVozSelecionada(novaVoz);
        return;
      }

      // Rotaciona o idSessaoLeitura sincronamente antes de cancelar a sessão anterior
      this.notificarCancelamentoAoBackground();
      this.idSessaoLeitura = `sessao-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      this.reprodutorAudio.pararELimpar();
      this.motorFallback.pararELimpar();
      this.promessasBufferSentencas.clear();
      this.rejeitarTodasRequisicoesPendentes(new Error('Troca de voz pelo usuário.'));

      await this.repositorioConfiguracao.salvarVozSelecionada(novaVoz);
      await this.reproduzirSentencaPorIndice(this.indiceSentencaAtual);
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
      if (!this.portaBackground || !this.idSessaoLeitura) {
        return;
      }
      try {
        this.portaBackground.postMessage({
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.CANCELAR_SINTESE_ABA,
          payload: { idSessaoLeitura: this.idSessaoLeitura }
        });
      } catch {
        // Porta já fechada
      }
    }

    /**
     * Inicia o envio periódico de HEARTBEAT_KEEP_ALIVE a cada 20 segundos.
     * @returns {void}
     */
    iniciarHeartbeatKeepAlive() {
      this.pararHeartbeatKeepAlive();
      this.idIntervaloHeartbeat = setInterval(() => {
        if (this.estadoAtual === 'INATIVO' || !this.portaBackground) {
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

  // Inicializa automaticamente apenas quando injetado em página real do navegador (não durante import em testes unitários)
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
