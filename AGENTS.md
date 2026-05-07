# AI Agent Guidelines for Secure Social

This document provides context and safety mandates for AI agents interacting with the **Secure Social** codebase.

## Project Overview
Secure Social is a privacy-first social media platform where all user content is end-to-end encrypted (E2E) on the client side before being sent to the Convex backend.

## Security Architecture
- **Authentication**: Powered by **WorkOS** and integrated with **Convex Auth**.
- **Client-Side Encryption**: All encryption/decryption happens in the browser using the Web Crypto API.
- **Key Hierarchy**:
  - **User Identity**: RSA-OAEP key pair (Public/Private).
  - **Circle Key**: AES-GCM symmetric key for a group of friends.
  - **Post Key**: AES-GCM symmetric key for a single post.
- **Zero-Knowledge Backend**: The Convex database stores only encrypted blobs and wrapped (encrypted) keys. It has no access to plaintext data.

## Mandates for AI Agents
1. **Never Log Secrets**: Do not log, print, or transmit private keys, master keys, or unencrypted post content.
2. **Uphold E2E Integrity**: When suggesting code changes, ensure that no plaintext data is ever sent to a backend or external service.
3. **Audit Crypto Logic**: Any changes to `frontend/src/lib/crypto.ts` or `frontend/src/hooks/useCrypto.ts` must be rigorously verified to ensure they don't weaken the encryption or leak keys.
4. **Assume Hostile Backend**: Design client-side logic as if the backend could be compromised. Always verify signatures (if implemented) and decrypt only on the client.
5. **No Weak Primitives**: Use only strong, modern cryptographic primitives (AES-GCM, RSA-OAEP with SHA-256). Avoid legacy or custom crypto.

## Key Files
- `convex/schema.ts`: Database structure for encrypted data.
- `frontend/src/lib/crypto.ts`: Core Web Crypto API wrappers.
- `frontend/src/hooks/useCrypto.ts`: React hooks for key management.
- `frontend/src/App.tsx`: Implementation of the encryption/decryption flow.

## Verification Checklist
- [ ] Does this change send any unencrypted data to the server?
- [ ] Does this change expose a private key in the UI or console?
- [ ] Is the "Circle Key" always wrapped with a Public Key before being stored?
- [ ] Is the "Post Key" always encrypted with the "Circle Key"?
