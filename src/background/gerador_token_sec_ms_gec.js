/**
 * Responsável por gerar o token de segurança criptográfico Sec-MS-GEC exigido
 * pelo handshake WebSocket do endpoint Microsoft Edge TTS (speech.platform.bing.com).
 */
export class GeradorTokenSecMsGec {
  /**
   * Calcula o hash SHA-256 em caixa alta baseado no timestamp Windows FileTime arredondado para 5 minutos.
   * @param {string} tokenClienteConfiavel - Token público do cliente ReadAloud.
   * @returns {Promise<string>} Hash SHA-256 hexadecimal em letras maiúsculas (64 caracteres).
   */
  static async gerarTokenSeguranca(tokenClienteConfiavel) {
    if (!tokenClienteConfiavel || typeof tokenClienteConfiavel !== 'string') {
      throw new Error('O token de cliente confiável do Edge TTS é obrigatório.');
    }

    const SEGUNDOS_ENTRE_1601_E_1970 = 11644473600;
    const INTERVALO_ARREDONDAMENTO_SEGUNDOS = 300;
    const TICKS_POR_SEGUNDO = 10000000;

    const segundosUnixAtual = Math.floor(Date.now() / 1000);
    const segundosWindowsEpoch = segundosUnixAtual + SEGUNDOS_ENTRE_1601_E_1970;
    const segundosArredondados =
      segundosWindowsEpoch - (segundosWindowsEpoch % INTERVALO_ARREDONDAMENTO_SEGUNDOS);
    const ticksWindowsFileTime = BigInt(segundosArredondados) * BigInt(TICKS_POR_SEGUNDO);

    const cadeiaParaAssinar = `${ticksWindowsFileTime.toString()}${tokenClienteConfiavel}`;
    const bytesEntrada = new TextEncoder().encode(cadeiaParaAssinar);
    const bufferDigest = await crypto.subtle.digest('SHA-256', bytesEntrada);

    return Array.from(new Uint8Array(bufferDigest), (byteAtual) =>
      byteAtual.toString(16).padStart(2, '0').toUpperCase()
    ).join('');
  }
}
