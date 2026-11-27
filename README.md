# Awesome-OS Installer (`awesome-os/installer`)

> **Unified declarative `.mts` release matrix, pixel-aligned DPI-aware Lumi splash/icon stamper, and SHA-256 verified `install.ps1` / `install.sh` generator — switch seamlessly between GitHub Releases and static web hosting (`awesome-os.github.io/installer`) with zero rebuilds.**

## Why?
Instead of hand-maintaining separate `install.ps1`, `install.sh`, and splash icon coordinates in 30+ repos, every Awesome-OS app/runtime is defined once in a typed `.mts` catalog (`catalog/awesome-os-apps.mts`):

```bash
# Stamp installers pointing at GitHub Releases (default)
node src/cli.mts stamp --out ./dist

# Or switch to self-hosted webpage distribution (awesome-os.github.io/installer/downloads) — zero GitHub rebuilds!
node src/cli.mts stamp --out ./dist-web --web-host https://awesome-os.github.io/installer/downloads
```

## What It Stamps Per App
- `install.ps1` — Windows 1-line SHA-256 verified installer (+ Start Menu shortcut for GUI apps)
- `install.sh` — Linux (x64/ARM64) & macOS (Apple Silicon) 1-line SHA-256 verified installer (+ `.desktop` entry)
- `splash_layout.h` — Pixel-exact centered DPI-aware Lumi splash geometry (`AWESOME_SPLASH_ICON_X`, `AWESOME_SPLASH_DPI_AWARE`)
- `release-manifest.json` + root `web-catalog.json` — Ready to drop directly onto `awesome-os.github.io/installer/`

## Browser Direct-Drop Installer (`https://awesome-os.github.io/installer/`)

[`web/opfs-installer.html`](web/opfs-installer.html) is a zero-download, zero-CDN browser installer deployed live at **`https://awesome-os.github.io/installer/`** ([`opfs-installer.html`](https://awesome-os.github.io/installer/opfs-installer.html)):

- **Local Folder Picker (`window.showDirectoryPicker({ mode: 'readwrite' })`):** Let users pick **any local install directory** (e.g. `D:\AwesomeOS`, `~/awesome-os`, or a removable drive) and directly materialize the SHA-512 verified `v11` CAS layout (`cas/v11/files/<aa>/<sha512>`, `bin/holo.ps1`, `bin/holo.sh`, `manifest/system-profile.json`, `manifest/v11-tree.json`).
- **Browser OPFS Staging (`navigator.storage.getDirectory()`):** Offline/universal fallback that stages the full `v11` bundle in Origin Private File System with live tree inspection and 1-click **Sync OPFS → Local Folder**.
- **Full Profile & Graphics Matrix:** Supports all 8 `system://profile/*` presets (`workstation-omarchy`, `workstation-noctalia`, `workstation-sectium`, `workstation-chonkstep`, `workstation-gnome`, `workstation-kde`, `workstation-omarchy-m1`, `baseline-t2sde`), selectable `+ Advanced Graphics` (Wayland + WebGPU + default rootless `Xwayland`), and `system://driver-set/*` tracks.

## Quick Verification, Clean-Box Stranger E2E & `holo-ci@v1`

- **Clean-Box Stranger E2E ([`.github/workflows/clean-box-stranger-e2e.yml`](.github/workflows/clean-box-stranger-e2e.yml)):** Runs with **zero `actions/checkout`** on both `ubuntu-latest` and `windows-latest`, verifying live HTTP 200 endpoints (`awesome-os.github.io/installer/`, `v11-bundle.json`, `awesome-os.github.io/agent-platform/`), Ed25519 + SHA-512 cryptographic signatures over `v11-bundle.json`, signed `v1.0.0` release assets, and live compiled `holo-devtools-launcher` + `libsample_engine_plugin.so` (`B8G_ABI_MAGIC_V3 = 0x33564742`) execution on `ubuntu-latest`.
- **Centralized CI (`holo-ci@v1`):** Enforced via [`.github/workflows/holo-ci.yml`](.github/workflows/holo-ci.yml) and [`holo-ci.json`](holo-ci.json).

```bash
node --test test/installer.test.mts
holo-ci verify --cwd .
```

## Quick Install & Run (Windows / Linux / macOS)

```sh
# Install / hydrate from v11 CAS via holo-pm
holo-pm install repository://github.com/awesome-os/installer@main

# Or project & run directly via holo-project (0-byte hardlink)
holo-project "project://node/installer?from=repository://github.com/awesome-os/installer@main"
```
