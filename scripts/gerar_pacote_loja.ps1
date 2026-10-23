<#
.SYNOPSIS
    Script automatizado para gerar o pacote ZIP de distribuição do Read For Me
    pronto para submissão na Google Chrome Web Store e Microsoft Edge Add-ons.

.DESCRIPTION
    Cria uma pasta temporária isolada com apenas os arquivos de produção necessários
    (Manifest V3, src, assets e documentação essencial), excluindo testes, node_modules,
    metadados de agentes e configurações de desenvolvimento, e compacta em formato .zip.
#>

$ErrorActionPreference = "Stop"

$diretorioRaiz = (Get-Item $PSScriptRoot).Parent.FullName
$caminhoManifest = Join-Path $diretorioRaiz "manifest.json"

if (-not (Test-Path $caminhoManifest)) {
    Write-Error "Arquivo manifest.json não encontrado na raiz do projeto: $caminhoManifest"
    exit 1
}

$manifestConteudo = Get-Content $caminhoManifest -Raw -Encoding UTF8 | ConvertFrom-Json
$versao = $manifestConteudo.version
Write-Host "📦 Preparando pacote de distribuição para Read For Me (v$versao)..." -ForegroundColor Cyan

# Diretórios de saída e staging temporário
$pastaDist = Join-Path $diretorioRaiz "dist"
$pastaStaging = Join-Path $pastaDist "staging_read_for_me"
$arquivoZipFinal = Join-Path $pastaDist "read-for-me-v$versao-lojas.zip"

if (Test-Path $pastaDist) {
    if (Test-Path $pastaStaging) {
        Remove-Item -Path $pastaStaging -Recurse -Force
    }
    if (Test-Path $arquivoZipFinal) {
        Remove-Item -Path $arquivoZipFinal -Force
    }
} else {
    New-Item -Path $pastaDist -ItemType Directory -Force | Out-Null
}

New-Item -Path $pastaStaging -ItemType Directory -Force | Out-Null

Write-Host "📂 Copiando arquivos essenciais de produção..." -ForegroundColor Yellow

# 1. Copiar manifest.json
Copy-Item (Join-Path $diretorioRaiz "manifest.json") (Join-Path $pastaStaging "manifest.json") -Force

# 2. Copiar pasta src/
Copy-Item (Join-Path $diretorioRaiz "src") (Join-Path $pastaStaging "src") -Recurse -Force

# 3. Copiar pasta assets/icons/
$stagingAssetsIcons = Join-Path $pastaStaging "assets\icons"
New-Item -Path $stagingAssetsIcons -ItemType Directory -Force | Out-Null
Copy-Item (Join-Path $diretorioRaiz "assets\icons\*") $stagingAssetsIcons -Force

# 4. Copiar documentação pública de suporte
Copy-Item (Join-Path $diretorioRaiz "README.md") (Join-Path $pastaStaging "README.md") -Force
if (Test-Path (Join-Path $diretorioRaiz "docs\politica_de_privacidade.md")) {
    Copy-Item (Join-Path $diretorioRaiz "docs\politica_de_privacidade.md") (Join-Path $pastaStaging "politica_de_privacidade.md") -Force
}

# 5. Criar arquivo ZIP a partir do staging
Write-Host "🗜️ Compactando arquivos para formato ZIP..." -ForegroundColor Yellow
Compress-Archive -Path "$pastaStaging\*" -DestinationPath $arquivoZipFinal -Force

# 6. Remover pasta de staging
Remove-Item -Path $pastaStaging -Recurse -Force

$tamanhoBytes = (Get-Item $arquivoZipFinal).Length
$tamanhoKb = [Math]::Round($tamanhoBytes / 1024, 2)

Write-Host "`n✅ Pacote gerado com sucesso!" -ForegroundColor Green
Write-Host "📍 Arquivo final: $arquivoZipFinal" -ForegroundColor White
Write-Host "📊 Tamanho: $tamanhoKb KB ($tamanhoBytes bytes)" -ForegroundColor White
Write-Host "🚀 Este arquivo .zip está pronto para envio no Chrome Web Store e Microsoft Edge Partner Center.`n" -ForegroundColor Cyan
