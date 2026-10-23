/**
 * Mini-Player Flutuante Opcional (In-Page) encapsulado dentro da ShadowRoot.
 * Suporta arraste fluido em qualquer área livre do container via Pointer Events no window,
 * controles Play/Pause/Stop/Anterior/Próxima, seletor de velocidade, filtro de idioma,
 * seletor de vozes com botão de prévia (preview) e opção de ocultar sem interromper a leitura.
 */
(function inicializarMiniPlayerFlutuante(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};
  const { CONSTANTES_SISTEMA } = escopoGlobal.ReadForMe;

  const ICONE_PLAY_SVG = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3"></polygon>
    </svg>
  `;

  const ICONE_PAUSE_SVG = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1"></rect>
      <rect x="14" y="4" width="4" height="16" rx="1"></rect>
    </svg>
  `;

  class MiniPlayerFlutuante {
    /**
     * @param {ShadowRoot} raizShadow
     * @param {Object} callbacks
     * @param {function(): void} callbacks.aoAlternarPlayPause
     * @param {function(): void} callbacks.aoPararLeitura
     * @param {function(): void} callbacks.aoVoltarSentenca
     * @param {function(): void} callbacks.aoAvancarSentenca
     * @param {function(number): void} callbacks.aoAlterarVelocidade
     * @param {function(string): void} [callbacks.aoAlterarVoz]
     * @param {function(string): void} [callbacks.aoAlterarFiltroIdioma]
     * @param {function({x: number, y: number}): void} callbacks.aoSalvarPosicao
     * @param {function(string): void} [callbacks.aoDefinirModoPrivacidade]
     * @param {function(string): Promise<void>} [callbacks.aoPrevisualizarVoz]
     * @param {function(): void} [callbacks.aoOcultarPlayerNaPagina]
     * @param {function(): void} [callbacks.aoAbrirConfiguracoes]
     */
    constructor(raizShadow, callbacks) {
      this.raizShadow = raizShadow;
      this.callbacks = callbacks || {};
      this.catalogoVozes = [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO];
      this.idiomaFiltroAtual = CONSTANTES_SISTEMA.VALORES_PADRAO.IDIOMA_FILTRO;
      this.vozSelecionadaAtual = CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA;
      this.velocidadeAtual = CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO;

      this.elementoContainer = null;
      this.elementoBadgeStatus = null;
      this.elementoTextoStatus = null;
      this.elementoContador = null;
      this.botaoPlayPause = null;
      this.botaoAnterior = null;
      this.botaoProxima = null;
      this.botaoParar = null;
      this.seletorVelocidade = null;
      this.elementoValorVelocidade = null;
      this.botaoOcultarPlayer = null;
      this.botaoConfiguracoes = null;

      this.construirInterface();
    }

    /**
     * Constrói a árvore DOM do Mini-Player dentro da ShadowRoot.
     * @returns {void}
     */
    construirInterface() {
      const container = document.createElement('section');
      container.className = 'mini-player-container';
      container.tabIndex = -1;
      container.hidden = true;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Reprodutor de leitura Read For Me');

      container.innerHTML = `
        <header class="cabecalho-player" data-alca-arraste="true" title="Arraste em qualquer área livre para mover o player">
          <div class="bloco-marca-status">
            <span class="alca-arraste-icone" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="5" r="1.8"></circle><circle cx="15" cy="5" r="1.8"></circle>
                <circle cx="9" cy="12" r="1.8"></circle><circle cx="15" cy="12" r="1.8"></circle>
                <circle cx="9" cy="19" r="1.8"></circle><circle cx="15" cy="19" r="1.8"></circle>
              </svg>
            </span>
            <span class="badge-status" data-elemento="badge-status" data-modo="neural">
              <span class="ponto-pulsante"></span>
              <span data-elemento="texto-status">Pronto</span>
            </span>
            <span class="contador-sentencas" data-elemento="contador-sentencas">Frase 1 de 1</span>
          </div>
          <div class="acoes-cabecalho-player">
            <button type="button" class="botao-acao-cabecalho" data-acao="ocultar-player" title="Ocultar este player flutuante (a leitura continua normalmente)">
              Ocultar
            </button>
            <button type="button" class="botao-acao-cabecalho" data-acao="abrir-configuracoes" title="Abrir configurações e seleção de voz">
              Configurações
            </button>
          </div>
        </header>

        <div class="linha-controles-principais">
          <div class="grupo-botoes-transporte">
            <button type="button" class="botao-controle" data-acao="anterior" aria-label="Frase anterior" title="Frase anterior">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
            </button>
            <button type="button" class="botao-controle destaque-play" data-acao="alternar-play-pause" aria-label="Pausar ou retomar leitura" title="Pausar/Retomar (Espaço ou Alt+Shift+S)">
              ${ICONE_PAUSE_SVG}
            </button>
            <button type="button" class="botao-controle" data-acao="proxima" aria-label="Próxima frase" title="Próxima frase">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
            <button type="button" class="botao-controle botao-parar" data-acao="parar" aria-label="Encerrar leitura" title="Parar leitura (Esc)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2"></rect>
              </svg>
            </button>
          </div>

          <div class="bloco-velocidade">
            <label class="rotulo-compacto" for="seletor-velocidade-player">Velocidade</label>
            <input
              id="seletor-velocidade-player"
              type="range"
              class="slider-velocidade-player"
              data-controle="velocidade"
              min="0.75"
              max="2"
              step="0.01"
              value="1"
              aria-label="Velocidade de reprodução de 0.75x até 2.00x"
            />
            <span class="valor-velocidade-player" data-elemento="valor-velocidade">1.00x</span>
          </div>
        </div>

        <footer class="rodape-atalhos">
          <span><kbd class="tecla-atalho">Espaço</kbd> / <kbd class="tecla-atalho">Alt+Shift+S</kbd> Pausar</span>
          <span><kbd class="tecla-atalho">Esc</kbd> Encerrar</span>
        </footer>
      `;

      this.raizShadow.appendChild(container);
      this.elementoContainer = container;
      this.elementoBadgeStatus = container.querySelector('[data-elemento="badge-status"]');
      this.elementoTextoStatus = container.querySelector('[data-elemento="texto-status"]');
      this.elementoContador = container.querySelector('[data-elemento="contador-sentencas"]');
      this.botaoPlayPause = container.querySelector('[data-acao="alternar-play-pause"]');
      this.botaoAnterior = container.querySelector('[data-acao="anterior"]');
      this.botaoProxima = container.querySelector('[data-acao="proxima"]');
      this.botaoParar = container.querySelector('[data-acao="parar"]');
      this.seletorVelocidade = container.querySelector('[data-controle="velocidade"]');
      this.elementoValorVelocidade = container.querySelector(
        '[data-elemento="valor-velocidade"]'
      );
      this.botaoOcultarPlayer = container.querySelector('[data-acao="ocultar-player"]');
      this.botaoConfiguracoes = container.querySelector('[data-acao="abrir-configuracoes"]');

      this.vincularEventosInterativos();
      this.configurarArrastePointerEvents();
    }

    /**
     * Registra os eventos de clique e mudança de valor dos controles internos.
     * @returns {void}
     */
    vincularEventosInterativos() {
      this.botaoPlayPause.addEventListener('click', () => {
        this.callbacks.aoAlternarPlayPause();
      });

      this.botaoAnterior.addEventListener('click', () => {
        this.callbacks.aoVoltarSentenca();
      });

      this.botaoProxima.addEventListener('click', () => {
        this.callbacks.aoAvancarSentenca();
      });

      this.botaoParar.addEventListener('click', () => {
        this.callbacks.aoPararLeitura();
      });

      const aoMudarVelocidadePlayer = (evento) => {
        const novaVelocidade =
          Math.round(parseFloat(evento.target.value) * 100) / 100;
        this.velocidadeAtual = novaVelocidade;
        if (this.elementoValorVelocidade) {
          this.elementoValorVelocidade.textContent = `${novaVelocidade.toFixed(2)}x`;
        }
        this.callbacks.aoAlterarVelocidade(novaVelocidade);
      };
      if (this.seletorVelocidade) {
        this.seletorVelocidade.addEventListener('input', aoMudarVelocidadePlayer);
        this.seletorVelocidade.addEventListener('change', aoMudarVelocidadePlayer);
      }

      if (this.botaoOcultarPlayer) {
        this.botaoOcultarPlayer.addEventListener('click', (evento) => {
          evento.stopPropagation();
          this.ocultar();
          if (typeof this.callbacks.aoOcultarPlayerNaPagina === 'function') {
            this.callbacks.aoOcultarPlayerNaPagina();
          }
        });
      }

      if (this.botaoConfiguracoes) {
        this.botaoConfiguracoes.addEventListener('click', (evento) => {
          evento.stopPropagation();
          if (typeof this.callbacks.aoAbrirConfiguracoes === 'function') {
            this.callbacks.aoAbrirConfiguracoes();
          }
        });
      }
    }

    /**
     * Configura o comportamento arrastável (Draggable) em qualquer área livre do container
     * escutando movimentos no escopo global (window) para funcionar durante a leitura ativa.
     * @returns {void}
     */
    configurarArrastePointerEvents() {
      let arrastando = false;
      let idPonteiroAtivo = null;
      let deslocamentoInicialX = 0;
      let deslocamentoInicialY = 0;

      const aoMoverPonteiroGlobal = (evento) => {
        if (!arrastando) {
          return;
        }
        if (idPonteiroAtivo !== null && evento.pointerId !== idPonteiroAtivo) {
          return;
        }
        const posicaoRestrita = this.restringirCoordenadasNaViewport(
          evento.clientX - deslocamentoInicialX,
          evento.clientY - deslocamentoInicialY
        );
        this.elementoContainer.style.left = `${posicaoRestrita.x}px`;
        this.elementoContainer.style.top = `${posicaoRestrita.y}px`;
        this.elementoContainer.style.bottom = 'auto';
        this.elementoContainer.style.right = 'auto';
      };

      const finalizarArrasteGlobal = (evento) => {
        if (!arrastando) {
          return;
        }
        if (
          idPonteiroAtivo !== null &&
          evento &&
          typeof evento.pointerId === 'number' &&
          evento.pointerId !== idPonteiroAtivo
        ) {
          return;
        }
        arrastando = false;
        this.elementoContainer.removeAttribute('data-arrastando');
        if (typeof this.elementoContainer.releasePointerCapture === 'function' && idPonteiroAtivo !== null) {
          try {
            this.elementoContainer.releasePointerCapture(idPonteiroAtivo);
          } catch {
            // Ignora se pointerId já foi liberado
          }
        }
        idPonteiroAtivo = null;
        if (typeof window !== 'undefined') {
          window.removeEventListener('pointermove', aoMoverPonteiroGlobal);
          window.removeEventListener('pointerup', finalizarArrasteGlobal);
          window.removeEventListener('pointercancel', finalizarArrasteGlobal);
        }
        const retanguloFinal = this.elementoContainer.getBoundingClientRect();
        if (typeof this.callbacks.aoSalvarPosicao === 'function') {
          this.callbacks.aoSalvarPosicao({
            x: retanguloFinal.left,
            y: retanguloFinal.top
          });
        }
      };

      this.elementoContainer.addEventListener('pointerdown', (evento) => {
        if (evento.button !== undefined && evento.button !== 0) {
          return;
        }
        const alvoInterativo =
          evento.target && typeof evento.target.closest === 'function'
            ? evento.target.closest('button, select, input, option, a, label')
            : null;
        if (alvoInterativo) {
          return;
        }

        evento.preventDefault();
        arrastando = true;
        idPonteiroAtivo =
          typeof evento.pointerId === 'number' ? evento.pointerId : null;
        this.elementoContainer.setAttribute('data-arrastando', 'true');

        const retangulo = this.elementoContainer.getBoundingClientRect();
        deslocamentoInicialX = evento.clientX - retangulo.left;
        deslocamentoInicialY = evento.clientY - retangulo.top;

        if (
          typeof this.elementoContainer.setPointerCapture === 'function' &&
          idPonteiroAtivo !== null
        ) {
          try {
            this.elementoContainer.setPointerCapture(idPonteiroAtivo);
          } catch {
            // Fallback seguro via listeners em window
          }
        }

        if (typeof window !== 'undefined') {
          window.addEventListener('pointermove', aoMoverPonteiroGlobal);
          window.addEventListener('pointerup', finalizarArrasteGlobal);
          window.addEventListener('pointercancel', finalizarArrasteGlobal);
        }
      });
    }

    /**
     * Mantém as coordenadas (x, y) dentro das bordas visíveis da janela do navegador.
     * @param {number} coordX
     * @param {number} coordY
     * @returns {{x: number, y: number}}
     */
    restringirCoordenadasNaViewport(coordX, coordY) {
      const margem = 12;
      const larguraJanela = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const alturaJanela = typeof window !== 'undefined' ? window.innerHeight : 768;
      const retangulo = this.elementoContainer.getBoundingClientRect();
      const larguraPlayer = retangulo.width || 380;
      const alturaPlayer = retangulo.height || 90;

      return {
        x: Math.max(margem, Math.min(larguraJanela - larguraPlayer - margem, coordX)),
        y: Math.max(margem, Math.min(alturaJanela - alturaPlayer - margem, coordY))
      };
    }

    /**
     * Atualiza o catálogo interno de vozes disponíveis.
     * @param {Array<{nomeCurto: string, nomeExibicao: string, idioma: string, genero: string}>} listaVozes
     * @returns {void}
     */
    atualizarCatalogoVozes(listaVozes) {
      if (Array.isArray(listaVozes) && listaVozes.length > 0) {
        this.catalogoVozes = listaVozes;
      }
    }

    /**
     * Mantido para compatibilidade com versões anteriores da interface.
     * @returns {void}
     */
    atualizarOpcoesDeIdioma() {
      // Método reservado para compatibilidade de ciclo de vida
    }

    /**
     * Mantido para compatibilidade com versões anteriores da interface.
     * @returns {void}
     */
    renderizarOpcoesDeVozes() {
      // Método reservado para compatibilidade de ciclo de vida
    }

    /**
     * Sincroniza os valores de velocidade e vozes sem alterar o estado de exibição.
     * @param {Object} configuracao
     * @returns {void}
     */
    sincronizarSeletoresComConfiguracao(configuracao = {}) {
      if (configuracao.vozSelecionada) {
        this.vozSelecionadaAtual = configuracao.vozSelecionada;
      }
      if (configuracao.idiomaFiltro) {
        this.idiomaFiltroAtual = configuracao.idiomaFiltro;
      }
      if (configuracao.velocidadeReproducao) {
        this.velocidadeAtual =
          Math.round(Number(configuracao.velocidadeReproducao) * 100) / 100;
        if (this.seletorVelocidade) {
          this.seletorVelocidade.value = String(this.velocidadeAtual);
        }
        if (this.elementoValorVelocidade) {
          this.elementoValorVelocidade.textContent = `${this.velocidadeAtual.toFixed(2)}x`;
        }
      }
    }

    /**
     * Exibe o Mini-Player aplicando as configurações salvas e posicionando no topo por padrão
     * ou na posição persistida pelo usuário após arraste anterior.
     * @param {Object} configuracaoInicial
     * @param {boolean} [_exibirPainelConsentimento=false]
     * @returns {void}
     */
    exibir(configuracaoInicial = {}, _exibirPainelConsentimento = false) {
      this.sincronizarSeletoresComConfiguracao(configuracaoInicial);
      this.elementoContainer.hidden = false;

      if (
        configuracaoInicial.posicaoMiniPlayer &&
        typeof configuracaoInicial.posicaoMiniPlayer.x === 'number' &&
        typeof configuracaoInicial.posicaoMiniPlayer.y === 'number'
      ) {
        const restrita = this.restringirCoordenadasNaViewport(
          configuracaoInicial.posicaoMiniPlayer.x,
          configuracaoInicial.posicaoMiniPlayer.y
        );
        this.elementoContainer.style.left = `${restrita.x}px`;
        this.elementoContainer.style.top = `${restrita.y}px`;
        this.elementoContainer.style.bottom = 'auto';
        this.elementoContainer.style.right = 'auto';
      } else {
        const larguraJanela = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const larguraPlayer = this.elementoContainer.offsetWidth || 380;
        const posX = Math.max(12, Math.round((larguraJanela - larguraPlayer) / 2));
        const posY = 20;
        this.elementoContainer.style.left = `${posX}px`;
        this.elementoContainer.style.top = `${posY}px`;
        this.elementoContainer.style.bottom = 'auto';
        this.elementoContainer.style.right = 'auto';
      }
    }

    /**
     * Atualiza os indicadores visuais de estado da leitura e progresso de frases.
     * @param {Object} dadosEstado
     * @returns {void}
     */
    atualizarEstadoVisual({
      estadoAtual,
      indiceSentencaAtual,
      totalSentencas,
      usandoFallbackLocal
    }) {
      const numeroFraseHumana = Math.min(totalSentencas, indiceSentencaAtual + 1);
      this.elementoContador.textContent = `Frase ${numeroFraseHumana} de ${totalSentencas}`;

      this.botaoAnterior.disabled = indiceSentencaAtual <= 0;
      this.botaoProxima.disabled = indiceSentencaAtual >= totalSentencas - 1;

      if (estadoAtual === 'REPRODUZINDO') {
        this.botaoPlayPause.innerHTML = ICONE_PAUSE_SVG;
        this.elementoTextoStatus.textContent = usandoFallbackLocal
          ? 'Voz Local'
          : 'Lendo (Neural)';
      } else if (estadoAtual === 'PAUSADO') {
        this.botaoPlayPause.innerHTML = ICONE_PLAY_SVG;
        this.elementoTextoStatus.textContent = 'Pausado';
      } else if (estadoAtual === 'CARREGANDO' || estadoAtual === 'BUFFERIZANDO') {
        this.botaoPlayPause.innerHTML = ICONE_PAUSE_SVG;
        this.elementoTextoStatus.textContent = 'Carregando frase...';
      } else if (estadoAtual === 'AGUARDANDO_CONSENTIMENTO') {
        this.botaoPlayPause.innerHTML = ICONE_PLAY_SVG;
        this.elementoTextoStatus.textContent = 'Escolha o motor';
      }

      this.elementoBadgeStatus.setAttribute(
        'data-modo',
        usandoFallbackLocal ? 'fallback' : 'neural'
      );
    }

    /**
     * Oculta o Mini-Player da tela.
     * @returns {void}
     */
    ocultar() {
      if (this.elementoContainer) {
        this.elementoContainer.hidden = true;
      }
    }

    /**
     * Verifica se o foco ativo do usuário está dentro do Mini-Player no Shadow DOM.
     * @returns {boolean}
     */
    possuiFocoInterno() {
      if (!this.raizShadow || !this.elementoContainer || this.elementoContainer.hidden) {
        return false;
      }
      return Boolean(
        this.raizShadow.activeElement &&
          this.elementoContainer.contains(this.raizShadow.activeElement)
      );
    }
  }

  escopoGlobal.ReadForMe.MiniPlayerFlutuante = MiniPlayerFlutuante;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiniPlayerFlutuante;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
