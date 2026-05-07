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
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
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
  let usages: KeyUsage[];
  if (type === "public") {
    usages = ["encrypt", "wrapKey"];
  } else if (type === "private") {
    usages = ["decrypt", "unwrapKey"];
  } else {
    usages = ["encrypt", "decrypt"];
  }

  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    algo as RsaHashedImportParams | AesKeyAlgorithm,
    true,
    usages
  );
}

/**
 * Derives an AES-GCM key from a password and salt using PBKDF2.
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts the private key using a password-derived key.
 */
export async function encryptPrivateKey(privateKey: CryptoKey, password: string): Promise<{ encryptedKey: string, salt: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const masterKey = await deriveKeyFromPassword(password, salt);
  
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  const encrypted = await encryptWithSymmetricKey(masterKey, JSON.stringify(jwk));
  
  return {
    encryptedKey: encrypted,
    salt: btoa(String.fromCharCode(...salt)),
  };
}

/**
 * Decrypts the private key using a password-derived key.
 */
export async function decryptPrivateKey(encryptedKey: string, saltBase64: string, password: string): Promise<CryptoKey> {
  const salt = new Uint8Array(
    atob(saltBase64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
  const masterKey = await deriveKeyFromPassword(password, salt);
  
  const jwkString = await decryptWithSymmetricKey(masterKey, encryptedKey);
  const jwk = JSON.parse(jwkString);
  
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    RSA_ALGO,
    true,
    ["decrypt", "unwrapKey"]
  );
}
