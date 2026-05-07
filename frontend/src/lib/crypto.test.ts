import { describe, it, expect, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  generateUserKeyPair,
  generateSymmetricKey,
  encryptWithSymmetricKey,
  decryptWithSymmetricKey,
  wrapSymmetricKey,
  unwrapSymmetricKey,
  exportKey,
  importKey,
  deriveKeyFromPassword,
  encryptPrivateKey,
  decryptPrivateKey,
} from './crypto';

// Polyfill window.crypto for Node.js environment
beforeAll(() => {
  if (typeof window === 'undefined') {
    globalThis.window = {} as any;
  }
  globalThis.window.crypto = webcrypto as any;
});

describe('Crypto Utilities', () => {
  it('should generate a user key pair', async () => {
    const keyPair = await generateUserKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
  });

  it('should generate a symmetric key', async () => {
    const key = await generateSymmetricKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
  });

  it('should encrypt and decrypt data with symmetric key', async () => {
    const key = await generateSymmetricKey();
    const plaintext = 'Secret Message';
    
    const ciphertext = await encryptWithSymmetricKey(key, plaintext);
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toEqual(plaintext);
    
    const decrypted = await decryptWithSymmetricKey(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should wrap and unwrap a symmetric key', async () => {
    const keyPair = await generateUserKeyPair();
    const symmetricKey = await generateSymmetricKey();
    
    const wrapped = await wrapSymmetricKey(symmetricKey, keyPair.publicKey);
    expect(wrapped).toBeDefined();
    
    const unwrapped = await unwrapSymmetricKey(wrapped, keyPair.privateKey);
    expect(unwrapped).toBeDefined();
    expect(unwrapped.type).toBe('secret');
    
    // Verify the unwrapped key works
    const plaintext = 'Secret Message';
    const ciphertext = await encryptWithSymmetricKey(unwrapped, plaintext);
    const decrypted = await decryptWithSymmetricKey(symmetricKey, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should export and import keys', async () => {
    const symmetricKey = await generateSymmetricKey();
    
    const exported = await exportKey(symmetricKey);
    expect(typeof exported).toBe('string');
    
    const imported = await importKey(exported, 'symmetric');
    expect(imported).toBeDefined();
    expect(imported.type).toBe('secret');
    
    // Verify the imported key works
    const plaintext = 'Secret Message';
    const ciphertext = await encryptWithSymmetricKey(imported, plaintext);
    const decrypted = await decryptWithSymmetricKey(symmetricKey, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should derive a key from password', async () => {
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const password = 'strong-password';
    
    const derivedKey = await deriveKeyFromPassword(password, salt);
    expect(derivedKey).toBeDefined();
    expect(derivedKey.type).toBe('secret');
  });

  it('should encrypt and decrypt a private key', async () => {
    const keyPair = await generateUserKeyPair();
    const password = 'strong-password';
    
    const { encryptedKey, salt } = await encryptPrivateKey(keyPair.privateKey, password);
    expect(encryptedKey).toBeDefined();
    expect(salt).toBeDefined();
    
    const decryptedPrivateKey = await decryptPrivateKey(encryptedKey, salt, password);
    expect(decryptedPrivateKey).toBeDefined();
    expect(decryptedPrivateKey.type).toBe('private');
    
    // Verify the decrypted key can unwrap a symmetric key
    const symmetricKey = await generateSymmetricKey();
    const wrapped = await wrapSymmetricKey(symmetricKey, keyPair.publicKey);
    const unwrapped = await unwrapSymmetricKey(wrapped, decryptedPrivateKey);
    
    expect(unwrapped).toBeDefined();
    expect(unwrapped.type).toBe('secret');
  });
});
