# Awesome-OS Installer (`awesome-os/installer`)

> **Unified declarative `.mts` release matrix, pixel-aligned DPI-aware Lumi splash/icon stamper, and SHA-256 verified `install.ps1` / `install.sh` generator — switch seamlessly between GitHub Releases and static web hosting (`awesome-os.com/downloads`) with zero rebuilds.**

## Why?
Instead of hand-maintaining separate `install.ps1`, `install.sh`, and splash icon coordinates in 30+ repos, every Awesome-OS app/runtime is defined once in a typed `.mts` catalog (`catalog/awesome-os-apps.mts`):

```bash
# Stamp installers pointing at GitHub Releases (default)
node src/cli.mts stamp --out ./dist

# Or switch to self-hosted webpage distribution (awesome-os.com/downloads) — zero GitHub rebuilds!
node src/cli.mts stamp --out ./dist-web --web-host https://awesome-os.com/downloads
```

## What It Stamps Per App
- `install.ps1` — Windows 1-line SHA-256 verified installer (+ Start Menu shortcut for GUI apps)
- `install.sh` — Linux (x64/ARM64) & macOS (Apple Silicon) 1-line SHA-256 verified installer (+ `.desktop` entry)
- `splash_layout.h` — Pixel-exact centered DPI-aware Lumi splash geometry (`AWESOME_SPLASH_ICON_X`, `AWESOME_SPLASH_DPI_AWARE`)
- `release-manifest.json` + root `web-catalog.json` — Ready to drop directly onto `awesome-os.com`

## Quick Verification
```bash
node --test test/installer.test.mts
```
