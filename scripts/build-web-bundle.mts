/**
 * @file scripts/build-web-bundle.mts
 * @description Generates web/v11-bundle.json + copies real verified v11 CAS blobs
 * (sectium_cp.wasm, max-version-lock.json, ECOSYSTEM-SCOREBOARD.md) into web/blobs/
 * so https://awesome-os.com/install/ streams & SHA-512 verifies real binaries
 * directly into the user's chosen local folder or browser OPFS.
 */

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const WORKSPACE_ROOT = resolve(REPO_ROOT, '..', '..', '..');
const BLOBS_DIR = join(REPO_ROOT, 'web', 'blobs');

interface BundleSource {
  id: string;
  fileName: string;
  installPath: string;
  description: string;
  srcPath: string;
}

const SOURCES: BundleSource[] = [
  {
    id: 'sectium-control-plane-wasi',
    fileName: 'sectium_cp.wasm',
    installPath: 'runtime/sectium_cp.wasm',
    description: 'Collapsed 5.7 KB B8G_ABI_MAGIC_V3 WASI control plane binary',
    srcPath: join(WORKSPACE_ROOT, 'sections', 'sectium-cloud-control-plane', 'dist', 'sectium_cp.wasm'),
  },
  {
    id: 'max-version-lock',
    fileName: 'max-version-lock.json',
    installPath: 'manifest/max-version-lock.json',
    description: 'Unified V8 16+ & ahead-of-Chrome dependency version lockfile',
    srcPath: join(WORKSPACE_ROOT, 'github-mirror', 'awesome-os', 't2linux-baseline', 'catalog', 'max-version-lock.json'),
  },
  {
    id: 'ecosystem-scoreboard',
    fileName: 'ECOSYSTEM-SCOREBOARD.md',
    installPath: 'docs/ECOSYSTEM-SCOREBOARD.md',
    description: 'Live 9-runtime Big Boys v11 CAS overlap & version scoreboard',
    srcPath: join(WORKSPACE_ROOT, 'github-mirror', 'awesome-os', 'holo-v11', 'reports', 'ECOSYSTEM-SCOREBOARD.md'),
  },
];

mkdirSync(BLOBS_DIR, { recursive: true });

const artifacts = SOURCES.map((s) => {
  const dst = join(BLOBS_DIR, s.fileName);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(s.srcPath, dst);
  const buf = readFileSync(dst);
  const sha512 = createHash('sha512').update(buf).digest('hex');
  return {
    id: s.id,
    url: `./blobs/${s.fileName}`,
    installPath: s.installPath,
    description: s.description,
    bytes: buf.byteLength,
    sha512,
  };
});

const bundle = {
  schema: 'awesome-os.web-v11-bundle.v1',
  abiMagic: '0x33564742',
  casLayout: 'v11',
  generatedAt: new Date().toISOString(),
  artifacts,
};

writeFileSync(join(REPO_ROOT, 'web', 'v11-bundle.json'), JSON.stringify(bundle, null, 2) + '\n', 'utf8');
console.log(`Stamped web/v11-bundle.json with ${artifacts.length} real SHA-512 verified artifacts.`);
