import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const diretorioRaiz = path.resolve(import.meta.dirname, '..');
const caminhoManifesto = path.join(diretorioRaiz, 'manifest.json');

describe('Validação de Integridade do manifest.json (Chromium Manifest V3)', () => {
  const conteudoManifesto = JSON.parse(fs.readFileSync(caminhoManifesto, 'utf-8'));

  it('deve declarar manifest_version 3 e minimum_chrome_version >= 116', () => {
    expect(conteudoManifesto.manifest_version).toBe(3);
    expect(Number(conteudoManifesto.minimum_chrome_version)).toBeGreaterThanOrEqual(116);
  });

  it('não deve conter esquemas inválidos (wss:// ou ws://) em host_permissions nem activeTab sem uso', () => {
    const permissoesHost = conteudoManifesto.host_permissions || [];
    for (const padrao of permissoesHost) {
      expect(padrao.startsWith('wss://')).toBe(false);
      expect(padrao.startsWith('ws://')).toBe(false);
    }
    expect(permissoesHost).toContain('https://speech.platform.bing.com/*');
    expect(conteudoManifesto.permissions).not.toContain('activeTab');
  });

  it('deve apontar para arquivos de ícones, service_worker, css e content_scripts fisicamente existentes no projeto', () => {
    const caminhosParaVerificar = [];

    if (conteudoManifesto.icons) {
      caminhosParaVerificar.push(...Object.values(conteudoManifesto.icons));
    }
    if (conteudoManifesto.background && conteudoManifesto.background.service_worker) {
      caminhosParaVerificar.push(conteudoManifesto.background.service_worker);
    }
    for (const blocoContent of conteudoManifesto.content_scripts || []) {
      caminhosParaVerificar.push(...(blocoContent.css || []));
      caminhosParaVerificar.push(...(blocoContent.js || []));
    }

    for (const caminhoRelativo of caminhosParaVerificar) {
      const caminhoAbsoluto = path.join(diretorioRaiz, caminhoRelativo);
      expect(
        fs.existsSync(caminhoAbsoluto),
        `Arquivo referenciado no manifest.json não encontrado: ${caminhoRelativo}`
      ).toBe(true);
    }

    // Verifica também o ícone de 300x300 para loja Microsoft Edge Add-ons
    expect(fs.existsSync(path.join(diretorioRaiz, 'assets/icons/icon-300.png'))).toBe(true);
  });

  it('deve garantir que nenhum arquivo listado em content_scripts.js possua sintaxe export/import top-level incompatível com Classic Script', () => {
    for (const blocoContent of conteudoManifesto.content_scripts || []) {
      for (const arquivoJs of blocoContent.js || []) {
        const codigoFonte = fs.readFileSync(path.join(diretorioRaiz, arquivoJs), 'utf-8');
        expect(
          /^\s*(export|import)\s+/m.test(codigoFonte),
          `O arquivo de Content Script ${arquivoJs} não pode conter import/export top-level.`
        ).toBe(false);
      }
    }
  });
});
