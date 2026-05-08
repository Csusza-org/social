# Secure Social
The social platform for a calmer, more intentional follower circle.

## Overview
Secure Social is a privacy-first social media platform where all user content is end-to-end encrypted (E2E) on the client-side. The backend has zero knowledge of the actual content, storing only encrypted blobs and wrapped keys.

## Features
- **End-to-End Encryption**: All encryption and decryption happens in the browser using the Web Crypto API.
- **Zero-Knowledge Backend**: Powered by [Convex](https://convex.dev/), the database stores only encrypted data.
- **Secure Authentication**: Integrated with WorkOS and Convex Auth.
- **High Performance**: Built with React and Vite, utilizing Oxlint for fast static analysis.

## Development

### Prerequisites
- [Bun](https://bun.sh/) (We strictly use Bun instead of npm/npx)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the frontend development server:
   ```bash
   cd frontend
   bun run dev
   ```

### Running Tests
The core cryptography logic is rigorously tested using Vitest. It must pass before any changes are accepted.
```bash
cd frontend
bun run test
```

## Security Architecture
The platform employs a robust key hierarchy to ensure data privacy:
- **User Identity**: RSA-OAEP key pair (Public/Private) used for key exchange.
- **Circle Key**: AES-GCM symmetric key shared among a defined group of friends.
- **Post Key**: AES-GCM symmetric key used for individual posts, encrypted with the Circle Key.

All cryptographic operations strictly use strong, modern primitives (AES-GCM, RSA-OAEP with SHA-256) and execute entirely on the client, ensuring the backend never sees plaintext data.
