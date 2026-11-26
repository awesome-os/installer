# Awesome-OS `v11` Ecosystem Scoreboard

> Auto-updated daily by [`scripts/sync-ecosystem-reports.mts`](../scripts/sync-ecosystem-reports.mts) · Last sync: `2026-11-26T07:23:30.565Z`

## 1. 9-Runtime Big Boys `v11` CAS Coverage

- **Runtimes at 100% Coverage:** **6 / 9**
- **Standalone Disk Collapsed into 1 Shared `v11` CAS Layer:** **1.932 MB**
- **V8 Shared Baseline:** `16.0.88 (rolling latest via awesome-os/libv8_monolith)`

| Runtime | Covered | Coverage |
| :--- | ---: | ---: |
| **Chromium / Sectium Browser** | 26/27 | **96.3%** |
| **Firefox (Gecko / SpiderMonkey)** | 22/24 | **91.7%** |
| **Electron (awesome-os/sectium-electron)** | 20/20 | **100%** |
| **NW.js (holo-display-nwjs)** | 18/18 | **100%** |
| **Node.js** | 15/16 | **93.8%** |
| **Deno** | 10/10 | **100%** |
| **Bun** | 12/12 | **100%** |
| **Ladybird (awesome-os/ladybird)** | 23/23 | **100%** |
| **just-js/lo (lo/lib/*)** | 19/19 | **100%** |

## 2. Ahead-of-Chrome Upstream Pins

| Library | Pinned Max Version | Upstream Repo |
| :--- | :--- | :--- |
| `harfbuzz` | **`15.2.0`** | `harfbuzz/harfbuzz` |
| `openssl` | **`4.1.0`** | `openssl/openssl` |
| `expat` | **`2.11.0`** | `libexpat/libexpat` |
| `zstd` | **`1.6.0`** | `facebook/zstd` |
| `mimalloc` | **`3.7.1`** | `microsoft/mimalloc` |
| `zlib-ng` | **`2.3.3`** | `zlib-ng/zlib-ng` |
| `ada` | **`4.1.1`** | `ada-url/ada` |

## 3. Independent Engine & Upstream Package Radar

- **Ladybird Hard-Fork (`awesome-os/ladybird`):** `42` libraries · `752` WebIDL interfaces · `1.348` FIXMEs · `67.35%` dep overlap (`15` libs raised from `v11`).
- **Full Reports:** [`BIG-BOYS-OVERLAP-REPORT.md`](BIG-BOYS-OVERLAP-REPORT.md) · [`LADYBIRD-CHROME-PARITY.md`](LADYBIRD-CHROME-PARITY.md) · [`T2SDE-MODERNIZATION-WISHLIST.md`](T2SDE-MODERNIZATION-WISHLIST.md) · [`max-version-lock.json`](max-version-lock.json) · [`ahead-of-chrome-pins.json`](ahead-of-chrome-pins.json).
