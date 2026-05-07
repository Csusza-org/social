import { useState, useCallback } from "react";
import * as crypto from "../lib/crypto";

export function useCrypto() {
  const [userKeys, setUserKeys] = useState<CryptoKeyPair | null>(null);

  const setupUser = useCallback(async () => {
    const keys = await crypto.generateUserKeyPair();
    setUserKeys(keys);
    
    const publicKeyStr = await crypto.exportKey(keys.publicKey);
    const privateKeyStr = await crypto.exportKey(keys.privateKey);
    
    // In a real app, we'd encrypt the private key with a password-derived key
    // For now, we'll just return them to be stored (not ideal, but following the flow)
    return {
      publicKey: publicKeyStr,
      encryptedPrivateKey: privateKeyStr, // TODO: actually encrypt this
    };
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
    decryptCircleKey,
    encryptPost,
    decryptPost,
    setUserKeys,
  };
}
