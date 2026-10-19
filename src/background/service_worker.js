import '../shared/constantes_sistema.js';
import { ClienteWebSocketEdgeTts } from './cliente_websocket_edge_tts.js';
import { ServicoCatalogoVozes } from './servico_catalogo_vozes.js';

const { CONSTANTES_SISTEMA } = globalThis.ReadForMe;

/**
 * Controlador principal do Service Worker (Manifest V3).
 * Coordena menus de contexto ("Ler a partir daqui" e "Ler apenas o trecho selecionado"),
 * atalhos globais, prévia de voz (preview), canal persistente Keep-Alive e síntese de áudio.
 */
export class ControladorBackground {
  constructor() {
    this.clienteEdgeTts = new ClienteWebSocketEdgeTts();
    this.controladoresAbortoPorChave = new Map();
  }

  /**
   * Registra todos os listeners do ciclo de vida do Service Worker no Chromium.
   * @returns {void}
   */
  inicializar() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return;
    }

    console.log('[ReadForMe][Background] Inicializando Service Worker...');
    ClienteWebSocketEdgeTts.garantirCabecalhosRedeEdgeTts();

    chrome.runtime.onInstalled.addListener(() => {
      console.log('[ReadForMe][Background] Evento onInstalled disparado.');
      ClienteWebSocketEdgeTts.garantirCabecalhosRedeEdgeTts();
      this.registrarMenuContexto();
    });

    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener((infoClique, abaAlvo) => {
        if (!abaAlvo || typeof abaAlvo.id !== 'number') {
          return;
        }

        const opcoesEnvio =
          typeof infoClique.frameId === 'number'
            ? { frameId: infoClique.frameId }
            : undefined;

        if (
          infoClique.menuItemId === CONSTANTES_SISTEMA.ID_MENU_LER_A_PARTIR_DAQUI
        ) {
          chrome.tabs
            .sendMessage(
              abaAlvo.id,
              {
                tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.INICIAR_LEITURA_A_PARTIR_DAQUI
              },
              opcoesEnvio
            )
            .catch((erroEnvio) => {
              console.error(
                '[ReadForMe][Background] Falha ao enviar INICIAR_LEITURA_A_PARTIR_DAQUI para a aba/frame:',
                erroEnvio
              );
            });
          return;
        }

        if (
          infoClique.menuItemId === CONSTANTES_SISTEMA.ID_MENU_LER_SELECAO_EXATA
        ) {
          chrome.tabs
            .sendMessage(
              abaAlvo.id,
              {
                tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.INICIAR_LEITURA_SELECAO_EXATA
              },
              opcoesEnvio
            )
            .catch((erroEnvio) => {
              console.error(
                '[ReadForMe][Background] Falha ao enviar INICIAR_LEITURA_SELECAO_EXATA para a aba/frame:',
                erroEnvio
              );
            });
        }
      });
    }

    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener(async (comandoRecebido) => {
        if (comandoRecebido === 'alternar-pausa-leitura') {
          const abasAtivas = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });
          const primeiraAba = abasAtivas[0];
          if (primeiraAba && typeof primeiraAba.id === 'number') {
            chrome.tabs
              .sendMessage(primeiraAba.id, {
                tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.ALTERNAR_PAUSA_ATALHO
              })
              .catch(() => {});
          }
        }
      });
    }

    chrome.runtime.onConnect.addListener((portaConectada) => {
      if (portaConectada.name !== CONSTANTES_SISTEMA.NOME_PORTA_KEEP_ALIVE) {
        return;
      }
      this.configurarPortaDeSintese(portaConectada);
    });

    chrome.runtime.onMessage.addListener((mensagem, remetente, enviarResposta) => {
      if (!mensagem || typeof mensagem.tipoMensagem !== 'string') {
        return false;
      }

      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.OBTER_CATALOGO_VOZES) {
        ServicoCatalogoVozes.obterCatalogoVozesOrdenado()
          .then((catalogoVozes) => {
            console.log(
              `[ReadForMe][Background] Catálogo de vozes carregado (${catalogoVozes.length} vozes).`
            );
            enviarResposta({ sucesso: true, vozes: catalogoVozes });
          })
          .catch((erroCatalogo) => {
            console.error(
              '[ReadForMe][Background] Erro ao carregar catálogo de vozes, usando catálogo padrão:',
              erroCatalogo
            );
            enviarResposta({
              sucesso: true,
              vozes: [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO]
            });
          });
        return true;
      }

      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PREVISUALIZAR_VOZ) {
        const payload = mensagem.payload || {};
        const nomeVoz =
          payload.nomeVoz || CONSTANTES_SISTEMA.VALORES_PADRAO.VOZ_SELECIONADA;
        const idiomaPrefixo = nomeVoz.slice(0, 5);
        const textoPrevia =
          payload.textoPrevia ||
          CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ[idiomaPrefixo] ||
          (nomeVoz.startsWith('en-')
            ? CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ['en-US']
            : CONSTANTES_SISTEMA.TEXTOS_PREVIA_VOZ.PADRAO);

        console.log('[ReadForMe][Background] Solicitação PREVISUALIZAR_VOZ recebida:', {
          nomeVoz,
          textoPrevia
        });

        this.clienteEdgeTts.resetarCircuito();
        this.clienteEdgeTts
          .sintetizarSentenca({
            textoSentenca: textoPrevia,
            nomeVoz
          })
          .then((resultado) => {
            enviarResposta({
              sucesso: true,
              audioBase64: resultado.audioBase64,
              textoPrevia,
              logsDiagnostico: resultado.logsDiagnostico || []
            });
          })
          .catch((erro) => {
            const motivoErro =
              erro instanceof Error
                ? erro.message
                : 'Falha ao sintetizar prévia de voz.';
            console.error(
              '[ReadForMe][Background] Erro em PREVISUALIZAR_VOZ:',
              motivoErro,
              erro && erro.logsDiagnostico ? erro.logsDiagnostico : ''
            );
            enviarResposta({
              sucesso: false,
              textoPrevia,
              motivoErro,
              logsDiagnostico: (erro && erro.logsDiagnostico) || []
            });
          });
      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.ABRIR_CONFIGURACOES) {
        if (chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
          chrome.runtime.openOptionsPage();
        }
        enviarResposta({ sucesso: true });
        return true;
      }

      return false;
    });
  }

  /**
   * Cria os itens "Ler a partir daqui" (página inteira ou seleção) e "Ler apenas o trecho selecionado".
   * @returns {void}
   */
  registrarMenuContexto() {
    if (!chrome.contextMenus) {
      return;
    }
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CONSTANTES_SISTEMA.ID_MENU_LER_A_PARTIR_DAQUI,
        title: 'Ler a partir daqui',
        contexts: ['page', 'selection']
      });
      chrome.contextMenus.create({
        id: CONSTANTES_SISTEMA.ID_MENU_LER_SELECAO_EXATA,
        title: 'Ler apenas o trecho selecionado',
        contexts: ['selection']
      });
    });
  }

  /**
   * Gerencia o canal persistente de uma aba para manter o Service Worker ativo e sintetizar sentenças.
   * @param {chrome.runtime.Port} portaConectada
   * @returns {void}
   */
  configurarPortaDeSintese(portaConectada) {
    const idAba =
      portaConectada.sender && portaConectada.sender.tab
        ? portaConectada.sender.tab.id
        : `porta-${Date.now()}`;

    console.log(`[ReadForMe][Background] Porta Keep-Alive conectada (idAba=${idAba}).`);

    portaConectada.onMessage.addListener(async (mensagem) => {
      if (!mensagem || typeof mensagem.tipoMensagem !== 'string') {
        return;
      }

      const payload = mensagem.payload || {};

      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_KEEP_ALIVE) {
        this.enviarMensagemSeguraNaPorta(portaConectada, {
          tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.HEARTBEAT_CONFIRMADO,
          payload: {
            idSessaoLeitura: payload.idSessaoLeitura || null,
            timestamp: Date.now()
          }
        });
        return;
      }

      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.CANCELAR_SINTESE_ABA) {
        this.cancelarRequisicoesDaAba(idAba, payload.idSessaoLeitura);
        return;
      }

      if (mensagem.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.SINTETIZAR_SENTENCA) {
        await this.processarPedidoSintese(portaConectada, idAba, payload);
      }
    });

    portaConectada.onDisconnect.addListener(() => {
      this.cancelarRequisicoesDaAba(idAba);
    });
  }

  /**
   * Executa a síntese de uma sentença e envia o pacote resultante ou ordem de fallback pela porta.
   * @param {chrome.runtime.Port} portaConectada
   * @param {number|string} idAba
   * @param {Object} payload
   * @returns {Promise<void>}
   */
  async processarPedidoSintese(portaConectada, idAba, payload) {
    const { idRequisicao, idSessaoLeitura, indiceSentenca, textoSentenca, nomeVoz } = payload;
    const chaveAborto = `${idAba}:${idSessaoLeitura}:${idRequisicao || indiceSentenca}`;
    const controladorAborto = new AbortController();
    this.controladoresAbortoPorChave.set(chaveAborto, controladorAborto);

    console.log('[ReadForMe][Background] Processando SINTETIZAR_SENTENCA:', {
      idAba,
      idSessaoLeitura,
      indiceSentenca,
      nomeVoz,
      idRequisicao
    });

    if (indiceSentenca === 0) {
      this.clienteEdgeTts.resetarCircuito();
    }

    try {
      const resultado = await this.clienteEdgeTts.sintetizarSentenca({
        textoSentenca,
        nomeVoz,
        sinalAborto: controladorAborto.signal
      });

      if (controladorAborto.signal.aborted) {
        return;
      }

      this.enviarMensagemSeguraNaPorta(portaConectada, {
        tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO,
        payload: {
          idRequisicao,
          idSessaoLeitura,
          indiceSentenca,
          nomeVoz,
          audioBase64: resultado.audioBase64,
          limitesPalavras: resultado.limitesPalavras,
          logsDiagnostico: resultado.logsDiagnostico || []
        }
      });
    } catch (erroSintese) {
      if (controladorAborto.signal.aborted) {
        return;
      }
      const motivoErro =
        erroSintese instanceof Error
          ? erroSintese.message
          : 'Erro ao sintetizar sentença no Edge TTS.';
      console.error(
        `[ReadForMe][Background] Falha na síntese da sentença #${indiceSentenca} (voz=${nomeVoz}):`,
        motivoErro
      );
      this.enviarMensagemSeguraNaPorta(portaConectada, {
        tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE_USAR_FALLBACK,
        payload: {
          idRequisicao,
          idSessaoLeitura,
          indiceSentenca,
          nomeVoz,
          motivoErro,
          logsDiagnostico: (erroSintese && erroSintese.logsDiagnostico) || []
        }
      });
    } finally {
      this.controladoresAbortoPorChave.delete(chaveAborto);
    }
  }

  /**
   * Cancela todas as sínteses em andamento para uma aba ou sessão específica.
   * @param {number|string} idAba
   * @param {string} [idSessaoFiltro]
   * @returns {void}
   */
  cancelarRequisicoesDaAba(idAba, idSessaoFiltro) {
    const prefixoBusca = idSessaoFiltro
      ? `${idAba}:${idSessaoFiltro}:`
      : `${idAba}:`;

    for (const [chave, controlador] of this.controladoresAbortoPorChave.entries()) {
      if (chave.startsWith(prefixoBusca)) {
        controlador.abort();
        this.controladoresAbortoPorChave.delete(chave);
      }
    }
  }

  /**
   * Envia mensagem pela porta protegendo contra desconexões concorrentes.
   * @param {chrome.runtime.Port} portaConectada
   * @param {Object} mensagem
   * @returns {void}
   */
  enviarMensagemSeguraNaPorta(portaConectada, mensagem) {
    try {
      portaConectada.postMessage(mensagem);
    } catch {
      // A porta foi desconectada pelo Content Script; descartar silenciosamente
    }
  }
}

const instanciaControladorBackground = new ControladorBackground();
instanciaControladorBackground.inicializar();
globalThis.ReadForMe.controladorBackground = instanciaControladorBackground;

