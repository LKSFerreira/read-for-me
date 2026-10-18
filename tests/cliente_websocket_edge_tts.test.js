import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClienteWebSocketEdgeTts } from '../src/background/cliente_websocket_edge_tts.js';

/**
 * Constrói um frame binário simulado do Edge TTS contendo cabeçalho ASCII Big-Endian (2 bytes) + payload MP3.
 * @param {string} cabecalhoAscii
 * @param {Uint8Array} bytesAudio
 * @returns {ArrayBuffer}
 */
function criarFrameBinarioAudio(cabecalhoAscii, bytesAudio) {
  const bytesCabecalho = new TextEncoder().encode(cabecalhoAscii);
  const bufferTotal = new ArrayBuffer(2 + bytesCabecalho.length + bytesAudio.length);
  const visao = new DataView(bufferTotal);
  visao.setUint16(0, bytesCabecalho.length, false);
  new Uint8Array(bufferTotal, 2, bytesCabecalho.length).set(bytesCabecalho);
  new Uint8Array(bufferTotal, 2 + bytesCabecalho.length).set(bytesAudio);
  return bufferTotal;
}

describe('ClienteWebSocketEdgeTts — Demultiplexação de Frames, Circuit Breaker e Cancelamento', () => {
  let WebSocketOriginal;

  beforeEach(() => {
    WebSocketOriginal = globalThis.WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = WebSocketOriginal;
  });

  it('deve sintetizar sentença extraindo chunks MP3 binários e metadados WordBoundary alinhados', async () => {
    globalThis.WebSocket = class WebSocketSimulado {
      static OPEN = 1;
      static CONNECTING = 0;

      constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.mensagensEnviadas = [];
        setTimeout(() => {
          if (this.onopen) {
            this.onopen();
          }
        }, 5);
      }

      send(dados) {
        this.mensagensEnviadas.push(dados);
        if (String(dados).includes('Path:ssml')) {
          setTimeout(() => {
            if (!this.onmessage) {
              return;
            }
            const quadroMetadados =
              'Path:audio.metadata\r\nContent-Type:application/json\r\n\r\n' +
              JSON.stringify({
                Metadata: [
                  {
                    Type: 'WordBoundary',
                    Data: {
                      Offset: 500000,
                      Duration: 2000000,
                      text: { Text: 'Olá', Length: 3, BoundaryType: 'WordBoundary' }
                    }
                  },
                  {
                    Type: 'WordBoundary',
                    Data: {
                      Offset: 3000000,
                      Duration: 3500000,
                      text: { Text: 'mundo', Length: 5, BoundaryType: 'WordBoundary' }
                    }
                  }
                ]
              });
            this.onmessage({ data: quadroMetadados });

            const frameMp3 = criarFrameBinarioAudio(
              'Path:audio\r\nContent-Type:audio/mpeg\r\n',
              new Uint8Array([0xff, 0xfb, 0x90, 0x64])
            );
            this.onmessage({ data: frameMp3 });
            this.onmessage({ data: 'Path:turn.end\r\n\r\n' });
          }, 5);
        }
      }

      close() {
        this.readyState = 3;
      }
    };

    let urlCapturadaNoHandshake = '';
    const ConstrutorAnterior = globalThis.WebSocket;
    globalThis.WebSocket = class WebSocketComCaptura extends ConstrutorAnterior {
      constructor(url) {
        super(url);
        urlCapturadaNoHandshake = url;
      }
    };

    const cliente = new ClienteWebSocketEdgeTts();
    const resultado = await cliente.sintetizarSentenca({
      textoSentenca: 'Olá mundo!',
      nomeVoz: 'pt-BR-FranciscaNeural'
    });

    expect(urlCapturadaNoHandshake).toContain('Sec-MS-GEC-Version=2-143.0.3650.75');
    expect(urlCapturadaNoHandshake).toMatch(/Sec-MS-GEC=[0-9A-F]{16}-[0-9A-F]{64}/);
    expect(resultado.audioBase64).toBeTruthy();
    expect(resultado.limitesPalavras).toEqual([
      {
        tempoInicioSegundos: 0.05,
        duracaoSegundos: 0.2,
        textoPalavra: 'Olá',
        indiceInicialCaractere: 0,
        comprimentoPalavra: 3
      },
      {
        tempoInicioSegundos: 0.3,
        duracaoSegundos: 0.35,
        textoPalavra: 'mundo',
        indiceInicialCaractere: 4,
        comprimentoPalavra: 5
      }
    ]);
  });

  it('deve abrir o Circuit Breaker após 2 falhas consecutivas de conexão WebSocket', async () => {
    let conexoesTentadas = 0;
    globalThis.WebSocket = class WebSocketComFalha {
      static OPEN = 1;
      static CONNECTING = 0;

      constructor() {
        conexoesTentadas += 1;
        this.readyState = 0;
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Error('Falha simulada de rede'));
          }
        }, 2);
      }

      close() {}
    };

    const cliente = new ClienteWebSocketEdgeTts();

    // 1ª chamada falha após 2 tentativas internas (MAXIMO_TENTATIVAS_WS = 2)
    await expect(
      cliente.sintetizarSentenca({
        textoSentenca: 'Primeira frase.',
        nomeVoz: 'pt-BR-FranciscaNeural'
      })
    ).rejects.toThrow();

    // 2ª chamada falha após 2 tentativas internas e atinge o limite do Circuit Breaker
    await expect(
      cliente.sintetizarSentenca({
        textoSentenca: 'Segunda frase.',
        nomeVoz: 'pt-BR-FranciscaNeural'
      })
    ).rejects.toThrow();

    expect(cliente.estaComCircuitoAberto()).toBe(true);
    const conexoesAntesDoCircuitoAberto = conexoesTentadas;

    // 3ª chamada deve falhar imediatamente no Circuit Breaker sem abrir novo WebSocket
    await expect(
      cliente.sintetizarSentenca({
        textoSentenca: 'Terceira frase bloqueada pelo disjuntor.',
        nomeVoz: 'pt-BR-FranciscaNeural'
      })
    ).rejects.toThrow(/Circuito do Edge TTS temporariamente aberto/);

    expect(conexoesTentadas).toBe(conexoesAntesDoCircuitoAberto);
  });

  it('deve cancelar imediatamente a transação quando o AbortController for acionado', async () => {
    globalThis.WebSocket = class WebSocketLento {
      static OPEN = 1;
      static CONNECTING = 0;

      constructor() {
        this.readyState = 1;
        this.foiFechado = false;
      }

      send() {}

      close() {
        this.foiFechado = true;
      }
    };

    const cliente = new ClienteWebSocketEdgeTts();
    const controladorAborto = new AbortController();

    setTimeout(() => controladorAborto.abort(), 10);

    await expect(
      cliente.sintetizarSentenca({
        textoSentenca: 'Texto que será abortado.',
        nomeVoz: 'pt-BR-FranciscaNeural',
        sinalAborto: controladorAborto.signal
      })
    ).rejects.toThrow(/abortad/i);
  });
});
