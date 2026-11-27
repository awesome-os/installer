import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  canonicalizeJson,
  findSignedReleaseAssets,
  parseExpectedSha512ForFile,
  validateLauncherOutput,
  validateTarListing,
  verifyV11BundleSignature,
  type SignedV11Bundle,
} from './clean-box-e2e.mts';

describe('clean-box-e2e helpers', () => {
  it('canonicalizeJson strips signature and sorts keys deterministically', () => {
    const a = canonicalizeJson({
      z: 1,
      a: { d: 2, b: [3, { y: 4, x: 5 }] },
      signature: { scheme: 'ignore' },
      undef: undefined,
    });
    const b = canonicalizeJson({
      a: { b: [3, { x: 5, y: 4 }], d: 2 },
      z: 1,
    });
    assert.equal(a, b);
    assert.equal(a.includes('signature'), false);
  });

  it('verifies Ed25519 + SHA-512 signed v11-bundle.json payloads and rejects tampering', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const spkiDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
    const publicKeyHex = spkiDer.subarray(spkiDer.length - 32).toString('hex');

    const unsigned = {
      schema: 'awesome-os.web-v11-bundle.v1',
      artifacts: [
        {
          id: 'sectium-cp',
          url: './blobs/sectium_cp.wasm',
          bytes: 5695,
          sha512: 'a'.repeat(128),
        },
      ],
    };
    const canonical = canonicalizeJson(unsigned);
    const payloadSha512 = createHash('sha512').update(canonical, 'utf8').digest('hex');
    const signatureHex = sign(null, Buffer.from(canonical, 'utf8'), privateKey).toString('hex');

    const bundle: SignedV11Bundle = {
      ...unsigned,
      signature: {
        scheme: 'ed25519-sha512-v1',
        keyId: 'test-key',
        publicKeyHex,
        payloadSha512,
        signatureHex,
      },
    };

    assert.equal(verifyV11BundleSignature(bundle), payloadSha512);

    const tampered: SignedV11Bundle = {
      ...bundle,
      artifacts: [{ ...bundle.artifacts[0], bytes: 9999 }],
    };
    assert.throws(() => verifyV11BundleSignature(tampered), /SHA-512 mismatch/);
  });

  it('parses SHA512SUMS.txt and validates tar listing, release assets, and launcher stdout', () => {
    const hash = 'b'.repeat(128);
    const sums = `${hash}  *devtools-launchers-linux-x86_64-holo-v11.tar.gz\n`;
    assert.equal(
      parseExpectedSha512ForFile(sums, 'devtools-launchers-linux-x86_64-holo-v11.tar.gz'),
      hash,
    );
    assert.throws(() => parseExpectedSha512ForFile(sums, 'missing.tar.gz'), /not found/);

    validateTarListing('./holo-devtools-launcher\n./libsample_engine_plugin.so\n./splash.bmp\n');
    assert.throws(() => validateTarListing('./holo-devtools-launcher\n'), /libsample_engine_plugin/);

    const signed = findSignedReleaseAssets([
      { name: 'SHA512SUMS.txt', size: 120, browser_download_url: 'https://x' },
      { name: 'app.tar.zst.sig', size: 64, browser_download_url: 'https://y' },
      { name: 'empty.sig', size: 0, browser_download_url: 'https://z' },
    ]);
    assert.equal(signed.length, 2);

    validateLauncherOutput('B8G ABI magic=0x33564742 loaded=1');
    assert.throws(() => validateLauncherOutput('loaded=0'), /0x33564742/);
  });
});
