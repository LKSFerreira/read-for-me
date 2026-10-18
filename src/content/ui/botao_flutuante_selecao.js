/**
 * Botão flutuante discreto exibido dentro da ShadowRoot próximo à seleção de texto do usuário.
 */
(function inicializarBotaoFlutuanteSelecao(escopoGlobal) {
  escopoGlobal.ReadForMe = escopoGlobal.ReadForMe || {};

  class BotaoFlutuanteSelecao {
    /**
     * @param {ShadowRoot} raizShadow - ShadowRoot hospedeira da extensão.
     * @param {function(): void} aoAcionarLeitura - Callback disparado ao clicar em "Ler seleção".
     */
    constructor(raizShadow, aoAcionarLeitura) {
      this.raizShadow = raizShadow;
      this.aoAcionarLeitura = aoAcionarLeitura;
      this.elementoBotao = null;
      this.construirElemento();
    }

    /**
     * Cria o botão dentro da ShadowRoot com ícone SVG e acessibilidade.
     * @returns {void}
     */
    construirElemento() {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'botao-flutuante-selecao';
      botao.hidden = true;
      botao.setAttribute('aria-label', 'Ler texto selecionado em voz alta');
      botao.innerHTML = `
        <svg class="icone-onda-audio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
        <span>Ler seleção</span>
      `;

      // Previne que o mousedown no botão desfaça a seleção de texto da página antes do clique
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

      const larguraEstimadaBotao = 122;
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
