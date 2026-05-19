/**
 * Discord Interactions signature verification.
 *
 * Discord signs every incoming interaction with Ed25519 using the application
 * public key. Verification must run BEFORE parsing the JSON body, on the raw
 * request bytes. Failure to verify returns HTTP 401 per Discord requirements.
 *
 * Uses the runtime WebCrypto API (available in Node >=18, Bun, Deno, Cloudflare
 * Workers, Vercel Edge). No external dependencies.
 */

/**
 * Convert a hex string to a Uint8Array. Throws on invalid input.
 *
 * The returned view is backed by a fresh `ArrayBuffer` (never
 * `SharedArrayBuffer`), so it satisfies WebCrypto's `BufferSource` parameter
 * type without further copying.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('hex string must have even length');
  }
  return new Uint8Array(hexToArrayBuffer(hex));
}

/** Convert a hex string to an ArrayBuffer (the underlying storage form). */
export function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error('hex string must have even length');
  }
  const buffer = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < view.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`invalid hex at position ${i * 2}`);
    }
    view[i] = byte;
  }
  return buffer;
}

/** Encode a UTF-8 string into a fresh ArrayBuffer (BufferSource-compatible). */
function utf8ToArrayBuffer(text: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(text);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

/**
 * Verify a Discord interaction signature.
 *
 * @param publicKeyHex   Application public key from Discord developer portal (hex).
 * @param rawBody        Raw request body as a string (do NOT JSON.parse before this).
 * @param signatureHex   Value of the `X-Signature-Ed25519` header.
 * @param timestamp      Value of the `X-Signature-Timestamp` header.
 * @returns true if the signature is valid, false otherwise. Never throws on bad input.
 */
export async function verifyDiscordSignature(
  publicKeyHex: string,
  rawBody: string,
  signatureHex: string,
  timestamp: string,
): Promise<boolean> {
  if (!publicKeyHex || !signatureHex || !timestamp) return false;
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      hexToArrayBuffer(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      hexToArrayBuffer(signatureHex),
      utf8ToArrayBuffer(timestamp + rawBody),
    );
  } catch {
    return false;
  }
}

/**
 * Convenience wrapper that takes a Request-like object plus the public key.
 *
 * @param publicKeyHex   Discord application public key (hex).
 * @param rawBody        Raw body string.
 * @param headers        Object exposing `get(name): string | null` (e.g. fetch Headers, Next.js headers()).
 */
export async function verifyDiscordRequest(
  publicKeyHex: string,
  rawBody: string,
  headers: { get(name: string): string | null },
): Promise<boolean> {
  const sig = headers.get('x-signature-ed25519') ?? headers.get('X-Signature-Ed25519');
  const ts = headers.get('x-signature-timestamp') ?? headers.get('X-Signature-Timestamp');
  if (!sig || !ts) return false;
  return verifyDiscordSignature(publicKeyHex, rawBody, sig, ts);
}
