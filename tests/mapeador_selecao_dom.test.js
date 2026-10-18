// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import '../src/shared/constantes_sistema.js';
import '../src/content/dom/segmentador_sentencas.js';
import '../src/content/dom/mapeador_selecao_dom.js';

const { MapeadorSelecaoDom } = globalThis.ReadForMe;

describe('MapeadorSelecaoDom — Extração Não-Destrutiva, Leitura Contínua e Remapeamento SPA', () => {
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

    expect(ranges.length).toBe(2);
    expect(ranges.map((r) => r.toString()).join('')).toBe('negrito itálico');
    expect(container.innerHTML).toBe(htmlOriginalAntes);
  });

  it('deve continuar lendo todas as sentenças seguintes até o fim do conteúdo ao selecionar apenas uma palavra ou letra', () => {
    document.body.innerHTML = `
      <article>
        <p id="p1">Introdução descartada. Palavra selecionada na primeira frase.</p>
        <p id="p2">Segunda frase no parágrafo seguinte. Terceira frase final do artigo.</p>
      </article>
    `;

    const noTextoP1 = document.getElementById('p1').firstChild;
    const indicePalavra = noTextoP1.nodeValue.indexOf('Palavra');

    // Seleciona apenas a primeira letra "P" de "Palavra"
    const rangeUmaLetra = document.createRange();
    rangeUmaLetra.setStart(noTextoP1, indicePalavra);
    rangeUmaLetra.setEnd(noTextoP1, indicePalavra + 1);

    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(rangeUmaLetra);

    const mapaContinuo = MapeadorSelecaoDom.mapearSelecaoAtual(selecao, {
      continuarAteFimDoConteudo: true
    });

    expect(mapaContinuo).not.toBeNull();
    expect(mapaContinuo.sentencasMapeadas.map((s) => s.textoSentenca)).toEqual([
      'Palavra selecionada na primeira frase.',
      'Segunda frase no parágrafo seguinte.',
      'Terceira frase final do artigo.'
    ]);
  });

  it('deve iniciar "Ler a partir daqui" sem seleção de texto recuando ao início da palavra clicada e lendo até o fim', () => {
    document.body.innerHTML = `
      <main>
        <p id="p-inicio">Parágrafo anterior ignorado.</p>
        <p id="p-alvo">Começando exatamente aqui. Continuando para o fim.</p>
        <p id="p-fim">Última frase do documento.</p>
      </main>
    `;

    const noTextoAlvo = document.getElementById('p-alvo').firstChild;
    // Simula clique direito no meio da palavra "exatamente" (offset na letra "t")
    const offsetMeioDaPalavra = noTextoAlvo.nodeValue.indexOf('exatamente') + 4;

    const selecaoVazia = window.getSelection();
    selecaoVazia.removeAllRanges();

    const mapa = MapeadorSelecaoDom.mapearLeituraAPartirDaqui({
      selecaoNavegador: selecaoVazia,
      pontoClique: {
        noInicial: noTextoAlvo,
        offsetInicial: offsetMeioDaPalavra,
        elementoAlvo: document.getElementById('p-alvo')
      }
    });

    expect(mapa).not.toBeNull();
    expect(mapa.sentencasMapeadas.map((s) => s.textoSentenca)).toEqual([
      'exatamente aqui.',
      'Continuando para o fim.',
      'Última frase do documento.'
    ]);
  });

  it('deve buscar e anexar novas sentenças dinamicamente ao encontrar o fim do conteúdo (tentarExpandirConteudoDinamico)', () => {
    document.body.innerHTML = `<article id="art"><p id="p1">Frase inicial do fluxo.</p></article>`;
    const noP1 = document.getElementById('p1').firstChild;

    const mapa = MapeadorSelecaoDom.mapearLeituraAPartirDaqui({
      pontoClique: { noInicial: noP1, offsetInicial: 0 }
    });

    expect(mapa.sentencasMapeadas).toHaveLength(1);

    // Simula carregamento dinâmico de mais um parágrafo no fim do artigo
    const novoParagrafo = document.createElement('p');
    novoParagrafo.textContent = 'Nova frase carregada dinamicamente. Outra frase final.';
    document.getElementById('art').appendChild(novoParagrafo);

    const expandiu = mapa.tentarExpandirConteudoDinamico();
    expect(expandiu).toBe(true);
    expect(mapa.sentencasMapeadas.map((s) => s.textoSentenca)).toEqual([
      'Frase inicial do fluxo.',
      'Nova frase carregada dinamicamente.',
      'Outra frase final.'
    ]);
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
