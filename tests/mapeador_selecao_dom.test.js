// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import '../src/shared/constantes_sistema.js';
import '../src/content/dom/segmentador_sentencas.js';
import '../src/content/dom/mapeador_selecao_dom.js';

const { MapeadorSelecaoDom } = globalThis.ReadForMe;

describe('MapeadorSelecaoDom — Extração Não-Destrutiva de Ranges e Remapeamento SPA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve criar múltiplos Ranges atravessando tags inline (<b>, <i>, <a>) sem modificar o DOM', () => {
    const container = document.createElement('article');
    container.innerHTML =
      '<p id="p1">Texto <b>negrito <i>itálico</i></b> e <a href="#link">link ativo</a>.</p>';
    document.body.appendChild(container);
    const htmlOriginalAntes = container.innerHTML;

    const rangeSelecao = document.createRange();
    rangeSelecao.selectNodeContents(container);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(rangeSelecao);

    const mapa = MapeadorSelecaoDom.mapearSelecaoAtual(selecao);
    expect(mapa).not.toBeNull();
    expect(mapa.textoCompleto).toBe('Texto negrito itálico e link ativo.');

    const inicioNegritoItalico = mapa.textoCompleto.indexOf('negrito itálico');
    const fimNegritoItalico = inicioNegritoItalico + 'negrito itálico'.length;
    const ranges = mapa.criarRangesParaIntervaloGlobal(
      inicioNegritoItalico,
      fimNegritoItalico
    );

    // Como "negrito " está em <b> e "itálico" está em <i>, devem ser gerados 2 Ranges conectados
    expect(ranges.length).toBe(2);
    expect(ranges.map((r) => r.toString()).join('')).toBe('negrito itálico');
    // Garante zero mutação no DOM hospedeiro
    expect(container.innerHTML).toBe(htmlOriginalAntes);
  });

  it('deve reconstruir automaticamente os Ranges quando uma SPA re-renderiza e desconecta os TextNodes originais', () => {
    const containerSpa = document.createElement('div');
    containerSpa.innerHTML =
      '<p>Primeira frase reativa. Segunda frase em componente SPA.</p>';
    document.body.appendChild(containerSpa);

    const rangeSelecao = document.createRange();
    rangeSelecao.selectNodeContents(containerSpa);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(rangeSelecao);

    const mapa = MapeadorSelecaoDom.mapearSelecaoAtual(selecao);
    expect(mapa).not.toBeNull();

    // Simula re-renderização completa de componente React/Vue (desconecta os TextNodes antigos)
    containerSpa.innerHTML = containerSpa.innerHTML;

    const segundaSentenca = mapa.sentencasMapeadas[1];
    const rangesReconstruidos = mapa.criarRangesParaIntervaloGlobal(
      segundaSentenca.indiceInicialGlobal,
      segundaSentenca.indiceFinalGlobal
    );

    expect(rangesReconstruidos.length).toBeGreaterThan(0);
    expect(rangesReconstruidos[0].startContainer.isConnected).toBe(true);
    expect(rangesReconstruidos.map((r) => r.toString()).join('')).toBe(
      'Segunda frase em componente SPA.'
    );
  });

  it('deve bloquear mapeamento quando a seleção estiver dentro de campo de senha ou elemento sensível', () => {
    const wrapperSenha = document.createElement('div');
    wrapperSenha.setAttribute('data-read-for-me-ignore', 'true');
    wrapperSenha.textContent = 'segredo-super-confidencial';
    document.body.appendChild(wrapperSenha);

    const range = document.createRange();
    range.selectNodeContents(wrapperSenha);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);

    expect(MapeadorSelecaoDom.mapearSelecaoAtual(selecao)).toBeNull();
  });
});
