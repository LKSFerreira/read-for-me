import '../shared/constantes_sistema.js';
import { ClienteWebSocketEdgeTts } from './cliente_websocket_edge_tts.js';
import { ServicoCatalogoVozes } from './servico_catalogo_vozes.js';

const { CONSTANTES_SISTEMA } = globalThis.ReadForMe;

/**
 * Controlador principal do Service Worker (Manifest V3).
 * Coordena menu de contexto, atalhos globais, canal persistente Keep-Alive e síntese de áudio.
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

    chrome.runtime.onInstalled.addListener(() => {
      this.registrarMenuContexto();
    });

    if (chrome.contextMenus && chrome.contextMenus.onClicked) {
      chrome.contextMenus.onClicked.addListener((infoClique, abaAlvo) => {
        if (
          infoClique.menuItemId === CONSTANTES_SISTEMA.ID_MENU_CONTEXTO &&
          abaAlvo &&
          typeof abaAlvo.id === 'number'
        ) {
          chrome.tabs
            .sendMessage(abaAlvo.id, {
              tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.INICIAR_LEITURA_MENU
            })
            .catch(() => {
              // Ignora erro caso a aba não suporte content scripts (ex.: páginas chrome://)
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
            enviarResposta({ sucesso: true, vozes: catalogoVozes });
          })
          .catch(() => {
            enviarResposta({
              sucesso: true,
              vozes: [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO]
            });
          });
        return true;
      }

      return false;
    });
  }

  /**
   * Cria ou recria o item "Ler seleção" no menu de contexto de seleção de texto.
   * @returns {void}
   */
  registrarMenuContexto() {
    if (!chrome.contextMenus) {
      return;
    }
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CONSTANTES_SISTEMA.ID_MENU_CONTEXTO,
        title: 'Ler seleção',
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
          audioBase64: resultado.audioBase64,
          limitesPalavras: resultado.limitesPalavras
        }
      });
    } catch (erroSintese) {
      if (controladorAborto.signal.aborted) {
        return;
      }
      this.enviarMensagemSeguraNaPorta(portaConectada, {
        tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.FALHA_SINTESE_USAR_FALLBACK,
        payload: {
          idRequisicao,
          idSessaoLeitura,
          indiceSentenca,
          motivoErro:
            erroSintese instanceof Error
              ? erroSintese.message
              : 'Erro ao sintetizar sentença no Edge TTS.'
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
