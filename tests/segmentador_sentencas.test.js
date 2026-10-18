import { describe, it, expect } from 'vitest';
import '../src/shared/constantes_sistema.js';
import '../src/content/dom/segmentador_sentencas.js';

const { SegmentadorSentencas } = globalThis.ReadForMe;

describe('SegmentadorSentencas — Sentence Chunking e Preservação de Offsets Globais', () => {
  it('deve dividir múltiplos parágrafos e sentenças preservando indiceInicialGlobal e indiceFinalGlobal exatos', () => {
    const texto =
      'Primeira frase de teste. Segunda frase logo em seguida!\nTerceiro bloco após quebra de linha? Sim, funciona perfeitamente.';
    const sentencas = SegmentadorSentencas.segmentarTextoEmSentencas(texto);

    expect(sentencas.length).toBe(4);
    for (const item of sentencas) {
      expect(texto.slice(item.indiceInicialGlobal, item.indiceFinalGlobal)).toBe(
        item.textoSentenca
      );
    }
  });

  it('não deve quebrar sentenças prematuramente em abreviações comuns (Dr., Sr., Sra., Prof., etc.)', () => {
    const texto =
      'O Dr. Carlos conversou com a Sra. Helena sobre o art. 5º e outros temas, etc. Depois eles saíram.';
    const sentencas = SegmentadorSentencas.segmentarTextoEmSentencas(texto);

    expect(sentencas.length).toBe(2);
    expect(sentencas[0].textoSentenca).toBe(
      'O Dr. Carlos conversou com a Sra. Helena sobre o art. 5º e outros temas, etc.'
    );
    expect(sentencas[1].textoSentenca).toBe('Depois eles saíram.');
  });

  it('deve subdividir sentenças muito longas (> 280 caracteres) sem pontuação final mantendo índices exatos', () => {
    const clausulaBase =
      'Este é um trecho longo de uma cláusula contratual sem ponto final imediato, ';
    const textoGigante = clausulaBase.repeat(6).trim();
    const sentencas = SegmentadorSentencas.segmentarTextoEmSentencas(textoGigante, 160);

    expect(sentencas.length).toBeGreaterThan(2);
    for (const item of sentencas) {
      expect(item.textoSentenca.length).toBeLessThanOrEqual(160);
      expect(textoGigante.slice(item.indiceInicialGlobal, item.indiceFinalGlobal)).toBe(
        item.textoSentenca
      );
    }
  });
});
