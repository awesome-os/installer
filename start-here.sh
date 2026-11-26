#!/usr/bin/env sh
# Awesome-OS — Idempotent Start Here entrypoint (Linux / macOS)
set -eu

CAS_INDEX="${B8G_GHOST_CACHE_DIR:-$HOME/.b8g/cas}/v11/index.json"
if [ -f "$CAS_INDEX" ]; then
  echo "[OK] Awesome-OS v11 CAS root detected at $CAS_INDEX"
  echo "Dashboard: https://b8g.dev/awesome-os/apps/host-manager.html"
  echo "Installer: https://awesome-os.com/install/"
  exit 0
fi

echo "Bootstrapping Awesome-OS v11 CAS via https://awesome-os.com/install.sh ..."
curl -fsSL https://awesome-os.com/install.sh | sh
