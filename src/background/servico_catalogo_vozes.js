import '../shared/constantes_sistema.js';
import { GeradorTokenSecMsGec } from './gerador_token_sec_ms_gec.js';

const { CONSTANTES_SISTEMA } = globalThis.ReadForMe;

/**
 * Gerencia a obtenção, normalização, ordenação prioritária (pt-BR e en-US no topo)
 * e cache de 24 horas do catálogo de vozes Microsoft Natural Online.
 */
export class ServicoCatalogoVozes {
  /**
   * Obtém o catálogo de vozes naturais priorizando pt-BR e en-US no topo.
   * @returns {Promise<Array<{nomeCurto: string, nomeExibicao: string, idioma: string, genero: string}>>}
   */
  static async obterCatalogoVozesOrdenado() {
    try {
      const cacheExistente = await ServicoCatalogoVozes.lerCacheLocal();
      if (cacheExistente && Array.isArray(cacheExistente) && cacheExistente.length > 0) {
        return cacheExistente;
      }

      const tokenSecMsGec = await GeradorTokenSecMsGec.gerarTokenSeguranca(
        CONSTANTES_SISTEMA.TOKEN_CLIENTE_CONFIAVEL_EDGE
      );
      const versaoSecMsGec =
        CONSTANTES_SISTEMA.VERSAO_SEC_MS_GEC || '2-143.0.3650.75';
      const separadorQuery = CONSTANTES_SISTEMA.URL_LISTA_VOZES_EDGE.includes('?')
        ? '&'
        : '?';
      const urlAutenticada =
        `${CONSTANTES_SISTEMA.URL_LISTA_VOZES_EDGE}${separadorQuery}` +
        `Sec-MS-GEC=${tokenSecMsGec}&Sec-MS-GEC-Version=${versaoSecMsGec}`;

      const respostaHttp = await fetch(urlAutenticada, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      if (respostaHttp && respostaHttp.headers && typeof respostaHttp.headers.get === 'function') {
        const dataServidor = respostaHttp.headers.get('date');
        if (dataServidor) {
          GeradorTokenSecMsGec.sincronizarRelogioComServidor(dataServidor);
        }
      }

      if (!respostaHttp.ok) {
        throw new Error(`Falha ao consultar lista de vozes: status HTTP ${respostaHttp.status}`);
      }

      const listaBruta = await respostaHttp.json();
      const vozesNormalizadas = ServicoCatalogoVozes.normalizarEOrdenarVozes(listaBruta);

      if (vozesNormalizadas.length === 0) {
        return [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO];
      }

      await ServicoCatalogoVozes.salvarCacheLocal(vozesNormalizadas);
      return vozesNormalizadas;
    } catch {
      return [...CONSTANTES_SISTEMA.VOZES_NATURAIS_INTEGRADA_PADRAO];
    }
  }

  /**
   * Normaliza o payload da Microsoft e ordena colocando pt-BR e en-US no topo.
   * @param {Array<Object>} listaBruta - Lista retornada pelo endpoint da Microsoft.
   * @returns {Array<{nomeCurto: string, nomeExibicao: string, idioma: string, genero: string}>}
   */
  static normalizarEOrdenarVozes(listaBruta) {
    if (!Array.isArray(listaBruta)) {
      return [];
    }

    const vozesFiltradas = listaBruta
      .filter(
        (itemVoz) =>
          itemVoz &&
          typeof itemVoz.ShortName === 'string' &&
          itemVoz.ShortName.includes('Neural')
      )
      .map((itemVoz) => ({
        nomeCurto: itemVoz.ShortName,
        nomeExibicao:
          itemVoz.FriendlyName || `${itemVoz.ShortName} (${itemVoz.Locale || 'Natural'})`,
        idioma: itemVoz.Locale || 'pt-BR',
        genero: itemVoz.Gender || 'Neutral'
      }));

    const obterPesoPrioridadeIdioma = (codigoIdioma) => {
      if (codigoIdioma === 'pt-BR') {
        return 0;
      }
      if (codigoIdioma === 'en-US') {
        return 1;
      }
      if (String(codigoIdioma).startsWith('pt-')) {
        return 2;
      }
      if (String(codigoIdioma).startsWith('en-')) {
        return 3;
      }
      return 4;
    };

    return vozesFiltradas.sort((vozA, vozB) => {
      const pesoA = obterPesoPrioridadeIdioma(vozA.idioma);
      const pesoB = obterPesoPrioridadeIdioma(vozB.idioma);
      if (pesoA !== pesoB) {
        return pesoA - pesoB;
      }
      const comparacaoIdioma = vozA.idioma.localeCompare(vozB.idioma);
      if (comparacaoIdioma !== 0) {
        return comparacaoIdioma;
      }
      return vozA.nomeExibicao.localeCompare(vozB.nomeExibicao);
    });
  }

  /**
   * Lê o cache salvo em chrome.storage.local se ainda estiver dentro da validade de 24 horas.
   * @returns {Promise<Array | null>}
   */
  static async lerCacheLocal() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return null;
    }
    const chaveCache = CONSTANTES_SISTEMA.CHAVES_STORAGE.CACHE_CATALOGO_VOZES;
    const resultado = await chrome.storage.local.get([chaveCache]);
    const registroCache = resultado[chaveCache];

    if (
      !registroCache ||
      typeof registroCache.timestampGravacao !== 'number' ||
      !Array.isArray(registroCache.vozes)
    ) {
      return null;
    }

    const idadeCacheMs = Date.now() - registroCache.timestampGravacao;
    if (idadeCacheMs > CONSTANTES_SISTEMA.VALIDADE_CACHE_VOZES_MS) {
      return null;
    }

    return registroCache.vozes;
  }

  /**
   * Persiste o catálogo ordenado no armazenamento local da extensão.
   * @param {Array} vozesOrdenadas
   * @returns {Promise<void>}
   */
  static async salvarCacheLocal(vozesOrdenadas) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return;
    }
    const chaveCache = CONSTANTES_SISTEMA.CHAVES_STORAGE.CACHE_CATALOGO_VOZES;
    await chrome.storage.local.set({
      [chaveCache]: {
        timestampGravacao: Date.now(),
        vozes: vozesOrdenadas
      }
    });
  }
}
