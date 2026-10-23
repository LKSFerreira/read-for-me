# Guia Passo a Passo de Publicação Oficial — Chrome Web Store & Microsoft Edge Add-ons

Este documento é o roteiro completo, sequencial e sem omissões para publicar a extensão **Read For Me** na **Google Chrome Web Store** e no **Microsoft Edge Add-ons Partner Center**, garantindo uma submissão verificada, segura e com taxa máxima de aprovação de primeira tentativa.

---

## 📋 Sumário Executivo e Comparativo das Lojas

| Característica | Google Chrome Web Store | Microsoft Edge Add-ons |
|---|---|---|
| **Portal de Acesso** | [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/) | [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) |
| **Custo de Registro** | Taxa única de **US$ 5,00** (cartão internacional) | **Gratuito** (R$ 0,00) |
| **Tempo de Análise** | 24 a 72 horas úteis | 24 a 48 horas úteis |
| **Ícone da Loja** | `128×128` px (PNG) | `300×300` px (PNG) |
| **Screenshots** | `1280×800` ou `640×400` px | `1280×800` px |
| **Exigência de Política de Privacidade** | Obrigatória (URL pública) | Obrigatória (URL pública) |

---

## 🛠️ Fase 1: Pré-Requisitos e Geração do Pacote de Produção

As lojas rejeitam extensões que contenham arquivos desnecessários de desenvolvimento (como `node_modules`, pastas de testes automatizados, arquivos `.git` ou configurações de IDE).

### 1.1 Executar a Suíte de Validação
Antes de empacotar, certifique-se de que todos os 30 testes automatizados passam com sucesso:

```powershell
npm test
```

### 1.2 Gerar o Pacote `.zip` Limpo de Produção
Criamos um script automatizado que filtra estritamente os arquivos necessários (`manifest.json`, `src/`, `assets/icons/`, documentação essencial):

```powershell
npm run pacote
```

* **Arquivo gerado:** `dist/read-for-me-v1.1.0-lojas.zip`
* **Tamanho aproximado:** ~122 KB
* **Conteúdo incluído:** 33 arquivos de produção limpos e prontos para inspeção pelas equipes de compliance do Google e da Microsoft.

---

## 📄 Fase 2: Publicação da Política de Privacidade

Tanto o Google quanto a Microsoft exigem uma **URL pública acessível** para a Política de Privacidade antes de permitir o envio, porque o Read For Me utiliza `<all_urls>` para permitir a leitura em qualquer site e transmite o texto selecionado para síntese de áudio.

O arquivo oficial já está pronto no projeto em [docs/politica_de_privacidade.md](politica_de_privacidade.md).

### Como disponibilizar a URL pública da Política de Privacidade (Gratuito em 2 minutos):

**Opção Recomendada (GitHub):**
1. Acesse o seu repositório no GitHub: `https://github.com/LKSFERREIRA/read-for-me`.
2. Garanta que o commit contendo o arquivo `docs/politica_de_privacidade.md` esteja no repositório.
3. A URL pública direta para preencher nas lojas será:
   ```text
   https://github.com/LKSFERREIRA/read-for-me/blob/main/docs/politica_de_privacidade.md
   ```
*(Alternativa: você também pode colar o texto em um [GitHub Gist Público](https://gist.github.com) ou ativar o [GitHub Pages] nas configurações do repositório).*

---

## 🎨 Fase 3: Assets Visuais da Loja (Ícones e Screenshots)

### 3.1 Ícones Oficiais (Já inclusos no projeto)
* Para o Google: `assets/icons/icon-128.png` (`128×128` px).
* Para a Microsoft: `assets/icons/icon-300.png` (`300×300` px).

### 3.2 Capturas de Tela (Screenshots)
Ambas as lojas exigem pelo menos **1 screenshot** (recomendamos de **3 a 5 screenshots**) no tamanho padrão de **`1280×800` pixels** (formato PNG ou JPEG, sem transparência).

**Sugestão de roteiro para as capturas:**
1. **Screenshot 1 — Leitura Ativa no Texto:** Abra uma página de notícias ou artigo, selecione um parágrafo e mostre o destaque suave da frase e a palavra ativa com o botão flutuante.
2. **Screenshot 2 — Mini-Player Flutuante:** Mostre o mini-player moderno no topo da página exibindo o status "Lendo (Neural)", controle de velocidade e frase ativa.
3. **Screenshot 3 — Popup de Configurações (Aba Player):** Mostre o painel da extensão aberto na aba do Player com os botões de transporte e texto da sentença.
4. **Screenshot 4 — Popup de Configurações (Aba Destaque):** Mostre a personalização dos temas de destaque com a prévia em tempo real.
5. **Screenshot 5 — Popup de Configurações (Aba Opções):** Mostre a seleção de vozes Microsoft Natural e idiomas.

> **Dica para captura em `1280×800`:** No navegador, abra o DevTools (`F12`), clique no ícone de dispositivo móvel (`Ctrl+Shift+M`), defina a resolução para `1280` de largura por `800` de altura, posicione a página e clique no menu de três pontos do DevTools -> *"Capture screenshot"*.

---

## 🌐 Fase 4: Passo a Passo na Google Chrome Web Store

### Etapa 4.1: Cadastro e Taxa de Desenvolvedor
1. Acesse o console oficial: [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Faça login com a sua Conta Google.
   * *Importante:* A conta precisa ter a **Verificação em Duas Etapas (2FA)** ativada.
3. Aceite o Contrato de Desenvolvedor e efetue o pagamento da taxa única de registro de **US$ 5,00** (paga uma única vez na vida).

### Etapa 4.2: Envio do Pacote
1. No painel inicial, clique no botão azul **"Novo item"** (ou *"Add new item"*).
2. Selecione e envie o arquivo `dist/read-for-me-v1.1.0-lojas.zip`.
3. O console do Chrome descompactará e validará o `manifest.json`.

### Etapa 4.3: Preenchimento da Ficha da Loja (Listagem da Loja)
Preencha os campos com os textos prontos abaixo:

* **Nome do item:** `Read For Me — Leitor Neural de Alta Performance`
* **Descrição curta (até 132 caracteres):**
  ```text
  Leitura em voz alta de alta fidelidade com vozes neurais, prévia de áudio, mini-player flutuante e sincronização de texto por palavra.
  ```
* **Descrição detalhada:**
  ```markdown
  O Read For Me transforma qualquer página web, artigo ou documento em uma experiência de audição fluida e natural. Utilizando vozes neurais de última geração e sincronização precisa de texto palavra por palavra, a extensão é ideal para acessibilidade, estudantes e profissionais que buscam máxima produtividade.

  Principais Recursos:
  • Vozes Neurais Naturais: Síntese de fala realista com alta expressividade em português (pt-BR), inglês (en-US) e dezenas de outros idiomas.
  • Leitura Contínua e Inteligente: Comece a ouvir a partir de qualquer palavra com um clique ou selecione trechos específicos. A leitura continua automaticamente até o fim do conteúdo.
  • Sincronização Visual Dupla: Destaque suave da sentença ativa em conjunto com o realce dinâmico da palavra exata sendo pronunciada.
  • Mini-Player Flutuante Moderno: Controle play/pause, avance ou volte frases, altere a velocidade em tempo real e arraste o player livremente pela tela.
  • Personalização Completa: Ajuste temas de cores, opacidade do destaque, sublinhado e preferências visuais.
  • Modo de Privacidade Offline: Suporte a fallback local via síntese do sistema para navegação 100% desconectada.
  • Atalhos Ágeis: Pause e retome a leitura rapidamente usando Alt+Shift+S ou barra de espaço.
  ```
* **Categoria:** `Acessibilidade` (ou `Produtividade`).
* **Idioma principal:** `Português (Brasil)`.
* **Imagens:**
  * **Ícone da loja:** Envie `assets/icons/icon-128.png`.
  * **Capturas de tela:** Envie as screenshots de `1280×800` px.

### Etapa 4.4: Práticas de Privacidade (Aba Crucial para Aprovação)
O Google é extremamente rigoroso nesta aba. Preencha exatamente como orientado para evitar qualquer pendência:

1. **Justificativa de Uso Único (Single Purpose):**
   ```text
   A extensão tem como único propósito permitir que o usuário escute a leitura em voz alta (Text-to-Speech) de textos selecionados ou artigos completos em páginas web com sincronização de áudio e destaque visual.
   ```
2. **Justificativa de Permissões (Copie e Cole):**
   * **`storage`:**
     ```text
     Utilizada exclusivamente para salvar as configurações locais do usuário no navegador (voz selecionada, velocidade de reprodução, visibilidade do mini-player e preferências de cores do destaque).
     ```
   * **`contextMenus`:**
     ```text
     Necessária para adicionar a opção "Ler a partir daqui" no menu de contexto do clique direito, permitindo iniciar a leitura imediatamente em qualquer palavra da página.
     ```
   * **`offscreen`:**
     ```text
     No Manifest V3, o service worker não tem acesso ao DOM nem ao elemento de áudio. O documento offscreen é utilizado exclusivamente para reprodução dos buffers de áudio PCM/MP3 em segundo plano.
     ```
   * **`declarativeNetRequest` / `declarativeNetRequestWithHostAccess`:**
     ```text
     Utilizada estritamente para adicionar cabeçalhos técnicos de autenticação de origem e User-Agent necessários para a conexão segura via WebSocket com o serviço de síntese Edge TTS da Microsoft.
     ```
   * **`host_permissions` (`<all_urls>`):**
     ```text
     A extensão precisa injetar o script de leitura (content script) em qualquer página que o usuário esteja visitando para poder identificar o texto solicitado e renderizar os destaques visuais da leitura ativa.
     ```
3. **Uso de Dados:**
   * Marque a opção: *"Certifico que esta extensão não coleta nem usa dados de identificação pessoal dos usuários"*.
   * Marque que os dados **NÃO** são vendidos a terceiros e **NÃO** são utilizados para publicidade direcionada.
4. **URL da Política de Privacidade:**
   * Cole a URL pública: `https://github.com/LKSFERREIRA/read-for-me/blob/main/docs/politica_de_privacidade.md`.

### Etapa 4.5: Distribuição e Envio
1. Na aba **Distribuição**:
   * Visibilidade: **Pública**.
   * Regiões: **Todos os países** (ou selecione os países desejados).
2. Clique no botão azul **"Enviar para revisão"** no canto superior direito.
3. Confirme o envio. Você receberá um e-mail de confirmação da Google Web Store com o protocolo de análise.

---

## 🟦 Fase 5: Passo a Passo no Microsoft Edge Add-ons

A loja do Microsoft Edge é uma excelente vitrine (composta por milhões de usuários corporativos e domésticos no Windows) e a inscrição de desenvolvedor é **100% gratuita**.

### Etapa 5.1: Acesso ao Partner Center
1. Acesse o portal: [Microsoft Partner Center — Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge).
2. Faça login com uma Conta Microsoft (pode ser pessoal como Outlook/Hotmail ou corporativa).
3. Preencha as informações básicas do seu perfil de desenvolvedor (Nome de exibição, país e e-mail de contato). Não há cobrança de taxa.

### Etapa 5.2: Criação e Envio da Extensão
1. No painel inicial, clique em **"Create new extension"** (ou *"Criar nova extensão"*).
2. Faça o upload do arquivo `dist/read-for-me-v1.1.0-lojas.zip`.
3. O Partner Center processará o pacote e confirmará a integridade do `manifest.json`.

### Etapa 5.3: Preenchimento das Propriedades
* **Category (Categoria):** `Accessibility` (Acessibilidade) ou `Productivity` (Produtividade).
* **Support URL:** `https://github.com/LKSFERREIRA/read-for-me/issues` (ou seu e-mail de suporte).
* **Privacy Policy URL:** `https://github.com/LKSFERREIRA/read-for-me/blob/main/docs/politica_de_privacidade.md`.

### Etapa 5.4: Ficha da Loja no Edge
* **Store Display Name:** `Read For Me — Leitor Neural de Alta Performance`
* **Short Description:**
  ```text
  Leitura contínua em voz alta com vozes neurais naturais, mini-player arrastável e sincronização precisa por palavra.
  ```
* **Detailed Description:** Use a mesma descrição estruturada da Seção 4.3.
* **Ícone da Loja:** Envie `assets/icons/icon-300.png` (`300×300` px).
* **Screenshots:** Envie as capturas de tela `1280×800` px.

### Etapa 5.5: Notas para a Certificação (Notes for Certification)
A Microsoft conta com revisores humanos que leem este campo para testar a extensão. Cole o texto abaixo:

```text
Olá equipe de revisão do Microsoft Edge,

O Read For Me é uma extensão de acessibilidade que realiza leitura em voz alta (Text-to-Speech) de textos na web com vozes naturais.

Passos simples para testar a extensão:
1. Abra qualquer página web pública (por exemplo, um artigo da Wikipédia ou portal de notícias).
2. Selecione qualquer frase ou parágrafo com o mouse.
3. Observe o botão flutuante "Ler a partir daqui" que surge próximo à seleção (ou clique com o botão direito no texto e escolha "Ler a partir daqui").
4. A leitura iniciará com voz neural natural, o mini-player flutuante surgirá no topo da página e as sentenças e palavras faladas serão sincronizadas com destaques visuais elegantes e não destrutivos via CSS Custom Highlight API.
5. Clique no ícone da extensão na barra de ferramentas para abrir o painel de configurações (onde é possível testar a prévia de áudio, trocar de voz e calibrar os tons de destaque).

A extensão não coleta dados pessoais e opera em total conformidade com o Manifest V3. Agradecemos pela revisão!
```

### Etapa 5.6: Enviar para Publicação
1. Clique em **"Publish"** (ou *"Publicar"*).
2. O status mudará para *"Under Review"* (Em Análise). O tempo médio de resposta é de 1 a 2 dias úteis.

---

## 🛡️ Fase 6: Checklist Anti-Rejeição (Boas Práticas de Homologação)

| Item Verificado | Status no Read For Me | Motivo de Segurança |
|---|---|---|
| **Manifest V3 Nativo** | ✅ Conforme | Utiliza Service Worker e Documento Offscreen sem scripts de background legados V2. |
| **Código sem Ofuscação** | ✅ Conforme | Todo o código JavaScript é limpo, legível e modularizado, sem compilações opacas ou eval. |
| **Sem Scripts Remotos** | ✅ Conforme | Todo o código executável está empacotado localmente no ZIP (proibição absoluta de CDN externa). |
| **CSS Custom Highlight API** | ✅ Conforme | Não quebra o DOM de páginas SPAs nem injeta elementos intrusivos no HTML original. |
| **Shadow DOM Isolado** | ✅ Conforme | O Mini-Player e o botão flutuante não vazam nem sofrem interferência de CSS da página hospedeira. |
| **Política de Privacidade Ativa** | ✅ Conforme | Documento transparente cobrindo o processamento pontual de texto via WSS e modo local. |

---

## 🔄 Fase 7: Como Lançar Atualizações Futuras (Ex: v1.2.0)

Quando você implementar novos recursos ou melhorias na extensão:

1. No arquivo [manifest.json](file:///c:/Users/LKSFERREIRA/Documents/GitHub/read-for-me/manifest.json#L5), incremente a versão (ex: `"version": "1.2.0"`).
2. No arquivo [package.json](file:///c:/Users/LKSFERREIRA/Documents/GitHub/read-for-me/package.json#L3), atualize para a mesma versão.
3. Gere o novo pacote:
   ```powershell
   npm run pacote
   ```
4. No **Chrome Developer Dashboard**:
   * Abra a extensão -> clique em **"Carregar pacote atualizado"** -> envie o novo ZIP -> clique em **"Enviar para revisão"**.
5. No **Microsoft Partner Center**:
   * Abra a extensão -> clique em **"Update"** -> envie o novo ZIP -> clique em **"Publish"**.
6. A atualização é distribuída de forma 100% automática e silenciosa para todos os usuários que já têm a extensão instalada no navegador assim que for aprovada!
