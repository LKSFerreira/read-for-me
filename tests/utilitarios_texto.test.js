import { describe, it, expect } from 'vitest';
import '../src/shared/constantes_sistema.js';
import '../src/shared/utilitarios_texto.js';

const { UtilitariosTexto } = globalThis.ReadForMe;

describe('UtilitariosTexto — Sanitização SSML, Mapa de Offsets e Alinhamento WordBoundary', () => {
  it('deve extrair a versão do Chromium dinamicamente do User-Agent (Edge e Brave/Chrome)', () => {
    const uaEdge =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.51';
    const uaBrave =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.91 Safari/537.36';

    expect(UtilitariosTexto.obterVersaoChromiumDinamica(uaEdge)).toBe('131.0.2903.51');
    expect(UtilitariosTexto.obterVersaoChromiumDinamica(uaBrave)).toBe('130.0.6723.91');
    expect(UtilitariosTexto.obterVersaoChromiumDinamica('UserAgentSemVersao', '130.0.2849.68')).toBe(
      '130.0.2849.68'
    );
  });

  it('deve gerar identificador de conexão hexadecimal de 32 caracteres sem hífens', () => {
    const id1 = UtilitariosTexto.gerarIdentificadorConexaoHex();
    const id2 = UtilitariosTexto.gerarIdentificadorConexaoHex();

    expect(id1).toMatch(/^[0-9a-f]{32}$/);
    expect(id2).toMatch(/^[0-9a-f]{32}$/);
    expect(id1).not.toBe(id2);
  });

  it('deve escapar entidades XML (&, <, >, ", \') e mapear cada posição para o índice original exato', () => {
    const textoOriginal = 'A & B < C > "D" \'E\' ação';
    const { textoEscapado, mapaIndiceEscapadoParaOriginal } =
      UtilitariosTexto.escaparTextoParaSsmlComMapa(textoOriginal);

    expect(textoEscapado).toBe('A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos; ação');

    const indiceEscapadoPalavraAcao = textoEscapado.indexOf('ação');
    const indiceOriginalPalavraAcao = textoOriginal.indexOf('ação');
    expect(mapaIndiceEscapadoParaOriginal[indiceEscapadoPalavraAcao]).toBe(
      indiceOriginalPalavraAcao
    );
  });

  it('deve alinhar corretamente palavras repetidas e artigos curtos sem casar substrings internas', () => {
    const sentenca = 'O rato roeu a roupa do rei de Roma.';
    const { comprimentoPrefixoSsml, mapaIndiceEscapadoParaOriginal } =
      UtilitariosTexto.construirEnvelopeSsmlMapeado(
        sentenca,
        'pt-BR-FranciscaNeural',
        'pt-BR'
      );

    const sequenciaPalavras = ['O', 'rato', 'roeu', 'a', 'roupa', 'do', 'rei', 'de', 'Roma'];
    let cursorBusca = 0;
    const offsetsEncontrados = [];

    for (const palavra of sequenciaPalavras) {
      const resultado = UtilitariosTexto.alinharPalavraAoTextoOriginal({
        textoSentencaOriginal: sentenca,
        textoPalavraEvento: palavra,
        comprimentoPrefixoSsml,
        mapaIndiceEscapadoParaOriginal,
        cursorBuscaCaractere: cursorBusca
      });
      offsetsEncontrados.push({
        palavra,
        inicio: resultado.indiceInicialCaractere,
        trechoOriginal: sentenca.slice(
          resultado.indiceInicialCaractere,
          resultado.indiceInicialCaractere + resultado.comprimentoPalavra
        )
      });
      cursorBusca = resultado.novoCursorBusca;
    }

    expect(offsetsEncontrados.map((item) => item.trechoOriginal)).toEqual(sequenciaPalavras);
    // Verifica especificamente que o artigo "a" casou com o índice 12 (" a ") e não dentro de "rato"
    expect(offsetsEncontrados[3]).toEqual({
      palavra: 'a',
      inicio: 12,
      trechoOriginal: 'a'
    });
  });

  it('deve alinhar corretamente palavras após entidades XML escapadas usando TextOffset do SSML', () => {
    const sentenca = 'Pesquisa & Desenvolvimento em 2026 com taxa de 1,5x.';
    const {
      envelopeSsml,
      comprimentoPrefixoSsml,
      mapaIndiceEscapadoParaOriginal
    } = UtilitariosTexto.construirEnvelopeSsmlMapeado(
      sentenca,
      'pt-BR-FranciscaNeural',
      'pt-BR'
    );

    const offsetSsmlDesenvolvimento = envelopeSsml.indexOf('Desenvolvimento');
    const alinhamento = UtilitariosTexto.alinharPalavraAoTextoOriginal({
      textoSentencaOriginal: sentenca,
      textoPalavraEvento: 'Desenvolvimento',
      offsetTextoEvento: offsetSsmlDesenvolvimento,
      comprimentoPrefixoSsml,
      mapaIndiceEscapadoParaOriginal,
      cursorBuscaCaractere: 0
    });

    expect(alinhamento.indiceInicialCaractere).toBe(sentenca.indexOf('Desenvolvimento'));
    expect(alinhamento.comprimentoPalavra).toBe('Desenvolvimento'.length);
  });
});
