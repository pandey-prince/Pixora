#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

echo "== Pixora E2E verification =="

echo "-- Backend tests --"
cd "$ROOT/backend"
bun run test
bun run typecheck

echo "-- Frontend crypto tests --"
cd "$ROOT/frontend"
bun test src/lib/crypto.test.ts

echo "-- Frontend build --"
npm run build

echo "-- Frontend lint --"
npm run lint

echo "-- Crypto integration smoke --"
cd "$ROOT/frontend"
bun -e "
import {
  generateMasterKey,
  generateRecoveryCode,
  encryptPhoto,
  decryptFromUrl,
  decryptFileName,
  unwrapMasterKey,
  unwrapMasterKeyWithRecovery,
  wrapMasterKey,
} from './src/lib/crypto.ts';

const master = await generateMasterKey();
const passphrase = 'integration test passphrase';
const recovery = generateRecoveryCode();
const wrapped = await wrapMasterKey(master, passphrase, recovery);
const unwrapped = await unwrapMasterKey(passphrase, wrapped);
if (unwrapped.raw.length !== 32) throw new Error('master key length mismatch');

const recovered = await unwrapMasterKeyWithRecovery(recovery, {
  recoveryWrappedKey: wrapped.recoveryWrappedKey,
  recoverySalt: wrapped.recoverySalt,
  recoveryIv: wrapped.recoveryIv,
  kdf: wrapped.kdf,
});
if (recovered.raw[0] !== unwrapped.raw[0]) throw new Error('recovery unwrap mismatch');

const original = new Uint8Array([9, 8, 7, 6, 5]);
const file = new File([original], 'e2e.png', { type: 'image/png' });
const ciphertext = await encryptPhoto(master, file);

globalThis.fetch = async () => new Response(ciphertext.imageBlob);
const blob = await decryptFromUrl(master, {
  url: 'https://example.com/photo',
  encryptedKey: ciphertext.metadata.encryptedKey,
  keyIv: ciphertext.metadata.keyIv,
  iv: ciphertext.metadata.contentIv,
  mimeType: ciphertext.metadata.mimeType,
});
const roundTrip = new Uint8Array(await blob.arrayBuffer());
if (roundTrip.length !== original.length) throw new Error('decrypt length mismatch');

const name = await decryptFileName(
  master,
  ciphertext.metadata.encryptedFileName,
  ciphertext.metadata.fileNameIv,
);
if (name !== 'e2e.png') throw new Error('filename decrypt mismatch');

console.log('Crypto integration smoke passed');
"

echo "== All automated E2E checks passed =="
