import '../shared/constantes_sistema.js';
import '../shared/utilitarios_texto.js';
import { ClienteWebSocketEdgeTts } from '../background/cliente_websocket_edge_tts.js';

const clienteLocalOffscreen = new ClienteWebSocketEdgeTts();
const controladoresAbortoOffscreen = new Map();

console.log('[ReadForMe][Offscreen] Documento Offscreen de síntese WebSocket inicializado.');

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((mensagem, _remetente, responder) => {
    if (!mensagem || typeof mensagem.tipoMensagem !== 'string') {
      return false;
    }

    if (mensagem.tipoMensagem === 'PING_OFFSCREEN_TTS') {
      responder({ pronto: true });
      return false;
    }

    if (mensagem.tipoMensagem === 'ABORTAR_TRANSACAO_OFFSCREEN_TTS') {
      const idTransacao = mensagem.payload && mensagem.payload.idTransacaoOffscreen;
      const controlador = controladoresAbortoOffscreen.get(idTransacao);
      if (controlador) {
        controlador.abort();
        controladoresAbortoOffscreen.delete(idTransacao);
      }
      responder({ cancelado: true });
      return false;
    }

    if (mensagem.tipoMensagem === 'EXECUTAR_TRANSACAO_OFFSCREEN_TTS') {
      const { idTransacaoOffscreen, textoSentenca, nomeVoz } = mensagem.payload || {};
      const controladorAborto = new AbortController();
      if (idTransacaoOffscreen) {
        controladoresAbortoOffscreen.set(idTransacaoOffscreen, controladorAborto);
      }

      const logsOffscreen = [];
      const registrarLogOffscreen = (nivel, msg, detalhes) => {
        const textoDetalhes =
          detalhes !== undefined
            ? ` | ${typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes)}`
            : '';
        const linha = `[Offscreen][${nivel}] ${msg}${textoDetalhes}`;
        logsOffscreen.push(linha);
        if (nivel === 'erro') {
          console.error('[ReadForMe]' + linha);
        } else {
          console.log('[ReadForMe]' + linha);
        }
      };

      clienteLocalOffscreen
        .executarTransacaoWebSocketDireta({
          textoSentenca,
          nomeVoz,
          sinalAborto: controladorAborto.signal,
          registrarLog: registrarLogOffscreen
        })
        .then((resultado) => {
          responder({
            sucesso: true,
            audioBase64: resultado.audioBase64,
            limitesPalavras: resultado.limitesPalavras,
            logsOffscreen
          });
        })
        .catch((erro) => {
          responder({
            sucesso: false,
            erro: erro instanceof Error ? erro.message : String(erro),
            logsOffscreen
          });
        })
        .finally(() => {
          if (idTransacaoOffscreen) {
            controladoresAbortoOffscreen.delete(idTransacaoOffscreen);
          }
        });

      return true;
    }

    return false;
  });
}
