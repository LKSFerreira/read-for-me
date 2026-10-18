#!/usr/bin/env bash
set -euo pipefail

SEM_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --sem-build) SEM_BUILD=1 ;;
  esac
done

comando_existe() { command -v "$1" >/dev/null 2>&1; }

instalar_uv() {
  if comando_existe uv; then
    echo "[graphify] uv ja instalado: $(uv --version)"
    return
  fi
  echo "[graphify] uv ausente. Instalando..."
  if comando_existe curl; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
  else
    echo "[graphify] curl indisponivel. Instale o uv manualmente: https://docs.astral.sh/uv/getting-started/installation/" >&2
    exit 1
  fi
  # Atualiza PATH para a sessao atual
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
}

instalar_graphify_cli() {
  if comando_existe graphify; then
    echo "[graphify] CLI ja instalado: $(graphify --version)"
    return
  fi
  echo "[graphify] Instalando graphifyy via uv..."
  uv tool install graphifyy
  if ! comando_existe graphify; then
    echo "[graphify] graphify ausente apos uv. Tentando pipx..."
    if comando_existe pipx; then
      pipx install graphifyy
    elif comando_existe pip; then
      pip install graphifyy
    else
      echo "[graphify] Nao foi possivel instalar o graphify (uv/pipx/pip indisponiveis)." >&2
      exit 1
    fi
  fi
  if ! comando_existe graphify; then
    echo "[graphify] Execute 'uv tool update-shell' (ou 'pipx ensurepath') e abra um novo terminal, depois rode novamente." >&2
    exit 1
  fi
}

registrar_plataforma() {
  local plataforma="$1"
  echo "[graphify] Registrando $plataforma (--project)..."
  if ! graphify "$plataforma" install --project; then
    echo "[graphify] '$plataforma install --project' falhou; tentando sem --project..."
    graphify "$plataforma" install
  fi
}

instalar_uv
instalar_graphify_cli

PLATAFORMAS=(claude codex kilo copilot antigravity)
for plataforma in "${PLATAFORMAS[@]}"; do
  registrar_plataforma "$plataforma"
done

if [ "$SEM_BUILD" -eq 0 ]; then
  echo "[graphify] Gerando grafo inicial (graphify .)..."
  graphify .
else
  echo "[graphify] Build ignorado (--sem-build)."
fi

echo "[graphify] Concluido. Sugestao de git add conforme plataformas registradas + graphify-out/."
