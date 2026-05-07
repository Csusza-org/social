/**
 * Crypto utilities for client-side encryption using the Web Crypto API.
 */

const RSA_ALGO = {
  name: "RSA-OAEP",
  hash: "SHA-256",
};

const AES_ALGO = {
  name: "AES-GCM",
  length: 256,
};

/**
 * Generates a new RSA-OAEP key pair for a user.
 * The public key is used for key exchange (encrypting symmetric keys for others).
 * The private key is used to decrypt those symmetric keys.
 */
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      ...RSA_ALGO,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random AES-GCM symmetric key.
 */
export async function generateSymmetricKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(AES_ALGO, true, ["encrypt", "decrypt"]);
}

/**
 * Encrypts data with a symmetric key.
 * Returns a Base64 string containing the IV and the ciphertext.
 */
export async function encryptWithSymmetricKey(
  key: CryptoKey,
  plaintext: string
): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data with a symmetric key.
 */
export async function decryptWithSymmetricKey(
  key: CryptoKey,
  encryptedBase64: string
): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Wraps (encrypts) a symmetric key with a public key.
 */
export async function wrapSymmetricKey(
  keyToWrap: CryptoKey,
  publicKey: CryptoKey
): Promise<string> {
  const wrapped = await window.crypto.subtle.wrapKey(
    "raw",
    keyToWrap,
    publicKey,
    "RSA-OAEP"
  );
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

/**
 * Unwraps (decrypts) a symmetric key with a private key.
 */
export async function unwrapSymmetricKey(
  wrappedKeyBase64: string,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const wrapped = new Uint8Array(
    atob(wrappedKeyBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );

  return await window.crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    privateKey,
    "RSA-OAEP",
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Exports a key to a JSON Web Key (JWK) string.
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

/**
 * Imports a key from a JWK string.
 */
export async function importKey(
  jwkString: string,
  type: "public" | "private" | "symmetric"
): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  const algo = type === "symmetric" ? "AES-GCM" : RSA_ALGO;
  const usages: KeyUsage[] = type === "public" ? ["encrypt"] : ["decrypt"];
  if (type === "symmetric") usages.push("encrypt");

  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    algo as any,
    true,
    usages
  );
}
