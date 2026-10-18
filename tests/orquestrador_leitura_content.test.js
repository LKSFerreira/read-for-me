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

const {
  CONSTANTES_SISTEMA,
  OrquestradorLeituraContent,
  MiniPlayerFlutuante
} = globalThis.ReadForMe;

describe('OrquestradorLeituraContent — Leitura Contínua, Limpeza de Seleção, Player Opcional, Arraste e Reidratação', () => {
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

  it('deve desfazer a seleção nativa da página ao iniciar a leitura e manter o Mini-Player oculto por padrão', async () => {
    globalThis.chrome = {
      runtime: {
        connect: () => ({
          onMessage: { addListener: () => {} },
          onDisconnect: { addListener: () => {} },
          postMessage: () => {}
        })
      }
    };

    const miniPlayerMock = {
      exibir: vi.fn(),
      ocultar: vi.fn(),
      atualizarEstadoVisual: vi.fn(),
      possuiFocoInterno: vi.fn(() => false)
    };

    const orquestrador = new OrquestradorLeituraContent({
      miniPlayer: miniPlayerMock,
      repositorioConfiguracao: {
        carregarConfiguracaoCompleta: async () => ({
          vozSelecionada: 'pt-BR-FranciscaNeural',
          velocidadeReproducao: 1.0,
          idiomaFiltro: 'TODOS',
          posicaoMiniPlayer: null,
          modoPrivacidadeVoz: CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.SOMENTE_LOCAL,
          exibirMiniPlayerFlutuante: false,
          exibirBotaoFlutuanteSelecao: true,
          modoLeituraContinua: true,
          estiloHighlight: { ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO }
        })
      },
      motorFallback: {
        reproduzirSentencaFallback: vi.fn(async () => {}),
        definirVelocidade: vi.fn(),
        pausar: vi.fn(),
        retomar: vi.fn(),
        pararELimpar: vi.fn()
      }
    });

    expect(window.getSelection().rangeCount).toBe(1);
    await orquestrador.iniciarLeituraDaSelecaoAtual();

    // A seleção nativa azul deve ter sido desfeita para não contaminar os highlights
    expect(window.getSelection().rangeCount).toBe(0);
    // O Mini-Player não deve ser exibido quando exibirMiniPlayerFlutuante = false
    expect(miniPlayerMock.exibir).not.toHaveBeenCalled();
    orquestrador.encerrarLeituraCompleta();
  });

  it('deve permitir arrastar o MiniPlayerFlutuante clicando em qualquer área livre do container durante a leitura', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    const posicoesSalvas = [];
    const player = new MiniPlayerFlutuante(shadow, {
      aoAlternarPlayPause: () => {},
      aoPararLeitura: () => {},
      aoVoltarSentenca: () => {},
      aoAvancarSentenca: () => {},
      aoAlterarVelocidade: () => {},
      aoAlterarVoz: () => {},
      aoAlterarFiltroIdioma: () => {},
      aoSalvarPosicao: (pos) => posicoesSalvas.push(pos),
      aoDefinirModoPrivacidade: () => {}
    });

    player.exibir({});
    vi.spyOn(player.elementoContainer, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 400,
      height: 140
    });

    // Clica no rodapé do player (fora do cabeçalho, mas em área não-interativa) e arrasta no window
    const rodape = player.elementoContainer.querySelector('.rodape-atalhos');
    rodape.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 120,
        clientY: 120,
        button: 0
      })
    );

    expect(player.elementoContainer.getAttribute('data-arrastando')).toBe('true');

    window.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 250,
        clientY: 260
      })
    );

    expect(player.elementoContainer.style.left).toBe('230px');
    expect(player.elementoContainer.style.top).toBe('240px');

    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(player.elementoContainer.getAttribute('data-arrastando')).toBeNull();
    expect(posicoesSalvas).toHaveLength(1);
  });

  it('deve inicializar no topo por padrão, respeitar posição salva e acionar callbacks de ocultar e configurações', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });

    let configuracoesAbertas = false;
    let playerOcultado = false;

    const player = new MiniPlayerFlutuante(shadow, {
      aoAlternarPlayPause: () => {},
      aoPararLeitura: () => {},
      aoVoltarSentenca: () => {},
      aoAvancarSentenca: () => {},
      aoAlterarVelocidade: () => {},
      aoSalvarPosicao: () => {},
      aoOcultarPlayerNaPagina: () => {
        playerOcultado = true;
      },
      aoAbrirConfiguracoes: () => {
        configuracoesAbertas = true;
      }
    });

    // 1. Sem posição salva prévia: deve inicializar no topo (top: 20px)
    player.exibir({});
    expect(player.elementoContainer.style.top).toBe('20px');
    expect(player.elementoContainer.style.bottom).toBe('auto');

    // 2. Não deve conter controles de seleção de vozes no mini player
    expect(player.elementoContainer.querySelector('[data-controle="seletor-voz"]')).toBeNull();
    expect(player.elementoContainer.querySelector('[data-acao="previa-voz"]')).toBeNull();

    // 3. Botão de configurações deve chamar aoAbrirConfiguracoes
    const botaoConfig = player.elementoContainer.querySelector('[data-acao="abrir-configuracoes"]');
    expect(botaoConfig).not.toBeNull();
    botaoConfig.click();
    expect(configuracoesAbertas).toBe(true);

    // 4. Botão de ocultar deve esconder o player e chamar aoOcultarPlayerNaPagina
    const botaoOcultar = player.elementoContainer.querySelector('[data-acao="ocultar-player"]');
    expect(botaoOcultar).not.toBeNull();
    botaoOcultar.click();
    expect(player.elementoContainer.hidden).toBe(true);
    expect(playerOcultado).toBe(true);

    // 5. Com posição salva prévia: deve posicionar nas coordenadas persistidas
    player.exibir({
      posicaoMiniPlayer: { x: 210, y: 75 }
    });
    expect(player.elementoContainer.style.left).toBe('210px');
    expect(player.elementoContainer.style.top).toBe('75px');
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
        modoPrivacidadeVoz: CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO,
        exibirMiniPlayerFlutuante: false,
        exibirBotaoFlutuanteSelecao: true,
        modoLeituraContinua: true,
        estiloHighlight: { ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO }
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
        aplicarEstiloPersonalizado: vi.fn(),
        destacarSentenca: vi.fn(),
        destacarPalavra: vi.fn(),
        limparDestaquePalavra: vi.fn(),
        limparTodosOsDestaques: vi.fn()
      }
    });

    const promessaInicio = orquestrador.iniciarLeituraDaSelecaoAtual();
    await new Promise((r) => setTimeout(r, 10));

    const pedidosSinteseIniciais = mensagensPostadasNaPorta.filter(
      (m) => m.tipoMensagem === CONSTANTES_SISTEMA.TIPOS_MENSAGEM.SINTETIZAR_SENTENCA
    );
    expect(pedidosSinteseIniciais.map((p) => p.payload.indiceSentenca)).toEqual([0, 1, 2]);

    const idSessaoAntiga = pedidosSinteseIniciais[0].payload.idSessaoLeitura;
    const reqZeroSessaoAntiga = pedidosSinteseIniciais[0].payload.idRequisicao;

    const promessaTrocaVoz = orquestrador.alterarVozDuranteLeitura('pt-BR-AntonioNeural');
    await new Promise((r) => setTimeout(r, 5));

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

    expect(pacotesTocandoNoPlayer).toHaveLength(0);

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
          modoPrivacidadeVoz: CONSTANTES_SISTEMA.MODOS_PRIVACIDADE_VOZ.REMOTO_AUTORIZADO,
          exibirMiniPlayerFlutuante: false,
          exibirBotaoFlutuanteSelecao: true,
          modoLeituraContinua: true,
          estiloHighlight: { ...CONSTANTES_SISTEMA.ESTILO_HIGHLIGHT_PADRAO }
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
        aplicarEstiloPersonalizado: vi.fn(),
        destacarSentenca: vi.fn(),
        destacarPalavra: vi.fn(),
        limparDestaquePalavra: vi.fn(),
        limparTodosOsDestaques: vi.fn()
      }
    });

    const promessaLeitura = orquestrador.iniciarLeituraDaSelecaoAtual();
    await vi.advanceTimersByTimeAsync(1);

    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(250);

    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(500);

    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await vi.advanceTimersByTimeAsync(1000);

    ouvintesDesconexao[ouvintesDesconexao.length - 1]();
    await promessaLeitura;

    expect(atrasosAgendados).toEqual([250, 500, 1000]);
    expect(orquestrador.usandoFallbackLocal).toBe(true);
    expect(orquestrador.requisicoesPendentesPorta.size).toBe(0);
    expect(frasesTocadasNoFallback).toEqual(['Frase zero inicial.']);
    orquestrador.encerrarLeituraCompleta();
  });

  it('deve selecionar vozes distintas ao alternar entre Francisca, Antonio e Thalita no MotorFallbackWebSpeech', () => {
    const { MotorFallbackWebSpeech } = globalThis.ReadForMe;
    const vozesDisponiveisNoNavegador = [
      {
        name: 'Microsoft Francisca Online (Natural) - Portuguese (Brazil)',
        lang: 'pt-BR',
        default: true
      },
      {
        name: 'Microsoft Antonio Online (Natural) - Portuguese (Brazil)',
        lang: 'pt-BR',
        default: false
      },
      {
        name: 'Microsoft Thalita Online (Natural) - Portuguese (Brazil)',
        lang: 'pt-BR',
        default: false
      }
    ];

    const escolhaFrancisca = MotorFallbackWebSpeech.selecionarMelhorVozEquivalente(
      vozesDisponiveisNoNavegador,
      'pt-BR-FranciscaNeural'
    );
    const escolhaAntonio = MotorFallbackWebSpeech.selecionarMelhorVozEquivalente(
      vozesDisponiveisNoNavegador,
      'pt-BR-AntonioNeural'
    );
    const escolhaThalita = MotorFallbackWebSpeech.selecionarMelhorVozEquivalente(
      vozesDisponiveisNoNavegador,
      'pt-BR-ThalitaMultilingualNeural'
    );

    expect(escolhaFrancisca.vozEscolhida.name).toContain('Francisca');
    expect(escolhaAntonio.vozEscolhida.name).toContain('Antonio');
    expect(escolhaThalita.vozEscolhida.name).toContain('Thalita');
  });
});

