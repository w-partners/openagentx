import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  hexToBytes,
  verifyDiscordSignature,
  verifyDiscordRequest,
} from '../src/signature.js';

// Polyfill global crypto for Node test environments that don't expose it.
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error attaching for Node compatibility
  globalThis.crypto = webcrypto;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('hexToBytes', () => {
  it('decodes a simple hex string', () => {
    const out = hexToBytes('deadbeef');
    assert.deepEqual(Array.from(out), [0xde, 0xad, 0xbe, 0xef]);
  });

  it('throws on odd-length input', () => {
    assert.throws(() => hexToBytes('abc'), /even length/);
  });

  it('throws on non-hex characters', () => {
    assert.throws(() => hexToBytes('zz'), /invalid hex/);
  });

  it('handles empty string', () => {
    assert.equal(hexToBytes('').length, 0);
  });
});

describe('verifyDiscordSignature', () => {
  it('returns false for missing public key', async () => {
    const ok = await verifyDiscordSignature('', 'body', 'sig', 'ts');
    assert.equal(ok, false);
  });

  it('returns false for missing signature', async () => {
    const ok = await verifyDiscordSignature('aa'.repeat(32), 'body', '', 'ts');
    assert.equal(ok, false);
  });

  it('returns false for missing timestamp', async () => {
    const ok = await verifyDiscordSignature('aa'.repeat(32), 'body', 'sig', '');
    assert.equal(ok, false);
  });

  it('returns false for malformed hex', async () => {
    const ok = await verifyDiscordSignature('not-hex', 'body', 'sig', 'ts');
    assert.equal(ok, false);
  });

  it('accepts a valid Ed25519 signature', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    ) as CryptoKeyPair;
    const pubRaw = new Uint8Array(await webcrypto.subtle.exportKey('raw', keyPair.publicKey));
    const pubHex = bytesToHex(pubRaw);

    const body = '{"type":1}';
    const timestamp = '1700000000';
    const message = new TextEncoder().encode(timestamp + body);
    const sigBytes = new Uint8Array(await webcrypto.subtle.sign('Ed25519', keyPair.privateKey, message));
    const sigHex = bytesToHex(sigBytes);

    const ok = await verifyDiscordSignature(pubHex, body, sigHex, timestamp);
    assert.equal(ok, true);
  });

  it('rejects a tampered body', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    ) as CryptoKeyPair;
    const pubRaw = new Uint8Array(await webcrypto.subtle.exportKey('raw', keyPair.publicKey));
    const pubHex = bytesToHex(pubRaw);

    const body = '{"type":1}';
    const timestamp = '1700000000';
    const sigBytes = new Uint8Array(
      await webcrypto.subtle.sign('Ed25519', keyPair.privateKey, new TextEncoder().encode(timestamp + body)),
    );
    const sigHex = bytesToHex(sigBytes);

    const ok = await verifyDiscordSignature(pubHex, '{"type":2}', sigHex, timestamp);
    assert.equal(ok, false);
  });
});

describe('verifyDiscordRequest', () => {
  it('returns false when headers are missing', async () => {
    const headers = { get: () => null };
    const ok = await verifyDiscordRequest('aa'.repeat(32), 'body', headers);
    assert.equal(ok, false);
  });

  it('reads case-insensitive headers via the standard Headers API', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify'],
    ) as CryptoKeyPair;
    const pubRaw = new Uint8Array(await webcrypto.subtle.exportKey('raw', keyPair.publicKey));
    const pubHex = bytesToHex(pubRaw);

    const body = 'payload';
    const timestamp = '1700000001';
    const sigBytes = new Uint8Array(
      await webcrypto.subtle.sign('Ed25519', keyPair.privateKey, new TextEncoder().encode(timestamp + body)),
    );
    const sigHex = bytesToHex(sigBytes);

    const headers = new Headers({
      'X-Signature-Ed25519': sigHex,
      'X-Signature-Timestamp': timestamp,
    });
    const ok = await verifyDiscordRequest(pubHex, body, headers);
    assert.equal(ok, true);
  });
});
