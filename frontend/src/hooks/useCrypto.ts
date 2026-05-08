import { useState, useCallback } from "react";
import * as crypto from "../lib/crypto";

export function useCrypto() {
  const [userKeys, setUserKeys] = useState<CryptoKeyPair | null>(null);

  const setupUser = useCallback(async (password: string) => {
    const keys = await crypto.generateUserKeyPair();
    setUserKeys(keys);
    
    const publicKeyStr = await crypto.exportKey(keys.publicKey);
    const { encryptedKey, salt } = await crypto.encryptPrivateKey(keys.privateKey, password);
    
    return {
      publicKey: publicKeyStr,
      encryptedPrivateKey: encryptedKey,
      privateKeySalt: salt,
    };
  }, []);

  const restoreUserKeys = useCallback(async (
    encryptedPrivateKey: string,
    salt: string,
    publicKeyJWK: string,
    password: string
  ) => {
    const privateKey = await crypto.decryptPrivateKey(encryptedPrivateKey, salt, password);
    const publicKey = await crypto.importKey(publicKeyJWK, "public");
    setUserKeys({ privateKey, publicKey });
  }, []);

  const decryptCircleKey = useCallback(async (wrappedCircleKey: string) => {
    if (!userKeys) throw new Error("User keys not initialized");
    return await crypto.unwrapSymmetricKey(wrappedCircleKey, userKeys.privateKey);
  }, [userKeys]);

  const encryptPost = useCallback(async (content: string, circleKey: CryptoKey) => {
    // 1. Generate a random post key
    const postKey = await crypto.generateSymmetricKey();
    
    // 2. Encrypt the content with the post key
    const encryptedContent = await crypto.encryptWithSymmetricKey(postKey, content);
    
    // 3. Encrypt the post key with the circle key (symmetric wrapping)
    // AES-GCM doesn't support wrapKey directly for "raw" usually, 
    // but we can export and encrypt.
    const exportedPostKey = await crypto.exportKey(postKey);
    const encryptedPostKey = await crypto.encryptWithSymmetricKey(circleKey, exportedPostKey);
    
    return {
      encryptedContent,
      encryptedPostKey,
    };
  }, []);

  const decryptPost = useCallback(async (
    encryptedContent: string, 
    encryptedPostKey: string, 
    circleKey: CryptoKey
  ) => {
    // 1. Decrypt the post key with the circle key
    const postKeyJWK = await crypto.decryptWithSymmetricKey(circleKey, encryptedPostKey);
    const postKey = await crypto.importKey(postKeyJWK, "symmetric");
    
    // 2. Decrypt the content with the post key
    return await crypto.decryptWithSymmetricKey(postKey, encryptedContent);
  }, []);

  return {
    userKeys,
    setupUser,
    restoreUserKeys,
    decryptCircleKey,
    encryptPost,
    decryptPost,
    setUserKeys,
  };
}
