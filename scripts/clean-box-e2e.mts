#!/usr/bin/env node
/**
 * @file scripts/clean-box-e2e.mts
 * @description Clean-box stranger E2E verifier for `awesome-os/installer`:
 *   1. Live HTTP 200 checks across `awesome-os.github.io`
 *   2. Canonical JSON + Ed25519 + SHA-512 verification of `v11-bundle.json`
 *   3. GitHub Release `awesome-os/awesome-os` `v1.0.0` signed-asset verification
 *   4. Linux live compiled launcher tarball download, SHA-512 verification, and execution
 *
 * Strictly `erasableSyntaxOnly: true` & Node built-ins only (`shell: false`).
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey, verify } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIVE_ENDPOINTS: readonly string[] = [
  'https://awesome-os.github.io/installer/',
  'https://awesome-os.github.io/installer/v11-bundle.json',
  'https://awesome-os.github.io/holo-v11/gravity-telemetry.json',
  'https://awesome-os.github.io/holo-v11/oversight.html',
  'https://awesome-os.github.io/agent-platform/',
  'https://awesome-os.github.io/demos/',
];

export const BUNDLE_URL = 'https://awesome-os.github.io/installer/v11-bundle.json';
export const INSTALL_PS1_URL = 'https://awesome-os.github.io/installer/install.ps1';
export const INSTALL_SH_URL = 'https://awesome-os.github.io/installer/install.sh';
export const INSTALLER_SHA512SUMS_URL = 'https://awesome-os.github.io/installer/SHA512SUMS.txt';
export const DEMOS_REPO_URL = 'https://github.com/awesome-os/demos.git';
export const DEMOS_SPARSE_PATH = '/arch/pdp11/';
export const RELEASE_API_URL =
  'https://api.github.com/repos/awesome-os/awesome-os/releases/tags/v1.0.0';
export const DEVTOOLS_BASE_URL =
  'https://github.com/awesome-os/devtools/releases/download/v11-devtools-launchers-latest';
export const DEVTOOLS_TAR_NAME = 'devtools-launchers-linux-x86_64-holo-v11.tar.gz';

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export interface SignedBundleArtifact {
  readonly id: string;
  readonly url: string;
  readonly bytes?: number;
  readonly sha512: string;
}

export interface SignedV11Bundle {
  readonly schema: string;
  readonly signature: {
    readonly scheme: string;
    readonly keyId?: string;
    readonly publicKeyHex: string;
    readonly payloadSha512: string;
    readonly signatureHex: string;
  };
  readonly artifacts: readonly SignedBundleArtifact[];
}

export interface ReleaseAsset {
  readonly name: string;
  readonly size: number;
  readonly browser_download_url: string;
}

export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalizeJson(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => k !== 'signature' && obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`).join(',')}}`;
}

export function verifyV11BundleSignature(bundle: SignedV11Bundle): string {
  assert.equal(bundle.schema, 'awesome-os.web-v11-bundle.v1');
  assert.equal(bundle.signature?.scheme, 'ed25519-sha512-v1');
  assert.match(bundle.signature.publicKeyHex, /^[0-9a-f]{64}$/i);
  assert.match(bundle.signature.payloadSha512, /^[0-9a-f]{128}$/i);
  assert.match(bundle.signature.signatureHex, /^[0-9a-f]{128}$/i);

  const canonicalPayload = canonicalizeJson(bundle);
  const computedPayloadSha512 = createHash('sha512')
    .update(canonicalPayload, 'utf8')
    .digest('hex');
  assert.equal(
    computedPayloadSha512,
    bundle.signature.payloadSha512,
    'Canonical payload SHA-512 mismatch',
  );

  const spki = Buffer.concat([
    ED25519_SPKI_PREFIX,
    Buffer.from(bundle.signature.publicKeyHex, 'hex'),
  ]);
  const publicKey = createPublicKey({ key: spki, format: 'der', type: 'spki' });
  const sigOk = verify(
    null,
    Buffer.from(canonicalPayload, 'utf8'),
    publicKey,
    Buffer.from(bundle.signature.signatureHex, 'hex'),
  );
  assert.equal(sigOk, true, 'Ed25519 cryptographic signature verification failed');
  assert.ok(Array.isArray(bundle.artifacts) && bundle.artifacts.length > 0, 'Bundle has no artifacts');
  return computedPayloadSha512;
}

export function findSignedReleaseAssets(assets: readonly ReleaseAsset[]): ReleaseAsset[] {
  return assets.filter(
    (a) =>
      a.size > 0 &&
      /^(SHA(256|512)SUMS\.txt|omaha-stable-channel\.json|cas-v11-release-manifest\.json)$|\.(sig|asc|minisig)$/i.test(
        a.name,
      ),
  );
}

export function parseExpectedSha512ForFile(sumsText: string, fileName: string): string {
  for (const rawLine of sumsText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = /^([0-9a-fA-F]{128})\s+\*?(.+)$/.exec(line);
    if (match && match[2] === fileName) {
      return match[1].toLowerCase();
    }
  }
  throw new Error(`SHA-512 entry not found for ${fileName}`);
}

export function validateTarListing(tarListingOutput: string): void {
  const lines = tarListingOutput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hasLauncher = lines.some((l) => /^(\.\/)?holo-devtools-launcher$/.test(l));
  const hasPlugin = lines.some((l) => /^(\.\/)?libsample_engine_plugin\.so$/.test(l));
  assert.ok(hasLauncher, 'Tarball missing holo-devtools-launcher');
  assert.ok(hasPlugin, 'Tarball missing libsample_engine_plugin.so');
}

export function validateLauncherOutput(stdout: string): void {
  assert.ok(
    stdout.includes('0x33564742'),
    'Expected launcher stdout to contain 0x33564742 (B8G_ABI_MAGIC_V3)',
  );
  assert.ok(stdout.includes('loaded=1'), 'Expected launcher stdout to contain loaded=1');
}

export function validateInstallerScript(
  kind: 'ps1' | 'sh',
  content: string,
): { sha512: string; bytes: number } {
  const trimmed = content.trim();
  assert.ok(trimmed.length > 0, `Empty ${kind} installer script`);
  assert.equal(
    /^<!doctype\s+html|^<html/i.test(trimmed),
    false,
    `Expected ${kind} script, got HTML document`,
  );
  if (kind === 'sh') {
    assert.ok(
      /^#!\/(bin\/sh|usr\/bin\/env\s+(ba)?sh)/.test(trimmed) || /\bset\s+-[euo]+/.test(trimmed),
      'POSIX install.sh missing shebang or set -e guard',
    );
  } else {
    assert.ok(
      /\$ErrorActionPreference|param\(|Invoke-RestMethod|Invoke-WebRequest|\birm\b/i.test(trimmed),
      'PowerShell install.ps1 missing PowerShell installer markers',
    );
  }
  const buf = Buffer.from(content, 'utf8');
  return {
    sha512: createHash('sha512').update(buf).digest('hex'),
    bytes: buf.byteLength,
  };
}

export function checkShellSyntaxIfAvailable(
  kind: 'ps1' | 'sh',
  scriptPath: string,
): 'checked' | 'skipped' {
  try {
    if (kind === 'sh') {
      execFileSync('sh', ['-n', scriptPath], { stdio: 'pipe', shell: false });
      return 'checked';
    }
    execFileSync(
      'pwsh',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$errs = $null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:HOLO_PS1_CHECK_PATH, [ref]$null, [ref]$errs); if ($errs.Count -gt 0) { $errs | ForEach-Object { Write-Error $_.Message }; exit 1 }',
      ],
      { stdio: 'pipe', shell: false, env: { ...process.env, HOLO_PS1_CHECK_PATH: scriptPath } },
    );
    return 'checked';
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return 'skipped';
    }
    throw err;
  }
}

export function validateSparseDemosCheckout(
  repoDir: string,
  sparsePath = DEMOS_SPARSE_PATH,
): string[] {
  const sparseFile = path.join(repoDir, '.git', 'info', 'sparse-checkout');
  assert.ok(fs.existsSync(sparseFile), 'Missing .git/info/sparse-checkout');
  const sparseRules = fs.readFileSync(sparseFile, 'utf8');
  assert.ok(
    sparseRules.includes(sparsePath),
    `Expected sparse-checkout to include ${sparsePath}, got: ${sparseRules.trim()}`,
  );

  const relDir = sparsePath.replace(/^\/+|\/+$/g, '');
  const targetDir = path.join(repoDir, relDir);
  assert.ok(fs.existsSync(targetDir), `Expected sparse directory ${relDir} to exist`);
  const files = fs.readdirSync(targetDir).sort();
  assert.ok(files.length > 0, `Sparse directory ${relDir} is empty`);
  assert.ok(files.includes('index.html'), `Expected index.html in ${relDir}`);
  assert.equal(
    fs.existsSync(path.join(repoDir, 'README.md')),
    false,
    'Root README.md should not be materialized under --no-cone sparse checkout',
  );
  return files;
}

async function verifyLiveEndpointsAndBundle(): Promise<SignedV11Bundle> {
  for (const url of LIVE_ENDPOINTS) {
    const res = await fetch(url, { cache: 'no-store' });
    assert.equal(res.status, 200, `Expected HTTP 200 for ${url}, got ${res.status}`);
    const body = await res.arrayBuffer();
    assert.ok(body.byteLength > 0, `Empty response body for ${url}`);
    console.log(`[HTTP 200] ${url} (${body.byteLength} B)`);
  }

  const bundleRes = await fetch(BUNDLE_URL, { cache: 'no-store' });
  assert.equal(bundleRes.status, 200, `Expected HTTP 200 for ${BUNDLE_URL}`);
  const bundle = (await bundleRes.json()) as SignedV11Bundle;
  const computedPayloadSha512 = verifyV11BundleSignature(bundle);
  console.log(
    `[ED25519 OK] keyId=${bundle.signature.keyId ?? 'unknown'} payloadSha512=${computedPayloadSha512.slice(0, 16)}...`,
  );

  for (const artifact of bundle.artifacts) {
    const artifactUrl = new URL(artifact.url, BUNDLE_URL).href;
    const artRes = await fetch(artifactUrl, { cache: 'no-store' });
    assert.equal(artRes.status, 200, `Expected HTTP 200 for artifact ${artifactUrl}`);
    const buf = Buffer.from(await artRes.arrayBuffer());
    if (typeof artifact.bytes === 'number') {
      assert.equal(buf.byteLength, artifact.bytes, `Byte length mismatch for ${artifact.id}`);
    }
    const actualSha512 = createHash('sha512').update(buf).digest('hex');
    assert.equal(actualSha512, artifact.sha512, `SHA-512 mismatch for ${artifact.id}`);
    console.log(`[SHA-512 OK] ${artifact.id} (${buf.byteLength} B) -> ${actualSha512.slice(0, 16)}...`);
  }

  const baseHeaders: Record<string, string> = {
    'User-Agent': 'awesome-os-clean-box-stranger-e2e',
    Accept: 'application/vnd.github+json',
  };
  const relRes = await fetch(RELEASE_API_URL, { headers: baseHeaders });
  assert.equal(relRes.status, 200, `Expected HTTP 200 for ${RELEASE_API_URL}, got ${relRes.status}`);
  const release = (await relRes.json()) as { assets?: ReleaseAsset[] };
  assert.ok(Array.isArray(release.assets) && release.assets.length > 0, 'v1.0.0 release has no assets');

  const signedAssets = findSignedReleaseAssets(release.assets);
  assert.ok(signedAssets.length > 0, 'v1.0.0 release has 0 signed/checksum manifest assets');

  const sumsAsset = release.assets.find((a) => a.name === 'SHA512SUMS.txt');
  assert.ok(sumsAsset, 'v1.0.0 release missing SHA512SUMS.txt');
  const sumsRes = await fetch(sumsAsset.browser_download_url, { cache: 'no-store' });
  assert.equal(sumsRes.status, 200, `Failed to download SHA512SUMS.txt: HTTP ${sumsRes.status}`);
  const sumsLines = (await sumsRes.text()).trim().split(/\r?\n/).filter(Boolean);
  assert.ok(sumsLines.length > 0, 'SHA512SUMS.txt is empty');
  console.log(
    `[RELEASE OK] v1.0.0 totalAssets=${release.assets.length} signedAssets=${signedAssets.length} sha512SumsLines=${sumsLines.length}`,
  );
  return bundle;
}

async function verifyRemoteInstallers(
  bundle: SignedV11Bundle,
  strictInstallers: boolean,
): Promise<void> {
  let sumsText: string | undefined;
  const sumsRes = await fetch(INSTALLER_SHA512SUMS_URL, { cache: 'no-store' });
  if (sumsRes.status === 200) {
    sumsText = await sumsRes.text();
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holo-installer-syntax-'));
  try {
    const targets: ReadonlyArray<{ kind: 'ps1' | 'sh'; url: string; fileName: string }> = [
      { kind: 'ps1', url: INSTALL_PS1_URL, fileName: 'install.ps1' },
      { kind: 'sh', url: INSTALL_SH_URL, fileName: 'install.sh' },
    ];
    for (const target of targets) {
      const res = await fetch(target.url, { cache: 'no-store' });
      if (res.status === 404 && !strictInstallers) {
        console.log(`[PENDING 404] ${target.url} (not yet published to Pages)`);
        continue;
      }
      assert.equal(res.status, 200, `Expected HTTP 200 for ${target.url}, got ${res.status}`);
      const content = await res.text();
      const { sha512, bytes } = validateInstallerScript(target.kind, content);

      if (sumsText) {
        const expected = parseExpectedSha512ForFile(sumsText, target.fileName);
        assert.equal(sha512, expected, `SHA-512 mismatch for ${target.fileName}`);
      } else {
        const bundleArt = bundle.artifacts.find(
          (a) => a.id === target.fileName || a.url.endsWith(`/${target.fileName}`),
        );
        if (bundleArt) {
          assert.equal(sha512, bundleArt.sha512, `Bundle SHA-512 mismatch for ${target.fileName}`);
        }
      }

      const localPath = path.join(workDir, target.fileName);
      fs.writeFileSync(localPath, content, 'utf8');
      const syntaxStatus = checkShellSyntaxIfAvailable(target.kind, localPath);
      console.log(
        `[INSTALLER OK] ${target.fileName} (${bytes} B) syntax=${syntaxStatus} sha512=${sha512.slice(0, 16)}...`,
      );
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function verifyDemosSparseNoConeSmoke(): void {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holo-demos-sparse-'));
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  try {
    execFileSync(
      'git',
      [
        'clone',
        '--depth=1',
        '--filter=blob:none',
        '--no-checkout',
        '--sparse',
        DEMOS_REPO_URL,
        workDir,
      ],
      { env: gitEnv, stdio: 'pipe', shell: false },
    );
    execFileSync('git', ['-C', workDir, 'sparse-checkout', 'init', '--no-cone'], {
      env: gitEnv,
      stdio: 'pipe',
      shell: false,
    });
    execFileSync('git', ['-C', workDir, 'sparse-checkout', 'set', DEMOS_SPARSE_PATH], {
      env: gitEnv,
      stdio: 'pipe',
      shell: false,
    });
    execFileSync('git', ['-C', workDir, 'checkout', 'main'], {
      env: gitEnv,
      stdio: 'pipe',
      shell: false,
    });
    const files = validateSparseDemosCheckout(workDir, DEMOS_SPARSE_PATH);
    console.log(`[DEMOS SPARSE OK] --no-cone ${DEMOS_SPARSE_PATH} files=${files.join(', ')}`);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function verifyLinuxBinaryExecution(): Promise<void> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holo-stranger-work-'));
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'holo-stranger-test-'));
  try {
    const sumsRes = await fetch(`${DEVTOOLS_BASE_URL}/SHA512SUMS.txt`, { cache: 'no-store' });
    assert.equal(sumsRes.status, 200, `Failed to fetch devtools SHA512SUMS.txt: ${sumsRes.status}`);
    const sumsText = await sumsRes.text();
    const expectedSha512 = parseExpectedSha512ForFile(sumsText, DEVTOOLS_TAR_NAME);

    const tarRes = await fetch(`${DEVTOOLS_BASE_URL}/${DEVTOOLS_TAR_NAME}`, { cache: 'no-store' });
    assert.equal(tarRes.status, 200, `Failed to fetch ${DEVTOOLS_TAR_NAME}: ${tarRes.status}`);
    const tarBuf = Buffer.from(await tarRes.arrayBuffer());
    const actualSha512 = createHash('sha512').update(tarBuf).digest('hex');
    assert.equal(actualSha512, expectedSha512, `SHA-512 mismatch for ${DEVTOOLS_TAR_NAME}`);

    const tarPath = path.join(workDir, DEVTOOLS_TAR_NAME);
    fs.writeFileSync(tarPath, tarBuf);

    const tarListing = execFileSync('tar', ['-tzf', tarPath], {
      encoding: 'utf8',
      shell: false,
    });
    console.log(`[TAR LIST] ${DEVTOOLS_TAR_NAME}\n${tarListing.trim()}`);
    validateTarListing(tarListing);

    execFileSync('tar', ['-xzf', tarPath, '-C', extractDir], {
      stdio: 'inherit',
      shell: false,
    });
    const launcherPath = path.join(extractDir, 'holo-devtools-launcher');
    const pluginPath = path.join(extractDir, 'libsample_engine_plugin.so');
    fs.chmodSync(launcherPath, 0o755);
    fs.chmodSync(pluginPath, 0o755);

    const bmpFiles = fs.readdirSync(extractDir).filter((f) => f.endsWith('.bmp'));
    assert.ok(bmpFiles.length > 0, `No extracted .bmp splash files found in ${extractDir}`);
    console.log(`[SPLASHES OK] count=${bmpFiles.length} files=${bmpFiles.join(', ')}`);

    const launcherOut = execFileSync(launcherPath, [pluginPath], {
      env: { ...process.env, LD_LIBRARY_PATH: extractDir },
      encoding: 'utf8',
      shell: false,
    });
    console.log(`[LAUNCHER STDOUT] ${launcherOut.trim()}`);
    validateLauncherOutput(launcherOut);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const bundle = await verifyLiveEndpointsAndBundle();
  await verifyRemoteInstallers(bundle, process.argv.includes('--strict-installers'));
  verifyDemosSparseNoConeSmoke();
  if (process.platform === 'linux' || process.argv.includes('--run-linux-binary')) {
    await verifyLinuxBinaryExecution();
  }
}

const isMain =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
