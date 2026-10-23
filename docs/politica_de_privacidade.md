# Política de Privacidade — Read For Me

**Última atualização:** 23 de outubro de 2026  
**Versão:** 1.1.0  
**Extensão:** Read For Me — Leitor Neural de Alta Performance

---

## 1. Visão Geral e Compromisso de Privacidade

A extensão **Read For Me** foi desenvolvida com o princípio fundamental de **Privacidade por Padrão (Privacy by Design)**. Nossa finalidade exclusiva é oferecer uma ferramenta de acessibilidade e produtividade para leitura de textos em voz alta (Text-to-Speech) em páginas web.

Nós **NÃO** coletamos, **NÃO** armazenamos em servidores próprios, **NÃO** rastreamos e **NÃO** comercializamos quaisquer dados pessoais, histórico de navegação, endereços IP, cookies, credenciais ou informações de identificação dos usuários.

---

## 2. Dados Processados e Como São Utilizados

### 2.1 Texto Selecionado para Leitura
* **Finalidade:** Quando você solicita a leitura de um parágrafo, sentença ou artigo (via clique no botão flutuante, menu de contexto ou atalho de teclado), o texto da sentença ativa é processado exclusivamente para gerar o áudio da fala.
* **Processamento com Vozes Naturais Online (Microsoft Edge TTS):** O trecho textual a ser lido é enviado em tempo real por meio de conexão segura e criptografada (HTTPS/WSS) para o serviço de síntese da Microsoft (`speech.platform.bing.com`). Esse envio ocorre estritamente para converter o texto em áudio. O texto não é vinculado a nenhuma conta ou identidade de usuário e é descartado da memória após a conclusão da reprodução.
* **Modo Offline / Voz do Sistema (Fallback Local):** Caso você configure a extensão no modo de privacidade *"Voz do Sistema (Offline)"*, a síntese é realizada de forma 100% local no seu próprio dispositivo através da Web Speech API nativa do navegador, sem nenhum tráfego de dados para a internet.

### 2.2 Preferências e Configurações da Extensão
* **O que é armazenado:** Suas escolhas de personalização (voz selecionada, velocidade de leitura, idioma de preferência, cores e opacidade dos highlights de texto e visibilidade do Mini-Player).
* **Onde é armazenado:** Exclusivamente no armazenamento local do seu próprio navegador (`chrome.storage.local`). Essas configurações nunca saem do seu computador e não são enviadas para nenhum servidor externo.

---

## 3. Permissões Solicitadas e Justificativas Técnicas

Em estrita conformidade com as políticas do Google Chrome Web Store e do Microsoft Edge Add-ons, a extensão solicita apenas as permissões indispensáveis para seu funcionamento técnico:

| Permissão | Justificativa de Uso |
|---|---|
| `storage` | Salvar suas preferências de voz, velocidade e cores de destaque localmente no navegador. |
| `contextMenus` | Disponibilizar a opção "Ler a partir daqui" no menu de clique direito do mouse. |
| `offscreen` | Permitir o decodificador e reprodutor de áudio tocar sem interrupções em segundo plano no Manifest V3. |
| `declarativeNetRequest` | Inserir de forma segura cabeçalhos técnicos de autenticação para conexão com a API de voz natural. |
| `host_permissions` (`<all_urls>`) | Permitir que o script de leitura seja executado em qualquer site em que você escolher ler um conteúdo. |

---

## 4. Compartilhamento e Venda de Dados

* **Venda de dados:** Não vendemos, alugamos ou comercializamos dados de usuários para corretores de dados, anunciantes ou redes de publicidade.
* **Transferência a terceiros:** Não transferimos dados de usuários para fins de publicidade direcionada, análise comportamental ou avaliação de crédito.
* **Treinamento de Modelos de IA:** Não utilizamos os textos lidos pelos usuários para treinar modelos fundacionais de inteligência artificial.

---

## 5. Segurança da Informação

Todas as comunicações com os pontos de extremidade de síntese de áudio utilizam transporte criptografado padrão da indústria (Transport Layer Security - TLS/SSL via HTTPS e WSS). A arquitetura em Manifest V3 isola a interface gráfica do leitor dentro de um Shadow DOM, impedindo que scripts maliciosos de páginas terceiras interfiram nas configurações da extensão.

---

## 6. Direitos do Usuário (LGPD e GDPR)

Como a extensão opera localmente no navegador do usuário e não mantém banco de dados centralizado de usuários:
* Você pode redefinir ou apagar todas as configurações salvas a qualquer momento limpando os dados da extensão nas configurações do navegador ou simplesmente desinstalando a extensão.
* Ao desinstalar o Read For Me, todas as preferências locais são sumariamente excluídas pelo próprio navegador.

---

## 7. Contato e Suporte

Caso tenha dúvidas, sugestões ou solicitações sobre esta Política de Privacidade ou sobre o funcionamento da extensão, entre em contato através do repositório oficial ou por e-mail:

* **Repositório Oficial:** [https://github.com/LKSFERREIRA/read-for-me](https://github.com/LKSFERREIRA/read-for-me)
* **Canal de Suporte e Privacidade:** `lks_ferreira@hotmail.com`
