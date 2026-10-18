// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/shared/constantes_sistema.js';
import '../src/shared/utilitarios_texto.js';
import '../src/content/configuracao/repositorio_configuracao.js';
import '../src/content/dom/segmentador_sentencas.js';
import '../src/content/dom/mapeador_selecao_dom.js';
import '../src/content/destaque/gerenciador_highlight.js';
import '../src/content/audio/reprodutor_audio_buffer.js';
import '../src/content/audio/motor_fallback_web_speech.js';
import '../src/content/ui/estilos_shadow_ui.js';
import '../src/content/ui/botao_flutuante_selecao.js';
import '../src/content/ui/mini_player_flutuante.js';
import '../src/content/atalhos/gerenciador_atalhos_teclado.js';
import '../src/content/orquestrador_leitura_content.js';

const { CONSTANTES_SISTEMA, OrquestradorLeituraContent } = globalThis.ReadForMe;

describe('OrquestradorLeituraContent — Pre-fetching N+1/N+2, Descarte de Sessão Antiga e Reidratação [250, 500, 1000]ms', () => {
  let chromeOriginal;

  beforeEach(() => {
    chromeOriginal = globalThis.chrome;
    document.body.innerHTML =
      '<article id="artigo"><p>Frase zero inicial. Frase um seguinte. Frase dois final.</p></article>';

    const range = document.createRange();
    range.selectNodeContents(document.getElementById('artigo'));
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);
  });

  afterEach(() => {
    globalThis.chrome = chromeOriginal;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('deve disparar pre-fetching concorrente (0, 1, 2), aguardar N+1 atrasado e descartar respostas de sessão antiga ao trocar de voz', async () => {
    const mensagensPostadasNaPorta = [];
    let ouvinteMensagemPorta = null;

    globalThis.chrome = {
      runtime: {
        connect: () => ({
          onMessage: {
            addListener: (cb) => {
              ouvinteMensagemPorta = cb;
            }
          },
          onDisconnect: {
            addListener: () => {}
          },
          postMessage: (msg) => {
            mensagensPostadasNaPorta.push(msg);
          }
        })
      }
    };

    const pacotesTocandoNoPlayer = [];
    const reprodutorMock = {
      reproduzirPacote: vi.fn(async (pacote) => {
        pacotesTocandoNoPlayer.push(pacote);
      }),
      definirVelocidade: vi.fn(),
      pausar: vi.fn(),
      retomar: vi.fn(),
      pararELimpar: vi.fn()
    };

    const repositorioMock = {
      carregarConfiguracaoCompleta: vi.fn(async () => ({
        vozSelecionada: 'pt-BR-FranciscaNeural',
        velocidadeReproducao: 1.0,
        idiomaFiltro: 'TODOS',
        posicaoMiniPlayer: null,
        modoPrivacidadeVoz: CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO
      })),
      salvarVozSelecionada: vi.fn(async () => {}),
      salvarVelocidadeReproducao: vi.fn(async () => {}),
      salvarIdiomaFiltro: vi.fn(async () => {}),
      salvarPosicaoMiniPlayer: vi.fn(async () => {}),
      salvarModoPrivacidadeVoz: vi.fn(async () => {})
    };

    const orquestrador = new OrquestradorLeituraContent({
      repositorioConfiguracao: repositorioMock,
      reprodutorAudio: reprodutorMock,
      gerenciadorHighlight: {
        destacarSentenca: vi.fn(),
        destacarPalavra: vi.fn(),
        limparDestaquePalavra: vi.fn(),
        limparTodosOsDestaques: vi.fn()
      }
    });

    const promessaInicio = orquestrador.iniciarLeituraDaSelecaoAtual();
    await new Promise((r) => setTimeout(r, 10));

    // Confirma que N=0, N+1=1 e N+2=2 foram solicitadas concorrentemente
    const pedidosSinteseIniciais = mensagensPostadasNaPorta.filter(
      (m) => m.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.SINTETIZAR_SENTENCA
    );
    expect(pedidosSinteseIniciais.map((p) => p.payload.indiceSentenca)).toEqual([0, 1, 2]);

    const idSessaoAntiga = pedidosSinteseIniciais[0].payload.idSessaoLeitura;
    const reqZeroSessaoAntiga = pedidosSinteseIniciais[0].payload.idRequisicao;

    // Usuário troca a voz antes da resposta de S0 chegar
    const promessaTrocaVoz = orquestrador.alterarVozDuranteLeitura('pt-BR-AntonioNeural');
    await new Promise((r) => setTimeout(r, 5));

    // Agora chega uma resposta atrasada da sessão antiga (FranciscaNeural)
    ouvinteMensagemPorta({
      tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO,
      payload: {
        idRequisicao: reqZeroSessaoAntiga,
        idSessaoLeitura: idSessaoAntiga,
        indiceSentenca: 0,
        audioBase64: 'AUDIO_OBSOLETO_SESSAO_ANTIGA',
        limitesPalavras: []
      }
    });

    // Nenhuma resposta da sessão antiga pode chegar ao reprodutor
    expect(pacotesTocandoNoPlayer).toHaveLength(0);

    // Envia a resposta da nova sessão (AntonioNeural)
    const pedidosNovaSessao = mensagensPostadasNaPorta.filter(
      (m) =>
        m.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.SINTETIZAR_SENTENCA &&
        m.payload.idSessaoLeitura === orquestrador.idSessaoLeitura &&
        m.payload.indiceSentenca === 0
    );
    expect(pedidosNovaSessao).toHaveLength(1);

    ouvinteMensagemPorta({
      tipoMensagem: CONSTANTES_SISTEMA.TIPOS_MENSAGEM.PACOTE_AUDIO_PRONTO,
      payload: {
        idRequisicao: pedidosNovaSessao[0].payload.idRequisicao,
        idSessaoLeitura: orquestrador.idSessaoLeitura,
        indiceSentenca: 0,
        audioBase64: 'AUDIO_VALIDO_NOVA_SESSAO',
        limitesPalavras: []
      }
    });

    await promessaInicio;
    await promessaTrocaVoz;

    expect(pacotesTocandoNoPlayer).toHaveLength(1);
    expect(pacotesTocandoNoPlayer[0].audioBase64).toBe('AUDIO_VALIDO_NOVA_SESSAO');
    orquestrador.encerrarLeituraCompleta();
  });

  it('deve executar reidratação com atrasos [250, 500, 1000]ms após 3 desconexões consecutivas e acionar fallback local sem promise pendente', async () => {
    vi.useFakeTimers();

    const ouvintesDesconexao = [];
    const atrasosAgendados = [];
    const setTimeoutOriginal = globalThis.setTimeout;

    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay, ...args) => {
      if (delay === 250 || delay === 500 || delay === 1000) {
        atrasosAgendados.push(delay);
      }
      return setTimeoutOriginal(fn, delay, ...args);
    });

    globalThis.chrome = {
      runtime: {
        connect: () => ({
          onMessage: { addListener: () => {} },
          onDisconnect: {
            addListener: (cb) => {
              ouvintesDesconexao.push(cb);
            }
          },
          postMessage: () => {}
        })
      }
    };

    const frasesTocadasNoFallback = [];
    const motorFallbackMock = {
      reproduzirSentencaFallback: vi.fn(async (texto) => {
        frasesTocadasNoFallback.push(texto);
      }),
      definirVelocidade: vi.fn(),
      pausar: vi.fn(),
      retomar: vi.fn(),
      pararELimpar: vi.fn()
    };

    const orquestrador = new OrquestradorLeituraContent({
      repositorioConfiguracao: {
        carregarConfiguracaoCompleta: async () => ({
          vozSelecionada: 'pt-BR-FranciscaNeural',
          velocidadeReproducao: 1.0,
          idiomaFiltro: 'TODOS',
          posicaoMiniPlayer: null,
          modoPrivacidadeVoz: CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO
        })
      },
      reprodutorAudio: {
        reproduzirPacote: vi.fn(),
        definirVelocidade: vi.fn(),
        pausar: vi.fn(),
        retomar: vi.fn(),
        pararELimpar: vi.fn()
      },
      motorFallback: motorFallbackMock,
      gerenciadorHighlight: {
        destacarSentenca: vi.fn(),
        destacarPalavra: vi.fn(),
        limparDestaquePalavra: vi.fn(),
        limparTodosOsDestaques: vi.fn()
      }
    });

    const promessaLeitura = orquestrador.iniciarLeituraDaSelecaoAtual();
    await vi.advanceTimersByTimeAsync(1);

    // 1ª desconexão -> agenda reconexão em 250ms
    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(250);

    // 2ª desconexão (sem que a porta tenha recebido confirmação válida) -> agenda em 500ms
    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(500);

    // 3ª desconexão -> agenda em 1000ms
    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(1000);

    // 4ª desconexão após esgotar [250, 500, 1000] -> aciona fallback local imediatamente
    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await promessaLeitura;

    expect(atrasosAgendados).toEqual([250, 500, 1000]);
    expect(orquestrador.usandoFallbackLocal).toBe(true);
    expect(orquestrador.requisicoesPendentesPorta.size).toBe(0);
    expect(frasesTocadasNoFallback).toEqual(['Frase zero inicial.']);
    orquestrador.encerrarLeituraCompleta();
  });
});
