/**
 * Controlador do Painel de Configurações (Popup e Página de Opções).
 * Organizado por categorias em abas (Voz, Destaque, Opções) com seleção de voz,
 * prévia sonora instantânea, personalização de highlights neutros e preferências.
 */
(function inicializarPopupConfiguracoes(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};
  const {
    CONSTANTES_SISTEMA,
    RepositorioConfiguracao,
    UtilitariosTexto,
    MotorFallbackWebSpeech,
    converterHexParaRgba
  } = escopoGlobal.ReadForMe;

  class ControladorPopupConfiguracoes {
    constructor() {
      this.repositorioConfiguracao = new RepositorioConfiguracao();
      this.motorFallback = new MotorFallbackWebSpeech({
        aoAtivarPalavra: () => {},
        aoConcluirSentenca: () => {},
        aoOcorrerErroAudio: () => {}
      });
      this.catalogoVozes = [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO];
      this.configuracaoAtual = null;
      this.audioPreviaAtivo = null;
      this.reproduzindoPrevia = false;
      this.idIntervaloEstadoAba = null;
    }

    /**
     * Inicializa os elementos DOM, carrega preferências e consulta o estado da aba ativa.
     * @returns {Promise<void>}
     */
    async inicializar() {
      if (typeof document === 'undefined') {
        return;
      }

      this.capturarReferenciasDom();
      this.configuracaoAtual =
        await this.repositorioConfiguracao.carregarConfiguracaoCompleta();

      this.aplicarConfiguracaoNosControles();
      this.vincularEventos();
      await this.carregarCatalogoDeVozes();
      await this.sincronizarEstadoDaAbaAtiva();

      this.idIntervaloEstadoAba = setInterval(() => {
        this.sincronizarEstadoDaAbaAtiva();
      }, 900);
    }

    /**
     * Mapeia os elementos interativos do HTML do Popup.
     * @returns {void}
     */
    capturarReferenciasDom() {
      this.barraLeituraAtiva = document.getElementById('barra-leitura-ativa');
      this.badgeEstadoAba = document.getElementById('badge-estado-aba');
      this.botaoIniciarOuPausar = document.getElementById('botao-iniciar-ou-pausar');
      this.iconeAcaoPrincipal = document.getElementById('icone-acao-principal');
      this.botaoAbaParar = document.getElementById('botao-aba-parar');

      this.botoesAbaCategoria = Array.from(document.querySelectorAll('.botao-aba'));
      this.paineisCategoria = Array.from(document.querySelectorAll('.painel-categoria'));

      this.botaoOuvirPrevia = document.getElementById('botao-ouvir-previa');
      this.seletorFiltroIdioma = document.getElementById('filtro-idioma');
      this.seletorVelocidade = document.getElementById('velocidade-leitura');
      this.labelValorVelocidade = document.getElementById('valor-velocidade-leitura');
      this.seletorVoz = document.getElementById('seletor-voz');
      this.seletorModoMotor = document.getElementById('modo-motor-voz');

      this.previaSentencaHighlight = document.getElementById('previa-sentenca-highlight');
      this.previaPalavraHighlight = document.getElementById('previa-palavra-highlight');
      this.botoesPreset = Array.from(document.querySelectorAll('.chip-preset'));

      this.chkDestacarFrase = document.getElementById('chk-destacar-frase');
      this.inputCorFrase = document.getElementById('cor-frase');
      this.inputOpacidadeFrase = document.getElementById('opacidade-frase');
      this.labelValorOpacidadeFrase = document.getElementById('valor-opacidade-frase');

      this.chkDestacarPalavra = document.getElementById('chk-destacar-palavra');
      this.inputCorFundoPalavra = document.getElementById('cor-fundo-palavra');
      this.inputCorTextoPalavra = document.getElementById('cor-texto-palavra');
      this.chkSublinharPalavra = document.getElementById('chk-sublinhar-palavra');

      this.chkLeituraContinua = document.getElementById('chk-leitura-continua');
      this.chkExibirBotaoSelecao = document.getElementById('chk-exibir-botao-selecao');
      this.chkExibirMiniPlayer = document.getElementById('chk-exibir-mini-player');
    }

    /**
     * Alterna a categoria visível no Popup (Voz, Destaque, Opções).
     * @param {string} nomeAbaAlvo
     * @returns {void}
     */
    alternarAbaCategoria(nomeAbaAlvo) {
      for (const botaoAba of this.botoesAbaCategoria) {
        const ehAlvo = botaoAba.getAttribute('data-aba-alvo') === nomeAbaAlvo;
        botaoAba.setAttribute('aria-selected', ehAlvo ? 'true' : 'false');
      }
      for (const painel of this.paineisCategoria) {
        const ehAlvo = painel.getAttribute('data-painel-aba') === nomeAbaAlvo;
        painel.hidden = !ehAlvo;
      }
    }

    /**
     * Sincroniza o slider de velocidade (0.75 a 2.00, precisão 0.01) e seu indicador numérico.
     * @param {number} velocidadeAtiva
     * @returns {void}
     */
    sincronizarControleVelocidade(velocidadeAtiva) {
      const numeroSeguro = Number.isFinite(Number(velocidadeAtiva))
        ? Math.max(0.75, Math.min(2.0, Math.round(Number(velocidadeAtiva) * 100) / 100))
        : 1.0;
      if (this.seletorVelocidade) {
        this.seletorVelocidade.value = String(numeroSeguro);
      }
      if (this.labelValorVelocidade) {
        this.labelValorVelocidade.textContent = `${numeroSeguro.toFixed(2)}x`;
      }
    }

    /**
     * Preenche os valores iniciais nos selects, checkboxes e seletores de cor.
     * @returns {void}
     */
    aplicarConfiguracaoNosControles() {
      const cfg = this.configuracaoAtual;
      this.sincronizarControleVelocidade(cfg.velocidadeReproducao);

      this.seletorModoMotor.value =
        cfg.modoPrivacidadeVoz === CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL
          ? CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL
          : CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO;

      this.chkLeituraContinua.checked = cfg.modoLeituraContinua !== false;
      this.chkExibirBotaoSelecao.checked = cfg.exibirBotaoFlutuanteSelecao !== false;
      this.chkExibirMiniPlayer.checked = Boolean(cfg.exibirMiniPlayerFlutuante);

      this.aplicarEstiloHighlightNosInputs(cfg.estiloHighlight);
      this.renderizarOpcoesDeIdiomaEVoz();
    }

    /**
     * Sincroniza os inputs de cor/opacidade e a caixa de prévia com o objeto de estilo.
     * @param {Object} estilo
     * @returns {void}
     */
    aplicarEstiloHighlightNosInputs(estilo) {
      const est = {
        ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
        ...(estilo || {})
      };

      this.chkDestacarFrase.checked = Boolean(est.destacarFrase);
      if (est.corFrase && est.corFrase.startsWith('#')) {
        this.inputCorFrase.value = est.corFrase;
      }
      this.inputOpacidadeFrase.value = String(est.opacidadeFrase);
      this.labelValorOpacidadeFrase.textContent = `${Math.round(est.opacidadeFrase * 100)}%`;

      this.chkDestacarPalavra.checked = Boolean(est.destacarPalavra);
      if (est.corFundoPalavra && est.corFundoPalavra.startsWith('#')) {
        this.inputCorFundoPalavra.value = est.corFundoPalavra;
      }
      if (est.corTextoPalavra && est.corTextoPalavra.startsWith('#')) {
        this.inputCorTextoPalavra.value = est.corTextoPalavra;
      }
      this.chkSublinharPalavra.checked = Boolean(est.sublinharPalavra);

      for (const botao of this.botoesPreset) {
        const chavePreset = botao.getAttribute('data-preset');
        botao.setAttribute(
          'data-selecionado',
          chavePreset === est.temaPreset ? 'true' : 'false'
        );
      }

      this.atualizarPreviaVisualHighlight(est);
    }

    /**
     * Atualiza a caixa de demonstração ao vivo dos highlights dentro do Popup.
     * @param {Object} estilo
     * @returns {void}
     */
    atualizarPreviaVisualHighlight(estilo) {
      const fundoFrase = estilo.destacarFrase
        ? converterHexParaRgba(estilo.corFrase, estilo.opacidadeFrase)
        : 'transparent';
      this.previaSentencaHighlight.style.backgroundColor = fundoFrase;

      if (!estilo.destacarPalavra) {
        this.previaPalavraHighlight.style.backgroundColor = 'transparent';
        this.previaPalavraHighlight.style.color = 'inherit';
        this.previaPalavraHighlight.style.textDecoration = 'none';
        return;
      }

      this.previaPalavraHighlight.style.backgroundColor =
        estilo.corFundoPalavra || '#e2e8f0';
      this.previaPalavraHighlight.style.color =
        estilo.corFundoPalavra === 'transparent'
          ? 'inherit'
          : estilo.corTextoPalavra || '#0f172a';
      this.previaPalavraHighlight.style.textDecoration = estilo.sublinharPalavra
        ? `underline ${estilo.corFrase || '#64748b'}`
        : 'none';
      this.previaPalavraHighlight.style.textUnderlineOffset = '3px';
    }

    /**
     * Consulta o catálogo de vozes junto ao Service Worker.
     * @returns {Promise<void>}
     */
    async carregarCatalogoDeVozes() {
      if (
        typeof chrome === 'undefined' ||
        !chrome.runtime ||
        typeof chrome.runtime.sendMessage !== 'function'
      ) {
        return;
      }
      try {
        const resposta = await chrome.runtime.sendMessage({
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.OBTER_CATALOGO_VOZES
        });
        if (resposta && Array.isArray(resposta.vozes) && resposta.vozes.length > 0) {
          this.catalogoVozes = resposta.vozes;
          this.renderizarOpcoesDeIdiomaEVoz();
        }
      } catch {
        // Mantém catálogo padrão embutido
      }
    }

    /**
     * Popula o seletor de idioma e o seletor de vozes agrupadas.
     * @returns {void}
     */
    renderizarOpcoesDeIdiomaEVoz() {
      const idiomasUnicos = new Set(['pt-BR', 'en-US']);
      for (const voz of this.catalogoVozes) {
        if (voz && voz.idioma) {
          idiomasUnicos.add(voz.idioma);
        }
      }

      const idiomaFiltroAtual = this.configuracaoAtual.idiomaFiltro || 'TODOS';
      this.seletorFiltroIdioma.innerHTML = '';

      const opcaoTodos = document.createElement('option');
      opcaoTodos.value = 'TODOS';
      opcaoTodos.textContent = 'Todos os idiomas';
      this.seletorFiltroIdioma.appendChild(opcaoTodos);

      for (const codigoIdioma of idiomasUnicos) {
        const opcao = document.createElement('option');
        opcao.value = codigoIdioma;
        opcao.textContent =
          codigoIdioma === 'pt-BR'
            ? 'Português (Brasil)'
            : codigoIdioma === 'en-US'
              ? 'Inglês (EUA)'
              : codigoIdioma;
        this.seletorFiltroIdioma.appendChild(opcao);
      }

      this.seletorFiltroIdioma.value = idiomasUnicos.has(idiomaFiltroAtual)
        ? idiomaFiltroAtual
        : 'TODOS';

      const vozesFiltradas =
        this.seletorFiltroIdioma.value === 'TODOS'
          ? this.catalogoVozes
          : this.catalogoVozes.filter(
              (voz) => voz.idioma === this.seletorFiltroIdioma.value
            );

      const listaExibicao =
        vozesFiltradas.length > 0 ? vozesFiltradas : this.catalogoVozes;

      this.seletorVoz.innerHTML = '';
      const grupoPtBr = document.createElement('optgroup');
      grupoPtBr.label = 'Português (Brasil)';
      const grupoEnUs = document.createElement('optgroup');
      grupoEnUs.label = 'Inglês (EUA)';
      const grupoOutros = document.createElement('optgroup');
      grupoOutros.label = 'Outros idiomas';

      for (const itemVoz of listaExibicao) {
        const opcao = document.createElement('option');
        opcao.value = itemVoz.nomeCurto;
        opcao.textContent = itemVoz.nomeExibicao;
        if (itemVoz.idioma === 'pt-BR') {
          grupoPtBr.appendChild(opcao);
        } else if (itemVoz.idioma === 'en-US') {
          grupoEnUs.appendChild(opcao);
        } else {
          grupoOutros.appendChild(opcao);
        }
      }

      if (grupoPtBr.children.length > 0) {
        this.seletorVoz.appendChild(grupoPtBr);
      }
      if (grupoEnUs.children.length > 0) {
        this.seletorVoz.appendChild(grupoEnUs);
      }
      if (grupoOutros.children.length > 0) {
        this.seletorVoz.appendChild(grupoOutros);
      }

      const vozSalva = this.configuracaoAtual.vozSelecionada;
      const existeNaLista = listaExibicao.some((v) => v.nomeCurto === vozSalva);
      if (existeNaLista) {
        this.seletorVoz.value = vozSalva;
      } else if (listaExibicao[0]) {
        this.seletorVoz.value = listaExibicao[0].nomeCurto;
      }
    }

    /**
     * Registra todos os eventos de interação dos controles do Popup.
     * @returns {void}
     */
    vincularEventos() {
      for (const botaoAba of this.botoesAbaCategoria) {
        botaoAba.addEventListener('click', () => {
          const nomeAba = botaoAba.getAttribute('data-aba-alvo');
          this.alternarAbaCategoria(nomeAba);
        });
      }

      this.seletorFiltroIdioma.addEventListener('change', async () => {
        const novoIdioma = this.seletorFiltroIdioma.value;
        this.configuracaoAtual.idiomaFiltro = novoIdioma;
        await this.repositorioConfiguracao.salvarIdiomaFiltro(novoIdioma);
        this.renderizarOpcoesDeIdiomaEVoz();
      });

      this.seletorVoz.addEventListener('change', async () => {
        const novaVoz = this.seletorVoz.value;
        console.log('[ReadForMe][Popup] Voz alterada pelo usuário no Popup:', novaVoz);
        this.configuracaoAtual.vozSelecionada = novaVoz;
        if (this.reproduzindoPrevia) {
          this.pararPreviaDeVoz();
        }
        await this.repositorioConfiguracao.salvarVozSelecionada(novaVoz);
      });

      if (this.seletorVelocidade) {
        const aoAlterarSliderVelocidade = async () => {
          const novaVelocidade =
            Math.round(parseFloat(this.seletorVelocidade.value) * 100) / 100;
          this.configuracaoAtual.velocidadeReproducao = novaVelocidade;
          this.sincronizarControleVelocidade(novaVelocidade);
          if (this.audioPreviaAtivo) {
            this.audioPreviaAtivo.playbackRate = novaVelocidade;
          }
          await this.repositorioConfiguracao.salvarVelocidadeReproducao(novaVelocidade);
        };
        this.seletorVelocidade.addEventListener('input', aoAlterarSliderVelocidade);
        this.seletorVelocidade.addEventListener('change', aoAlterarSliderVelocidade);
      }

      this.seletorModoMotor.addEventListener('change', async () => {
        const novoModo = this.seletorModoMotor.value;
        console.log('[ReadForMe][Popup] Modo do motor alterado pelo usuário:', novoModo);
        this.configuracaoAtual.modoPrivacidadeVoz = novoModo;
        await this.repositorioConfiguracao.salvarModoPrivacidadeVoz(novoModo);
      });

      this.botaoOuvirPrevia.addEventListener('click', () => {
        this.alternarPreviaDeVoz();
      });

      for (const botaoPreset of this.botoesPreset) {
        botaoPreset.addEventListener('click', async () => {
          const chavePreset = botaoPreset.getAttribute('data-preset');
          const dadosPreset = CONSTANTES_SISTEMA.PRESETS_HIGHLIGHT[chavePreset];
          if (!dadosPreset) {
            return;
          }
          const novoEstilo = {
            ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO,
            ...dadosPreset,
            temaPreset: chavePreset
          };
          this.configuracaoAtual.estiloHighlight = novoEstilo;
          this.aplicarEstiloHighlightNosInputs(novoEstilo);
          await this.repositorioConfiguracao.salvarEstiloHighlight(novoEstilo);
        });
      }

      const salvarMudancaCustomizadaHighlight = async () => {
        const opacidadeNumerica = parseFloat(this.inputOpacidadeFrase.value) || 0.14;
        this.labelValorOpacidadeFrase.textContent = `${Math.round(opacidadeNumerica * 100)}%`;

        const novoEstilo = {
          temaPreset: 'personalizado',
          destacarFrase: this.chkDestacarFrase.checked,
          corFrase: this.inputCorFrase.value,
          opacidadeFrase: opacidadeNumerica,
          destacarPalavra: this.chkDestacarPalavra.checked,
          corFundoPalavra: this.inputCorFundoPalavra.value,
          corTextoPalavra: this.inputCorTextoPalavra.value,
          sublinharPalavra: this.chkSublinharPalavra.checked
        };

        this.configuracaoAtual.estiloHighlight = novoEstilo;
        for (const botao of this.botoesPreset) {
          botao.setAttribute('data-selecionado', 'false');
        }
        this.atualizarPreviaVisualHighlight(novoEstilo);
        await this.repositorioConfiguracao.salvarEstiloHighlight(novoEstilo);
      };

      this.chkDestacarFrase.addEventListener('change', salvarMudancaCustomizadaHighlight);
      this.inputCorFrase.addEventListener('input', salvarMudancaCustomizadaHighlight);
      this.inputOpacidadeFrase.addEventListener('input', salvarMudancaCustomizadaHighlight);
      this.chkDestacarPalavra.addEventListener('change', salvarMudancaCustomizadaHighlight);
      this.inputCorFundoPalavra.addEventListener('input', salvarMudancaCustomizadaHighlight);
      this.inputCorTextoPalavra.addEventListener('input', salvarMudancaCustomizadaHighlight);
      this.chkSublinharPalavra.addEventListener('change', salvarMudancaCustomizadaHighlight);

      this.chkLeituraContinua.addEventListener('change', async () => {
        const valor = this.chkLeituraContinua.checked;
        this.configuracaoAtual.modoLeituraContinua = valor;
        await this.repositorioConfiguracao.salvarModoLeituraContinua(valor);
      });

      this.chkExibirBotaoSelecao.addEventListener('change', async () => {
        const valor = this.chkExibirBotaoSelecao.checked;
        this.configuracaoAtual.exibirBotaoFlutuanteSelecao = valor;
        await this.repositorioConfiguracao.salvarExibirBotaoFlutuanteSelecao(valor);
      });

      this.chkExibirMiniPlayer.addEventListener('change', async () => {
        const valor = this.chkExibirMiniPlayer.checked;
        this.configuracaoAtual.exibirMiniPlayerFlutuante = valor;
        await this.repositorioConfiguracao.salvarExibirMiniPlayerFlutuante(valor);
      });

      if (this.botaoIniciarOuPausar) {
        this.botaoIniciarOuPausar.addEventListener('click', () => {
          this.enviarComandoParaAbaAtiva('ALTERNAR_PAUSA');
        });
      }

      if (this.botaoAbaParar) {
        this.botaoAbaParar.addEventListener('click', () => {
          this.enviarComandoParaAbaAtiva('PARAR');
        });
      }
    }

    /**
     * Toca ou interrompe uma amostra (preview) da voz atualmente selecionada.
     * @returns {Promise<void>}
     */
    async alternarPreviaDeVoz() {
      if (this.reproduzindoPrevia) {
        this.pararPreviaDeVoz();
        return;
      }

      const vozAlvo =
        this.seletorVoz.value ||
        this.configuracaoAtual.vozSelecionada ||
        CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA;
      const velocidadeAlvo =
        parseFloat(this.seletorVelocidade.value) ||
        this.configuracaoAtual.velocidadeReproducao ||
        CONSTANTES_SISTEMA.VALORES_PADRAO.VELOCIDADE_REPRODUCAO;
      const usarSomenteLocal =
        this.seletorModoMotor.value ===
        CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL;

      const idiomaPrefixo = vozAlvo.slice(0, 5);
      const textoPrevia =
        CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ[idiomaPrefixo] ||
        (vozAlvo.startsWith('en-')
          ? CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ['en-US']
          : CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ.PADRAO);

      console.log('[ReadForMe][Popup] Iniciando prévia de voz:', {
        vozAlvo,
        velocidadeAlvo,
        usarSomenteLocal,
        modoMotorSelecionado: this.seletorModoMotor.value
      });

      this.reproduzindoPrevia = true;
      this.botaoOuvirPrevia.textContent = '⏹ Parar';

      try {
        if (
          !usarSomenteLocal &&
          typeof chrome !== 'undefined' &&
          chrome.runtime &&
          typeof chrome.runtime.sendMessage === 'function'
        ) {
          let resposta = await chrome.runtime.sendMessage({
            tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PREVISUALIZAR_VOZ,
            payload: { nomeVoz: vozAlvo, textoPrevia }
          });

          if ((!resposta || !resposta.sucesso) && typeof window !== 'undefined') {
            try {
              console.log(
                '[ReadForMe][Popup] Tentando síntese neural direta no contexto de documento do Popup...'
              );
              const moduloEdge = await import('../background/cliente_websocket_edge_tts.js');
              const clientePopup = new moduloEdge.ClienteWebSocketEdgeTts();
              const resultadoDireto = await clientePopup.sintetizarSentenca({
                textoSentenca: textoPrevia,
                nomeVoz: vozAlvo
              });
              resposta = {
                sucesso: true,
                audioBase64: resultadoDireto.audioBase64,
                logsDiagnostico: resultadoDireto.logsDiagnostico
              };
            } catch (erroDiretoPopup) {
              console.error(
                '[ReadForMe ERRO][Popup] Falha na síntese neural direta no Popup:',
                erroDiretoPopup
              );
            }
          }

          if (resposta && Array.isArray(resposta.logsDiagnostico)) {
            for (const linhaLog of resposta.logsDiagnostico) {
              if (resposta.sucesso) {
                console.log(linhaLog);
              } else {
                console.error(linhaLog);
              }
            }
          }

          if (!this.reproduzindoPrevia) {
            return;
          }

          if (resposta && resposta.sucesso && resposta.audioBase64) {
            console.log('[ReadForMe][Popup] Áudio MP3 neural da prévia recebido com sucesso:', {
              vozAlvo,
              tamanhoBase64: resposta.audioBase64.length
            });
            const bytesMp3 = UtilitariosTexto.converterBase64ParaUint8Array(
              resposta.audioBase64
            );
            const blob = new Blob([bytesMp3], { type: 'audio/mpeg' });
            const urlBlob = URL.createObjectURL(blob);

            await new Promise((resolver) => {
              const elementoAudio = new Audio(urlBlob);
              this.audioPreviaAtivo = elementoAudio;
              elementoAudio.playbackRate = velocidadeAlvo;
              const finalizar = () => {
                URL.revokeObjectURL(urlBlob);
                if (this.audioPreviaAtivo === elementoAudio) {
                  this.audioPreviaAtivo = null;
                }
                resolver();
              };
              elementoAudio.addEventListener('ended', finalizar, { once: true });
              elementoAudio.addEventListener(
                'error',
                (eventoErroAudio) => {
                  console.error(
                    '[ReadForMe ERRO][Popup] Erro ao reproduzir Blob MP3 da prévia:',
                    eventoErroAudio
                  );
                  finalizar();
                },
                { once: true }
              );
              elementoAudio.play().catch((erroPlay) => {
                console.error(
                  '[ReadForMe ERRO][Popup] Exceção em elementoAudio.play() na prévia:',
                  erroPlay
                );
                finalizar();
              });
            });
            return;
          }

          console.error(
            '[ReadForMe ERRO][Popup] Falha na síntese neural da prévia no Service Worker:',
            resposta ? resposta.motivoErro : 'Sem resposta do Service Worker'
          );
        }

        if (this.reproduzindoPrevia) {
          console.warn(
            '[ReadForMe][Popup] Reproduzindo prévia via Fallback Local (Web Speech API)...'
          );
          await this.motorFallback.reproduzirSentencaFallback(
            textoPrevia,
            vozAlvo,
            velocidadeAlvo
          );
        }
      } finally {
        this.reproduzindoPrevia = false;
        this.botaoOuvirPrevia.textContent = '🔊 Ouvir amostra';
      }
    }

    /**
     * Interrompe imediatamente a prévia sonora caso esteja em andamento.
     * @returns {void}
     */
    pararPreviaDeVoz() {
      this.reproduzindoPrevia = false;
      if (this.audioPreviaAtivo) {
        try {
          this.audioPreviaAtivo.pause();
        } catch {}
        this.audioPreviaAtivo = null;
      }
      this.motorFallback.pararELimpar();
      this.botaoOuvirPrevia.textContent = '🔊 Ouvir amostra';
    }

    /**
     * Obtém a aba ativa da janela atual do navegador.
     * @returns {Promise<chrome.tabs.Tab | null>}
     */
    async obterAbaAtiva() {
      if (
        typeof chrome === 'undefined' ||
        !chrome.tabs ||
        typeof chrome.tabs.query !== 'function'
      ) {
        return null;
      }
      try {
        const abas = await chrome.tabs.query({ active: true, currentWindow: true });
        return abas && abas[0] ? abas[0] : null;
      } catch {
        return null;
      }
    }

    /**
     * Consulta o estado da leitura na aba ativa.
     * @returns {Promise<void>}
     */
    async sincronizarEstadoDaAbaAtiva() {
      const abaAtiva = await this.obterAbaAtiva();
      if (!abaAtiva || typeof abaAtiva.id !== 'number') {
        return;
      }

      try {
        const estado = await chrome.tabs.sendMessage(abaAtiva.id, {
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.OBTER_ESTADO_LEITURA_ABA
        });
        if (estado && typeof estado.estadoAtual === 'string') {
          this.atualizarInterfaceEstadoAba(estado);
        }
      } catch {
        // Aba sem content script ativo
      }
    }

    /**
     * Envia um comando de controle de reprodução para a aba ativa.
     * @param {string} acao
     * @returns {Promise<void>}
     */
    async enviarComandoParaAbaAtiva(acao) {
      const abaAtiva = await this.obterAbaAtiva();
      if (!abaAtiva || typeof abaAtiva.id !== 'number') {
        return;
      }

      try {
        const estado = await chrome.tabs.sendMessage(abaAtiva.id, {
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.COMANDO_CONTROLE_ABA,
          payload: { acao }
        });
        if (estado && typeof estado.estadoAtual === 'string') {
          this.atualizarInterfaceEstadoAba(estado);
        }
      } catch {
        // Ignora erro caso a aba não permita mensagens
      }
    }

    /**
     * Reflete o estado de leitura da aba na barra discreta do cabeçalho.
     * @param {Object} estado
     * @returns {void}
     */
    atualizarInterfaceEstadoAba(estado) {
      const {
        estadoAtual,
        indiceSentencaAtual = 0,
        totalSentencas = 0
      } = estado;

      const leituraAtiva = estadoAtual !== 'INATIVO';
      if (this.barraLeituraAtiva) {
        this.barraLeituraAtiva.hidden = !leituraAtiva;
      }
      if (this.badgeEstadoAba) {
        this.badgeEstadoAba.setAttribute('data-ativo', leituraAtiva ? 'true' : 'false');
      }

      if (!leituraAtiva) {
        if (this.badgeEstadoAba) {
          this.badgeEstadoAba.textContent = 'Inativo';
        }
        return;
      }

      const fraseHumana = Math.min(totalSentencas, indiceSentencaAtual + 1);
      if (estadoAtual === 'REPRODUZINDO' || estadoAtual === 'BUFFERIZANDO') {
        if (this.badgeEstadoAba) {
          this.badgeEstadoAba.textContent = `Lendo ${fraseHumana}/${totalSentencas}`;
        }
        if (this.iconeAcaoPrincipal) {
          this.iconeAcaoPrincipal.textContent = '⏸';
        }
      } else if (estadoAtual === 'PAUSADO') {
        if (this.badgeEstadoAba) {
          this.badgeEstadoAba.textContent = `Pausado ${fraseHumana}/${totalSentencas}`;
        }
        if (this.iconeAcaoPrincipal) {
          this.iconeAcaoPrincipal.textContent = '▶';
        }
      }
    }
  }

  escopoGlobal.ReadForMe.ControladorPopupConfiguracoes = ControladorPopupConfiguracoes;

  if (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    !escopoGlobal.__READ_FOR_ME_DESATIVAR_AUTO_INIT__
  ) {
    document.addEventListener('DOMContentLoaded', () => {
      const controlador = new ControladorPopupConfiguracoes();
      controlador.inicializar();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ControladorPopupConfiguracoes;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
