/**
 * Constantes imutáveis compartilhadas entre o Service Worker (Manifest V3),
 * os Content Scripts (Isolated World), o Popup de Configurações e a suíte de testes.
 */
(function inicializarConstantesSistema(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const ESTILO_HIGHLIGHT_PADRAO = Object.freeze({
    temaPreset: 'ardosia-suave',
    destacarFrase: true,
    corFrase: '#64748b',
    opacidadeFrase: 0.16,
    destacarPalavra: true,
    corFundoPalavra: '#e2e8f0',
    corTextoPalavra: '#0f172a',
    sublinharPalavra: true
  });

  const PRESETS_HIGHLIGHT = Object.freeze({
    'ardosia-suave': Object.freeze({
      nomeExibicao: 'Ardósia Neutro',
      destacarFrase: true,
      corFrase: '#64748b',
      opacidadeFrase: 0.16,
      destacarPalavra: true,
      corFundoPalavra: '#e2e8f0',
      corTextoPalavra: '#0f172a',
      sublinharPalavra: true
    }),
    'azul-sereno': Object.freeze({
      nomeExibicao: 'Azul Sereno',
      destacarFrase: true,
      corFrase: '#3b82f6',
      opacidadeFrase: 0.14,
      destacarPalavra: true,
      corFundoPalavra: '#dbeafe',
      corTextoPalavra: '#1e3a8a',
      sublinharPalavra: true
    }),
    'salvia-leitura': Object.freeze({
      nomeExibicao: 'Sálvia Leitura',
      destacarFrase: true,
      corFrase: '#10b981',
      opacidadeFrase: 0.14,
      destacarPalavra: true,
      corFundoPalavra: '#d1fae5',
      corTextoPalavra: '#064e3b',
      sublinharPalavra: false
    }),
    'foco-sublinhado': Object.freeze({
      nomeExibicao: 'Apenas Sublinhado',
      destacarFrase: false,
      corFrase: '#64748b',
      opacidadeFrase: 0.1,
      destacarPalavra: true,
      corFundoPalavra: 'transparent',
      corTextoPalavra: 'inherit',
      sublinharPalavra: true
    })
  });

  const CONSTANTES_SISTEMA = Object.freeze({
    ID_MENU_CONTEXTO: 'read-for-me-ler-a-partir-daqui',
    ID_MENU_LER_A_PARTIR_DAQUI: 'read-for-me-ler-a-partir-daqui',
    ID_MENU_LER_SELECAO_EXATA: 'read-for-me-ler-selecao-exata',
    ID_HOST_SHADOW_DOM: 'read-for-me-host-raiz',
    ID_ESTILO_HIGHLIGHT_DINAMICO: 'read-for-me-estilos-highlight-dinamicos',
    ID_REGRA_DNR_EDGE_TTS: 1001,
    NOME_PORTA_KEEP_ALIVE: 'read-for-me-canal-sintese-voz',
    INTERVALO_HEARTBEAT_MS: 20000,
    TIMEOUT_CONEXAO_WS_MS: 10000,
    MAXIMO_TENTATIVAS_WS: 2,
    ATRASOS_RECONEXAO_PORTA_MS: Object.freeze([250, 500, 1000]),
    JANELA_PREFETCH_SENTENCAS: 2,
    DURACAO_CIRCUITO_ABERTO_MS: 60000,
    VALIDADE_CACHE_VOZES_MS: 86400000,
    COMPRIMENTO_MAXIMO_SENTENCA: 280,
    TOKEN_CLIENTE_CONFIAVEL_EDGE: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    ORIGIN_EXTENSAO_EDGE_TTS: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    USER_AGENT_EDGE_SIMULADO:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
    VERSAO_CHROMIUM_SIMULADA: '143.0.3650.75',
    VERSAO_FULL_SEC_MS_GEC: '143.0.3650.75',
    VERSAO_SEC_MS_GEC: '2-143.0.3650.75',
    URL_LISTA_VOZES_EDGE:
      'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    URL_BASE_WEBSOCKET_EDGE:
      'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
    FORMATO_SAIDA_AUDIO: 'audio-24khz-48kbitrate-mono-mp3',
    NOMES_HIGHLIGHT: Object.freeze({
      FRASE_ATIVA: 'leitura-frase-ativa',
      PALAVRA_ATIVA: 'leitura-palavra-ativa'
    }),
    CHAVES_STORAGE: Object.freeze({
      VOZ_SELECIONADA: 'readForMe_vozSelecionada',
      VELOCIDADE_REPRODUCAO: 'readForMe_velocidadeReproducao',
      IDIOMA_FILTRO: 'readForMe_idiomaFiltro',
      POSICAO_MINI_PLAYER: 'readForMe_posicaoMiniPlayer',
      CACHE_CATALOGO_VOZES: 'readForMe_cacheCatalogoVozes',
      MODO_PRIVACIDADE_VOZ: 'readForMe_modoPrivacidadeVoz',
      EXIBIR_MINI_PLAYER_FLUTUANTE: 'readForMe_exibirMiniPlayerFlutuante',
      EXIBIR_BOTAO_FLUTUANTE_SELECAO: 'readForMe_exibirBotaoFlutuanteSelecao',
      MODO_LEITURA_CONTINUA: 'readForMe_modoLeituraContinua',
      ESTILO_HIGHLIGHT: 'readForMe_estiloHighlight'
    }),
    MODOS_PRIVACIDADE_VOZ: Object.freeze({
      NAO_DEFINIDO: 'NAO_DEFINIDO',
      REMOTO_AUTORIZADO: 'REMOTO_AUTORIZADO',
      SOMENTE_LOCAL: 'SOMENTE_LOCAL'
    }),
    VALORES_PADRAO: Object.freeze({
      VOZ_SELECIONADA: 'pt-BR-FranciscaNeural',
      VELOCIDADE_REPRODUCAO: 1.0,
      IDIOMA_FILTRO: 'TODOS',
      MODO_PRIVACIDADE_VOZ: 'REMOTO_AUTORIZADO',
      EXIBIR_MINI_PLAYER_FLUTUANTE: true,
      EXIBIR_BOTAO_FLUTUANTE_SELECAO: true,
      MODO_LEITURA_CONTINUA: true,
      ESTILO_HIGHLIGHT: ESTILO_HIGHLIGHT_PADRAO
    }),
    ESTILO_HIGHLIGHT_PADRAO,
    PRESETS_HIGHLIGHT,
    TEXTOS_PREVIA_VOZ: Object.freeze({
      'pt-BR': 'Olá! Esta é uma amostra da minha voz para leitura no Read For Me.',
      'pt-PT': 'Olá! Esta é uma amostra da minha voz para leitura no Read For Me.',
      'en-US': 'Hello! This is a voice preview for reading in Read For Me.',
      'es-ES': '¡Hola! Esta es una muestra de mi voz para la lectura en Read For Me.',
      PADRAO: 'Olá! Esta é uma amostra de voz para leitura no Read For Me.'
    }),
    VELOCIDADE_MINIMA: 0.75,
    VELOCIDADE_MAXIMA: 2.0,
    PASSO_VELOCIDADE: 0.01,
    VELOCIDADES_DISPONIVEIS: Object.freeze([0.75, 1.0, 1.25, 1.5, 2.0]),
    IDIOMAS_PRIORITARIOS: Object.freeze(['pt-BR', 'en-US']),
    TIPOS_MENSAGEM: Object.freeze({
      INICIAR_LEITURA_MENU: 'INICIAR_LEITURA_MENU',
      INICIAR_LEITURA_A_PARTIR_DAQUI: 'INICIAR_LEITURA_A_PARTIR_DAQUI',
      INICIAR_LEITURA_SELECAO_EXATA: 'INICIAR_LEITURA_SELECAO_EXATA',
      ALTERNAR_PAUSA_ATALHO: 'ALTERNAR_PAUSA_ATALHO',
      SINTETIZAR_SENTENCA: 'SINTETIZAR_SENTENCA',
      PREVISUALIZAR_VOZ: 'PREVISUALIZAR_VOZ',
      CANCELAR_SINTESE_ABA: 'CANCELAR_SINTESE_ABA',
      OBTER_CATALOGO_VOZES: 'OBTER_CATALOGO_VOZES',
      OBTER_ESTADO_LEITURA_ABA: 'OBTER_ESTADO_LEITURA_ABA',
      COMANDO_CONTROLE_ABA: 'COMANDO_CONTROLE_ABA',
      HEARTBEAT_KEEP_ALIVE: 'HEARTBEAT_KEEP_ALIVE',
      HEARTBEAT_CONFIRMADO: 'HEARTBEAT_CONFIRMADO',
      PACOTE_AUDIO_PRONTO: 'PACOTE_AUDIO_PRONTO',
      FALHA_SINTESE_USAR_FALLBACK: 'FALHA_SINTESE_USAR_FALLBACK',
      FALHA_SINTESE: 'FALHA_SINTESE',
      ABRIR_CONFIGURACOES: 'ABRIR_CONFIGURACOES'
    }),
    VOZES_NATURAIS_INTEGRADA_PADRAO: Object.freeze([
      Object.freeze({
        nomeCurto: 'pt-BR-FranciscaNeural',
        nomeExibicao: 'Francisca (Português Brasil - Natural)',
        idioma: 'pt-BR',
        genero: 'Female'
      }),
      Object.freeze({
        nomeCurto: 'pt-BR-AntonioNeural',
        nomeExibicao: 'Antonio (Português Brasil - Natural)',
        idioma: 'pt-BR',
        genero: 'Male'
      }),
      Object.freeze({
        nomeCurto: 'pt-BR-ThalitaMultilingualNeural',
        nomeExibicao: 'Thalita Multilíngue (Português Brasil - Natural)',
        idioma: 'pt-BR',
        genero: 'Female'
      }),
      Object.freeze({
        nomeCurto: 'en-US-AriaNeural',
        nomeExibicao: 'Aria (English US - Natural)',
        idioma: 'en-US',
        genero: 'Female'
      }),
      Object.freeze({
        nomeCurto: 'en-US-GuyNeural',
        nomeExibicao: 'Guy (English US - Natural)',
        idioma: 'en-US',
        genero: 'Male'
      }),
      Object.freeze({
        nomeCurto: 'en-US-JennyNeural',
        nomeExibicao: 'Jenny (English US - Natural)',
        idioma: 'en-US',
        genero: 'Female'
      }),
      Object.freeze({
        nomeCurto: 'en-US-AndrewMultilingualNeural',
        nomeExibicao: 'Andrew Multilingual (English US - Natural)',
        idioma: 'en-US',
        genero: 'Male'
      })
    ])
  });

  escopoGlobal.ReadForMe.CONSTANTES_SISTEMA = CONSTANTES_SISTEMA;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTES_SISTEMA;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
