# Tutorial de Teste, Validação e Publicação — Read For Me

Este guia apresenta o roteiro completo para validar a extensão **Read For Me** tanto via testes automatizados quanto manualmente nos navegadores **Microsoft Edge** e **Brave**, além das instruções para publicação nas lojas oficiais.

---

## 1. Validação Automatizada (Suíte Vitest + JSDOM)

O projeto possui uma suíte de testes unitários e de integração em `tests/` (26 testes em 6 arquivos) que valida o protocolo binário/JSON do WebSocket Edge TTS, o alinhamento de `WordBoundary`, o *Sentence Chunking*, a leitura contínua a partir de qualquer palavra/letra ou clique direito até o fim do conteúdo, a remoção automática da seleção nativa, a personalização de highlights, o arraste do player, a reidratação do Service Worker e a integridade do `manifest.json`.

### 1.1 Executar todos os testes
No terminal, na raiz do projeto, execute:

```powershell
npm test
```

---

## 2. Como Atualizar / Recarregar a Extensão no Microsoft Edge e no Brave

> **Importante:** Sempre que o `manifest.json` ou o `service_worker.js` recebem novas opções de menu de contexto e Popup, é necessário clicar no botão **Recarregar (🔄)** na página de extensões do navegador e atualizar (`F5`) a aba web onde você vai testar.

1. Abra `edge://extensions` (no Edge) ou `brave://extensions` (no Brave).
2. No cartão **Read For Me — Leitor Neural de Alta Performance**, clique no ícone **Recarregar (🔄)**.
3. Fixe o ícone do **Read For Me** na barra de ferramentas do navegador (clicando no ícone de quebra-cabeça de extensões -> **Fixar / Pin**) para abrir facilmente o **Painel de Configurações e Controle**.
4. Pressione `F5` na página web onde fará os testes.

---

## 3. Roteiro Passo a Passo das Funcionalidades e Correções

### Teste 1: Abrir o Painel de Configurações, Trocar de Voz e Ouvir Prévia (Preview)
1. Clique no ícone do **Read For Me** na barra superior do navegador (ou clique com o botão direito no ícone da extensão e escolha **Opções**):
   - **Resultado esperado:** Abre o **Painel de Configurações e Controle** com a nova identidade visual editorial/acústica.
2. Na seção **Voz e Velocidade**:
   - Escolha um idioma no filtro (`Todos os idiomas`, `Português (pt-BR)`, `Inglês (en-US)`).
   - Escolha qualquer voz no seletor **Voz selecionada** (você pode trocar a voz a qualquer momento, antes ou durante uma leitura!).
   - Clique no botão **"🔊 Ouvir prévia da voz"**:
   - **Resultado esperado:** A extensão sintetiza e reproduz imediatamente uma frase de demonstração na voz e velocidade selecionadas para você avaliar antes de ler.

### Teste 2: "Ler a partir daqui" (Sem precisar selecionar texto ou a partir de 1 palavra/letra)
1. **Sem selecionar nada:** Em qualquer artigo ou página web, clique com o **botão direito do mouse** diretamente em cima de qualquer palavra no meio de um parágrafo e clique em **"Ler a partir daqui"** no menu de contexto:
   - **Resultado esperado:** A leitura começa imediatamente a partir daquela palavra exata e **continua buscando e lendo todas as próximas sentenças e parágrafos seguintes até o fim do conteúdo da página**.
2. **Selecionando apenas uma letra ou uma palavra:** Selecione apenas uma palavra (ou uma única letra) e clique na pílula **"Ler a partir daqui"** (ou use o menu de contexto):
   - **Resultado esperado:**
     1. A seleção azul nativa do navegador **é desfeita automaticamente** no instante em que a leitura começa, evitando qualquer contaminação visual sobre o highlight.
     2. O leitor lê a frase a partir daquela letra/palavra e **continua lendo todas as próximas sentenças até encontrar o fim do conteúdo** (incluindo novos parágrafos carregados dinamicamente).
3. **Ler apenas um recorte específico (Opcional):** Caso deseje ler estritamente um trecho selecionado e parar, selecione o trecho, clique com o botão direito e escolha **"Ler apenas o trecho selecionado"** (ou desmarque a chave *"Continuar lendo até o fim da página"* nas Configurações).

### Teste 3: Personalização dos Highlights
1. Ao iniciar a leitura, o highlight acompanha a fala no texto e o player flutuante é exibido na página (comportamento padrão).
2. Abra o **Painel de Configurações** clicando no ícone da extensão e vá até a aba **Destaque**:
   - Teste os temas rápidos e observe a **caixa de pré-visualização ao vivo** dentro do painel e a atualização instantânea na página.
   - Altere livremente a **Cor da frase**, o controle deslizante de **Intensidade (opacidade)**, a **Cor de fundo da palavra**, a **Cor do texto da palavra** e a opção **Sublinhar**.

### Teste 4: Player Flutuante na Página
1. O player vem **habilitado por padrão**. Para desativá-lo, abra a aba **Opções** e desmarque **"Player flutuante na página"**:
   - **Resultado esperado:** O Mini-Player some imediatamente, sem interromper a leitura. Marque novamente para reexibi-lo.
2. **Arrastar durante a leitura:** Enquanto a leitura está em andamento, clique e segure em **qualquer área livre do Mini-Player** (cabeçalho, lateral, rodapé ou espaço entre botões) e arraste-o pela tela:
   - **Resultado esperado:** O player acompanha o ponteiro suavemente em tempo real sem travar durante a reprodução e salva a nova posição.
3. No cabeçalho do Mini-Player, clique no botão **"Ocultar"** se quiser escondê-lo sem interromper a leitura.

---

## 4. Nova Identidade Visual e Assets para Lojas (`assets/icons/`)

Os ícones oficiais foram redesenhados com direção de arte **Editorial / Acústica Analógica** (chassi em Obsidiana Grafite `#0B0F17`, folha empilhada em Papel Marfim `#FAF7F2`, pílula de leitura em Laranja Internacional `#FF5500` projetando-se para fora da página e espectro de frequência em Ouro Acústico `#FFB800`):

- `assets/icons/icon.svg` (Matriz vetorial escalável)
- `assets/icons/icon-16.png` (`16×16` px — Barra de ferramentas e menu de contexto)
- `assets/icons/icon-32.png` (`32×32` px — Telas de alta densidade / Windows)
- `assets/icons/icon-48.png` (`48×48` px — Gerenciador `edge://extensions` e `brave://extensions`)
- `assets/icons/icon-128.png` (`128×128` px — Instalação e **Google Chrome Web Store**)
- `assets/icons/icon-300.png` (`300×300` px — Vitrine do **Microsoft Edge Add-ons Partner Center**)

### Como gerar o pacote `.zip` para publicação nas lojas
```powershell
Compress-Archive -Path manifest.json, src, assets, README.md -DestinationPath read-for-me-store-package.zip -Force
```
