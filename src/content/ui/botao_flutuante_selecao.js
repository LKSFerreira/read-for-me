/**
 * Botão flutuante discreto exibido dentro da ShadowRoot próximo à palavra, letra ou trecho selecionado.
 * Inicia a leitura contínua a partir do ponto selecionado.
 */
(function inicializarBotaoFlutuanteSelecao(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  class BotaoFlutuanteSelecao {
    /**
     * @param {ShadowRoot} raizShadow - ShadowRoot hospedeira da extensão.
     * @param {function(): void} aoAcionarLeitura - Callback disparado ao clicar em "Ler a partir daqui".
     */
    constructor(raizShadow, aoAcionarLeitura) {
      this.raizShadow = raizShadow;
      this.aoAcionarLeitura = aoAcionarLeitura;
      this.elementoBotao = null;
      this.construirElemento();
    }

    /**
     * Cria o botão dentro da ShadowRoot com ícone editorial/acústico e acessibilidade.
     * @returns {void}
     */
    construirElemento() {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'botao-flutuante-selecao';
      botao.hidden = true;
      botao.setAttribute('aria-label', 'Ler em voz alta');
      botao.innerHTML = `
        <svg class="icone-onda-audio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="6 4 20 12 6 20 6 4" fill="currentColor"></polygon>
        </svg>
        <span>Ouvir</span>
      `;

      // Previne que o mousedown no botão desfaça a seleção de texto da página antes da captura do Range
      botao.addEventListener('mousedown', (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
      });

      botao.addEventListener('click', (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        this.ocultar();
        this.aoAcionarLeitura();
      });

      this.raizShadow.appendChild(botao);
      this.elementoBotao = botao;
    }

    /**
     * Posiciona e exibe o botão flutuante próximo ao retângulo da seleção de texto.
     * @param {DOMRect} retanguloSelecao
     * @returns {void}
     */
    exibirProximoAoRetangulo(retanguloSelecao) {
      if (!this.elementoBotao || !retanguloSelecao) {
        return;
      }

      const larguraEstimadaBotao = 148;
      const alturaEstimadaBotao = 34;
      const margemTela = 12;
      const larguraJanela = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const alturaJanela = typeof window !== 'undefined' ? window.innerHeight : 768;

      let coordenadaX = retanguloSelecao.right - larguraEstimadaBotao / 2;
      let coordenadaY = retanguloSelecao.bottom + 8;

      if (coordenadaY + alturaEstimadaBotao > alturaJanela - margemTela) {
        coordenadaY = Math.max(margemTela, retanguloSelecao.top - alturaEstimadaBotao - 8);
      }

      coordenadaX = Math.max(
        margemTela,
        Math.min(larguraJanela - larguraEstimadaBotao - margemTela, coordenadaX)
      );

      this.elementoBotao.style.left = `${Math.round(coordenadaX)}px`;
      this.elementoBotao.style.top = `${Math.round(coordenadaY)}px`;
      this.elementoBotao.hidden = false;
    }

    /**
     * Oculta imediatamente o botão flutuante de seleção.
     * @returns {void}
     */
    ocultar() {
      if (this.elementoBotao) {
        this.elementoBotao.hidden = true;
      }
    }

    /**
     * Informa se o botão está atualmente visível.
     * @returns {boolean}
     */
    estaVisivel() {
      return Boolean(this.elementoBotao && !this.elementoBotao.hidden);
    }
  }

  escopoGlobal.ReadForMe.BotaoFlutuanteSelecao = BotaoFlutuanteSelecao;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotaoFlutuanteSelecao;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
