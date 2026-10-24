# Diagnóstico: TypeError em tabs.sendMessage com tabId Inválido (< 0)

## Localização do Problema

- **Arquivo:** [`src/background/service_worker.js`](file:///c:/Users/LKSFERREIRA/Documents/GitHub/read-for-me/src/background/service_worker.js)
- **Linhas afetadas:** Linhas 38 e 96
- **Linha apontada pelo Chromium:** Linha 51 (`chrome.tabs.sendMessage(...)`)

---

## Mensagem de Erro

```text
Error in event handler: TypeError: Error in invocation of tabs.sendMessage(integer tabId, any message, optional object options, optional function callback): Error at parameter 'tabId': Value must be at least 0. at chrome-extension://.../src/background/service_worker.js:51:14
```

---

## Causa Raiz

No handler de clique do menu de contexto (`chrome.contextMenus.onClicked.addListener`):

```javascript
// Linha 38:
if (!abaAlvo || typeof abaAlvo.id !== 'number') {
  return;
}
```

Quando o menu de contexto é acionado fora de uma aba web comum (por exemplo, em janelas de popup da extensão, telas de configurações internas, Developer Tools ou painéis laterais), a API do Chrome define `abaAlvo.id` como `chrome.tabs.TAB_ID_NONE`, cujo valor numérico é `-1`.

Como `-1` é do tipo `'number'`, a validação `typeof abaAlvo.id !== 'number'` é avaliada como `false` (ou seja, permite prosseguir). Em seguida, a chamada `chrome.tabs.sendMessage(-1, ...)` é executada na linha 51, sendo rejeitada pela validação de esquema da API do Chromium que exige `tabId >= 0` ("Value must be at least 0").

O mesmo risco existe no atalho de teclado na linha 96 (`chrome.commands.onCommand`), onde `primeiraAba.id` também deve ser validado para garantir que seja `>= 0`.

---

## Correção Necessária

Adicionar a verificação explícita `abaAlvo.id < 0` (ou `abaAlvo.id >= 0`) nas guard clauses antes de invocar `chrome.tabs.sendMessage`:

```javascript
if (!abaAlvo || typeof abaAlvo.id !== 'number' || abaAlvo.id < 0) {
  return;
}
```
