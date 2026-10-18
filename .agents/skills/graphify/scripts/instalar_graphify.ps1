[CmdletBinding()]
param(
    [switch]$SemBuild
)

$ErrorActionPreference = "Stop"

function Test-Comando {
    param([string]$Nome)
    try { Get-Command $Nome -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

function Instalar-Uv {
    if (Test-Comando "uv") {
        Write-Output "[graphify] uv ja instalado: $(uv --version)"
        return
    }
    Write-Output "[graphify] uv ausente. Instalando..."
    if (Test-Comando "winget") {
        winget install astral-sh.uv
    }
    elseif (Test-Comando "curl") {
        curl -LsSf https://astral.sh/uv/install.sh | sh
    }
    else {
        throw "uv nao encontrado e nenhum installer disponivel (winget/curl). Instale o uv manualmente: https://docs.astral.sh/uv/getting-started/installation/"
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "Machine")
}

function Instalar-GraphifyCli {
    if (Test-Comando "graphify") {
        Write-Output "[graphify] CLI ja instalado: $(graphify --version)"
        return
    }
    Write-Output "[graphify] Instalando graphifyy via uv..."
    uv tool install graphifyy
    if (-not (Test-Comando "graphify")) {
        Write-Output "[graphify] graphify ainda nao encontrado apos uv. Tentando pipx..."
        if (Test-Comando "pipx") {
            pipx install graphifyy
        }
        elseif (Test-Comando "pip") {
            pip install graphifyy
        }
        else {
            throw "Nao foi possivel instalar o graphify (uv/pipx/pip indisponiveis)."
        }
    }
    if (-not (Test-Comando "graphify")) {
        Write-Output "[graphify] Execute 'uv tool update-shell' (ou 'pipx ensurepath') e abra um novo terminal, depois rode novamente."
        throw "graphify nao encontrado no PATH apos instalacao."
    }
}

function Registrar-Plataforma {
    param([string]$Plataforma)
    Write-Output "[graphify] Registrando $Plataforma (--project)..."
    & graphify $Plataforma install --project
    if ($LASTEXITCODE -ne 0) {
        Write-Output "[graphify] '$Plataforma install --project' falhou (codigo $LASTEXITCODE); tentando sem --project..."
        & graphify $Plataforma install
    }
}

Instalar-Uv
Instalar-GraphifyCli

$Plataformas = @("claude", "codex", "kilo", "copilot", "antigravity")
foreach ($Plataforma in $Plataformas) {
    Registrar-Plataforma -Plataforma $Plataforma
}

if (-not $SemBuild) {
    Write-Output "[graphify] Gerando grafo inicial (graphify .)..."
    graphify .
}
else {
    Write-Output "[graphify] Build ignorado (flag -SemBuild)."
}

Write-Output "[graphify] Concluido. Sugestao de git add conforme plataformas registradas + graphify-out/."
