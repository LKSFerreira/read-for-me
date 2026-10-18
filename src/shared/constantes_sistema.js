/**
 * Constantes imutáveis compartilhadas entre o Service Worker (Manifest V3),
 * os Content Scripts (Isolated World) e a suíte de testes automatizados.
 */
(function inicializarConstantesSistema(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  const CONSTANTES_SISTEMA = Object.freeze({
    ID_MENU_CONTEXTO: 'read-for-me-ler-selecao',
    ID_HOST_SHADOW_DOM: 'read-for-me-host-raiz',
    NOME_PORTA_KEEP_ALIVE: 'read-for-me-canal-sintese-voz',
    INTERVALO_HEARTBEAT_MS: 20000,
    TIMEOUT_CONEXAO_WS_MS: 10000,
    MAXIMO_TENTATIVAS_WS: 2,
    ATRASOS_RECONEXAO_PORTA_MS: Object.freeze([250, 500, 1000]),
    JANELA_PREFETCH_SENTENCAS: 2,
    DURACAO_CIRCUITO_ABERTO_MS: 300000,
    VALIDADE_CACHE_VOZES_MS: 86400000,
    COMPRIMENTO_MAXIMO_SENTENCA: 280,
    TOKEN_CLIENTE_CONFIAVEL_EDGE: '6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    VERSAO_CHROMIUM_SIMULADA: '130.0.2849.68',
    VERSAO_FULL_SEC_MS_GEC: '130.0.2849.68',
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
      MODO_PRIVACIDADE_VOZ: 'readForMe_modoPrivacidadeVoz'
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
      MODO_PRIVACIDADE_VOZ: 'NAO_DEFINIDO'
    }),
    VELOCIDADES_DISPONIVEIS: Object.freeze([0.75, 1.0, 1.25, 1.5, 2.0]),
    IDIOMAS_PRIORITARIOS: Object.freeze(['pt-BR', 'en-US']),
    TIPOS_MENSAGEM: Object.freeze({
      INICIAR_LEITURA_MENU: 'INICIAR_LEITURA_MENU',
      ALTERNAR_PAUSA_ATALHO: 'ALTERNAR_PAUSA_ATALHO',
      SINTETIZAR_SENTENCA: 'SINTETIZAR_SENTENCA',
      CANCELAR_SINTESE_ABA: 'CANCELAR_SINTESE_ABA',
      OBTER_CATALOGO_VOZES: 'OBTER_CATALOGO_VOZES',
      HEARTBEAT_KEEP_ALIVE: 'HEARTBEAT_KEEP_ALIVE',
      HEARTBEAT_CONFIRMADO: 'HEARTBEAT_CONFIRMADO',
      PACOTE_AUDIO_PRONTO: 'PACOTE_AUDIO_PRONTO',
      FALHA_SINTESE_USAR_FALLBACK: 'FALHA_SINTESE_USAR_FALLBACK',
      FALHA_SINTESE: 'FALHA_SINTESE'
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
