/**
 * Responsável por gerar o token de segurança criptográfico Sec-MS-GEC (v2) e MUID exigidos
 * pelo handshake WebSocket do endpoint Microsoft Edge TTS (speech.platform.bing.com).
 * Implementa o digest combinado CS64 + SHA-256 customizado (<16 hex>-<64 hex>) para Sec-MS-GEC-Version: 2-143.0.3650.75.
 */

const EPOCA_WINDOWS_SEGUNDOS = 11644473600;
const MASCARA_U32 = 0xffffffffn;

const SHA256_INICIAL = [
  0x6a09e667n,
  0xbb67ae85n,
  0x3c6ef372n,
  0xa54ff53an,
  0x510e527fn,
  0x9b05688cn,
  0x1f83d9abn,
  0x5be0cd19n
];

const SHA256_ESTADO_BASE = [
  0xfd9fbea2n,
  0x91243ce7n,
  0xbe499094n,
  0xcd2e1e0an,
  0x6c006f49n,
  0x04bd35abn,
  0xfeb0a7e4n,
  0x03effbd2n
];

const SHA256_AGENDA_BASE = [
  0xeb24bf9en,
  0x1558691fn,
  0xa0c09ee2n,
  0x0cfa32ban,
  0xa622ee8cn,
  0xd1dd9491n,
  0xc0dd25a0n,
  0xf9e70ab6n,
  0xf0c31573n,
  0x7058ce4en,
  0x7188e606n,
  0x00e5ab33n,
  0xd258b060n,
  0x72766564n
];

const SHA256_CONSTANTES_RODADA = [
  0x428a2f98n, 0x71374491n, 0xb5c0fbcfn, 0xe9b5dba5n, 0x3956c25bn, 0x59f111f1n, 0x923f82a4n, 0xab1c5ed5n,
  0xd807aa98n, 0x12835b01n, 0x243185ben, 0x550c7dc3n, 0x72be5d74n, 0x80deb1fen, 0x9bdc06a7n, 0xc19bf174n,
  0xe49b69c1n, 0xefbe4786n, 0x0fc19dc6n, 0x240ca1ccn, 0x2de92c6fn, 0x4a7484aan, 0x5cb0a9dcn, 0x76f988dan,
  0x983e5152n, 0xa831c66dn, 0xb00327c8n, 0xbf597fc7n, 0xc6e00bf3n, 0xd5a79147n, 0x06ca6351n, 0x14292967n,
  0x27b70a85n, 0x2e1b2138n, 0x4d2c6dfcn, 0x53380d13n, 0x650a7354n, 0x766a0abbn, 0x81c2c92en, 0x92722c85n,
  0xa2bfe8a1n, 0xa81a664bn, 0xc24b8b70n, 0xc76c51a3n, 0xd192e819n, 0xd6990624n, 0xf40e3585n, 0x106aa070n,
  0x19a4c116n, 0x1e376c08n, 0x2748774cn, 0x34b0bcb5n, 0x391c0cb3n, 0x4ed8aa4an, 0x5b9cca4fn, 0x682e6ff3n,
  0x748f82een, 0x78a5636fn, 0x84c87814n, 0x8cc70208n, 0x90befffan, 0xa4506cebn, 0xbef9a3f7n, 0xc67178f2n
];

const SHA256_AJUSTE = 0xc9dc06a7n;
const SHA256_CONSTANTES_BLOCO = SHA256_CONSTANTES_RODADA.map((valor, indice) =>
  indice === 14 ? SHA256_AJUSTE : valor
);
const SHA256_SIGMA0_AJUSTE = 0x059c0b80n;
const SHA256_SIGMA1_AJUSTE = 0x000b92c0n;

const CS64_COEFICIENTES = [
  [0xe82e91b1n, 0xb32700d0n],
  [0x44de24c6n, 0x88dff51dn],
  [0x3beb65bcn, 0x29514038n],
  [0xc89c5933n, 0xb328cbdfn],
  [0x8d1ec211n, 0xd405b4d5n],
  [0x314ef5d5n, 0x26e55f3cn],
  [0xe92491b1n, 0x607801c6n],
  [0xf0a5b9d5n, 0x82b2c1fbn],
  [0x06064cf3n, 0xfa51a3dan],
  [0xda79fa60n, 0x207cc464n],
  [0xbed20560n, 0x3c3c74f3n],
  [0x89f9c9f8n, 0xd2d14b61n],
  [0x35fa38c6n, 0xbb04a2c1n],
  [0xcb49e3c6n, 0xc5626167n]
];

const CS64_FATOR = 0x82893933n;
const CS64_AJUSTE0 = 0xf2f90b1an;
const CS64_AJUSTE1 = 0x0b1a0000n;

function rotacionarEsquerda16(valor) {
  const v = valor & MASCARA_U32;
  return ((v << 16n) | (v >> 16n)) & MASCARA_U32;
}

function sigma0(valor) {
  const v = valor & MASCARA_U32;
  return ((v >> 7n) ^ (v << 25n) ^ (v >> 18n) ^ (v << 14n) ^ (v >> 3n)) & MASCARA_U32;
}

function sigma1(valor) {
  const v = valor & MASCARA_U32;
  return ((v >> 17n) ^ (v << 15n) ^ (v >> 19n) ^ (v << 13n) ^ (v >> 10n)) & MASCARA_U32;
}

function expandirAgendaSha256(palavras, primeiraPalavra = 16) {
  for (let indice = primeiraPalavra; indice < 64; indice += 1) {
    const x = palavras[indice - 2];
    const y = palavras[indice - 15];
    const s1 = sigma1(x);
    const s0 = sigma0(y);
    palavras.push((s1 + palavras[indice - 7] + s0 + palavras[indice - 16]) & MASCARA_U32);
  }
}

function executarRodadasSha256(estado, palavras, primeiraRodada = 0) {
  let [a, b, c, d, e, f, g, h] = estado;
  const constantes =
    primeiraRodada === 14 ? SHA256_CONSTANTES_BLOCO : SHA256_CONSTANTES_RODADA;

  for (let indice = primeiraRodada; indice < 64; indice += 1) {
    const rotE = e * 0x100000001n;
    const rotA = a * 0x100000001n;
    const t1 =
      h +
      ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) +
      (g ^ (e & (f ^ g))) +
      constantes[indice] +
      palavras[indice];
    const t2 =
      ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((a & b) | (c & (a | b)));

    h = g;
    g = f;
    f = e;
    e = (d + t1) & MASCARA_U32;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) & MASCARA_U32;
  }

  return [a, b, c, d, e, f, g, h];
}

function inicializarSha256Customizado(primeirosSeteBytes) {
  const w14 =
    (BigInt(primeirosSeteBytes[0]) << 16n) |
    (BigInt(primeirosSeteBytes[1]) << 8n) |
    BigInt(primeirosSeteBytes[2]);
  const w15 =
    ((BigInt(primeirosSeteBytes[3]) << 24n) |
      (BigInt(primeirosSeteBytes[4]) << 16n) |
      (BigInt(primeirosSeteBytes[5]) << 8n) |
      BigInt(primeirosSeteBytes[6])) &
    MASCARA_U32;

  const palavras = new Array(14).fill(0n);
  palavras.push(w14, w15);

  for (let indice = 16; indice < 30; indice += 1) {
    let valor = SHA256_AGENDA_BASE[indice - 16];
    if (indice - 2 >= 14) {
      valor +=
        indice === 16
          ? sigma1(palavras[indice - 2]) ^ SHA256_SIGMA1_AJUSTE
          : sigma1(palavras[indice - 2]);
    }
    if (indice - 7 >= 14) {
      valor += palavras[indice - 7];
    }
    if (indice - 15 >= 14) {
      valor +=
        indice === 29
          ? sigma0(palavras[indice - 15]) ^ SHA256_SIGMA0_AJUSTE
          : sigma0(palavras[indice - 15]);
    }
    palavras.push(valor & MASCARA_U32);
  }

  palavras.push(
    (sigma1(palavras[28]) +
      palavras[23] +
      sigma0(palavras[15]) +
      palavras[14] +
      SHA256_AJUSTE -
      SHA256_CONSTANTES_RODADA[14]) &
      MASCARA_U32
  );

  expandirAgendaSha256(palavras, 31);
  const trabalhando = executarRodadasSha256(SHA256_ESTADO_BASE, palavras, 14);
  return SHA256_INICIAL.map((x, idx) => (x + trabalhando[idx]) & MASCARA_U32);
}

function calcularDigestSha256Customizado(dadosBytes) {
  const comprimentoTotal = 57 + dadosBytes.length;
  const sufixoDados = dadosBytes.slice(7);
  const zerosPreenchimento = (((55 - comprimentoTotal) % 64) + 64) % 64;
  const tamanhoPreenchido = sufixoDados.length + 1 + zerosPreenchimento + 8;
  const preenchido = new Uint8Array(tamanhoPreenchido);

  preenchido.set(sufixoDados, 0);
  preenchido[sufixoDados.length] = 0x80;

  const visao = new DataView(preenchido.buffer);
  const bitsTotais = BigInt(comprimentoTotal) * 8n;
  visao.setBigUint64(tamanhoPreenchido - 8, bitsTotais, false);

  let estado = inicializarSha256Customizado(dadosBytes.slice(0, 7));

  for (let offset = 0; offset < preenchido.length; offset += 64) {
    const palavras = [];
    for (let i = 0; i < 16; i += 1) {
      palavras.push(BigInt(visao.getUint32(offset + i * 4, false)));
    }
    expandirAgendaSha256(palavras, 16);
    const trabalhando = executarRodadasSha256(estado, palavras, 0);
    estado = estado.map((x, idx) => (x + trabalhando[idx]) & MASCARA_U32);
  }

  const bufferSaida = new Uint8Array(32);
  const visaoSaida = new DataView(bufferSaida.buffer);
  for (let i = 0; i < 8; i += 1) {
    visaoSaida.setUint32(i * 4, Number(estado[i]), false);
  }
  return bufferSaida;
}

function dividirEmPalavrasLe4Par(dadosBytes) {
  const resto = (4 - (dadosBytes.length % 4)) % 4;
  const preenchido = new Uint8Array(dadosBytes.length + resto);
  preenchido.set(dadosBytes, 0);
  if (preenchido.length === 0) {
    return [];
  }
  const visao = new DataView(preenchido.buffer);
  const palavras = [];
  for (let offset = 0; offset < preenchido.length; offset += 4) {
    palavras.push(BigInt(visao.getUint32(offset, true)));
  }
  if (palavras.length % 2 !== 0) {
    palavras.push(0n);
  }
  return palavras;
}

function calcularDigestCs64(dadosBytes, digestBytes) {
  const visaoDigest = new DataView(
    digestBytes.buffer,
    digestBytes.byteOffset,
    digestBytes.byteLength
  );
  const chaveA = BigInt(visaoDigest.getUint32(0, true)) | 1n;
  const chaveB = BigInt(visaoDigest.getUint32(4, true)) | 1n;

  const fatores = [
    (chaveA * CS64_FATOR) & MASCARA_U32,
    (chaveB * CS64_FATOR) & MASCARA_U32
  ];

  const termos = CS64_COEFICIENTES.map(
    ([coeficiente], indice) => (coeficiente * fatores[indice % 2]) & MASCARA_U32
  );
  const deslocamentos = CS64_COEFICIENTES.map(([, offset]) => offset);

  const dadosComZeroPrefixado = new Uint8Array(1 + dadosBytes.length);
  dadosComZeroPrefixado.set(dadosBytes, 1);

  const palavrasEntrada = dividirEmPalavrasLe4Par(dadosComZeroPrefixado);
  for (let indice = 0; indice < palavrasEntrada.length; indice += 1) {
    const palavra = palavrasEntrada[indice];
    let termo = palavra * (indice % 2 === 0 ? chaveA : chaveB);
    let offset =
      rotacionarEsquerda16(palavra) * (indice % 2 === 0 ? 0xef0569fbn : 0xc31713dbn);
    if (indice === 0) {
      termo += CS64_AJUSTE0 * fatores[0];
      offset += CS64_AJUSTE1;
    }
    termos.push(termo & MASCARA_U32);
    deslocamentos.push(offset & MASCARA_U32);
  }

  let swapAcc = 0n;
  let swapLast = 0n;
  let estado = 0n;
  let acc = 0n;

  for (let indice = 0; indice < termos.length; indice += 2) {
    const x = termos[indice];
    const y = termos[indice + 1];

    let t = rotacionarEsquerda16((deslocamentos[indice] + x) & MASCARA_U32);
    let q = (t * 0x76f50f34n) & MASCARA_U32;
    swapAcc += (rotacionarEsquerda16(q) * 0xc3efea97n + q) & MASCARA_U32;

    t = rotacionarEsquerda16((deslocamentos[indice + 1] + y) & MASCARA_U32);
    q = (t * 0x1881ce3cn) & MASCARA_U32;
    swapLast = (rotacionarEsquerda16(q) * 0x35bd1ec9n + q) & MASCARA_U32;
    swapAcc = (swapAcc + swapLast) & MASCARA_U32;

    estado = (estado * chaveA + x) & MASCARA_U32;
    estado = (rotacionarEsquerda16(estado) * 0xcf98b111n) & MASCARA_U32;
    estado = (rotacionarEsquerda16(estado) * 0x87085b9fn) & MASCARA_U32;
    estado = (rotacionarEsquerda16(estado) * 0x12ceb96dn) & MASCARA_U32;
    estado = (rotacionarEsquerda16(estado) * 0x257e1d83n) & MASCARA_U32;
    acc += estado;

    t = (estado * chaveB + y) & MASCARA_U32;
    t = (rotacionarEsquerda16(t) * 0xa27416f5n) & MASCARA_U32;
    t = (rotacionarEsquerda16(t) * 0xd38396ffn) & MASCARA_U32;
    estado =
      (rotacionarEsquerda16((rotacionarEsquerda16(t) * 0x7c932b89n) & MASCARA_U32) *
        0xbfa49f69n) &
      MASCARA_U32;
    acc = (acc + estado) & MASCARA_U32;
  }

  return [(swapLast ^ estado) & MASCARA_U32, (swapAcc ^ acc) & MASCARA_U32];
}

function bytesParaHexMaiusculo(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

export class GeradorTokenSecMsGec {
  static desvioRelogioSegundos = 0;

  /**
   * Ajusta o desvio de relógio (clock skew) caso a hora local da máquina difira do servidor da Microsoft.
   * @param {string} cabecalhoDataServidor
   * @returns {void}
   */
  static sincronizarRelogioComServidor(cabecalhoDataServidor) {
    if (!cabecalhoDataServidor || typeof cabecalhoDataServidor !== 'string') {
      return;
    }
    const timestampServidorMs = Date.parse(cabecalhoDataServidor);
    if (!Number.isNaN(timestampServidorMs)) {
      const segundosServidor = Math.floor(timestampServidorMs / 1000);
      const segundosLocal = Math.floor(Date.now() / 1000);
      GeradorTokenSecMsGec.desvioRelogioSegundos = segundosServidor - segundosLocal;
    }
  }

  /**
   * Gera um identificador MUID aleatório de 32 caracteres hexadecimais em caixa alta.
   * @returns {string}
   */
  static gerarMuidAleatorio() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesParaHexMaiusculo(bytes);
  }

  /**
   * Calcula o token Sec-MS-GEC v2 (<16 hex CS64>-<64 hex SHA256>) ou v1 caso solicitado.
   * @param {string} tokenClienteConfiavel - Token público do cliente ReadAloud.
   * @param {Object} [opcoes]
   * @param {number} [opcoes.segundosUnixExplicito]
   * @param {boolean} [opcoes.formatoLegadoV1=false]
   * @returns {Promise<string>}
   */
  static async gerarTokenSeguranca(tokenClienteConfiavel, opcoes = {}) {
    if (!tokenClienteConfiavel || typeof tokenClienteConfiavel !== 'string') {
      throw new Error('O token de cliente confiável do Edge TTS é obrigatório.');
    }

    const segundosUnixBase =
      typeof opcoes.segundosUnixExplicito === 'number'
        ? Math.floor(opcoes.segundosUnixExplicito)
        : Math.floor(Date.now() / 1000) + GeradorTokenSecMsGec.desvioRelogioSegundos;

    const segundosWindowsEpoch = segundosUnixBase + EPOCA_WINDOWS_SEGUNDOS;
    const segundosArredondados = segundosWindowsEpoch - (segundosWindowsEpoch % 300);
    const ticksWindowsFileTime = BigInt(segundosArredondados) * 10000000n;

    const cadeiaParaAssinar = `${ticksWindowsFileTime.toString()}${tokenClienteConfiavel}`;
    const bytesEntrada = new TextEncoder().encode(cadeiaParaAssinar);

    if (opcoes.formatoLegadoV1) {
      const bufferDigest = await crypto.subtle.digest('SHA-256', bytesEntrada);
      return bytesParaHexMaiusculo(new Uint8Array(bufferDigest));
    }

    const digestSha256 = calcularDigestSha256Customizado(bytesEntrada);
    const [palavraCs0, palavraCs1] = calcularDigestCs64(bytesEntrada, digestSha256);

    const bufferCs64 = new Uint8Array(8);
    const visaoCs64 = new DataView(bufferCs64.buffer);
    visaoCs64.setUint32(0, Number(palavraCs0), true);
    visaoCs64.setUint32(4, Number(palavraCs1), true);

    const hexCs64 = bytesParaHexMaiusculo(bufferCs64);
    const hexSha256 = bytesParaHexMaiusculo(digestSha256);
    return `${hexCs64}-${hexSha256}`;
  }
}
