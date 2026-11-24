import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { AWESOME_OS_CATALOG } from '../catalog/awesome-os-apps.mts';
import {
  renderInstallPs1,
  renderInstallSh,
  renderSplashLayoutHeader,
  stampCatalog,
} from '../src/index.mts';

describe('@awesome-os/installer', () => {
  it('stamps all catalog apps for GitHub Releases and supports instant web-host switching without rebuilds', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'awesome-os-installer-'));
    try {
      const ghResult = stampCatalog(AWESOME_OS_CATALOG, join(tmp, 'gh'));
      assert.equal(ghResult.stamped.length, AWESOME_OS_CATALOG.length);
      assert.ok(existsSync(ghResult.catalogJsonPath));

      const webResult = stampCatalog(
        AWESOME_OS_CATALOG,
        join(tmp, 'web'),
        'https://awesome-os.com/downloads',
      );
      const sb = webResult.stamped.find((s) => s.id === 'sectium-browser');
      assert.ok(sb);
      assert.equal(
        sb.installPs1Command,
        'irm https://awesome-os.com/downloads/sectium-browser/install.ps1 | iex',
      );
      assert.equal(
        sb.installShCommand,
        'curl -fsSL https://awesome-os.com/downloads/sectium-browser/install.sh | sh',
      );

      const ps1 = readFileSync(join(sb.outDir, 'install.ps1'), 'utf8');
      assert.ok(ps1.includes('https://awesome-os.com/downloads/sectium-browser'));
      assert.ok(ps1.includes('SHA256SUMS.txt'));

      const sh = readFileSync(join(sb.outDir, 'install.sh'), 'utf8');
      assert.ok(sh.includes('sectium-browser-linux-x64'));
      assert.ok(sh.includes('sectium-browser-macos-arm64'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('computes exact centered pixel coordinates in splash_layout.h for every GUI app', () => {
    const sb = AWESOME_OS_CATALOG.find((d) => d.id === 'sectium-browser')!;
    const header = renderSplashLayoutHeader(sb);
    // (460 - 64) / 2 = 198
    assert.ok(header.includes('#define AWESOME_SPLASH_ICON_X 198'));
    assert.ok(header.includes('#define AWESOME_SPLASH_DPI_AWARE 1'));
    assert.ok(header.includes('#define AWESOME_APP_VERSION "0.7.2"'));
  });

  it('renders clean PowerShell and POSIX installers directly from a .mts definition', () => {
    const nodeDef = AWESOME_OS_CATALOG.find((d) => d.id === 'node')!;
    const ps1 = renderInstallPs1(nodeDef);
    const sh = renderInstallSh(nodeDef);
    assert.ok(ps1.includes('node.exe'));
    assert.ok(sh.includes('node-linux-arm64'));
  });
});
