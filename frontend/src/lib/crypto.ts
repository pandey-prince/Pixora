import { argon2id } from "hash-wasm";

/**
 * End-to-end encryption primitives for Pixora.
 *
 * Key hierarchy (envelope encryption):
 *
 *   passphrase --Argon2id(salt)--> KEK (key-encryption key)
 *   KEK --AES-256-GCM--> Master Key (random, per user)
 *   Master Key --AES-256-GCM--> per-photo Data Key (DEK)
 *   DEK --AES-256-GCM--> image bytes + thumbnail bytes
 *   Master Key --AES-256-GCM--> file name
 *
 * Everything sensitive is encrypted in the browser. The server only ever sees
 * ciphertext plus public parameters (salts, IVs, KDF settings).
 */

const GCM = "AES-GCM";
const KEY_BITS = 256;
const IV_BYTES = 12; // 96-bit nonce, the recommended size for AES-GCM

export interface KdfParams {
  type: "argon2id";
  memoryKiB: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
}

export const DEFAULT_KDF: KdfParams = {
  type: "argon2id",
  memoryKiB: 65536, // 64 MB makes brute-forcing the passphrase expensive
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
};

const MAX_KDF_MEMORY_KIB = 131072;
const MAX_KDF_ITERATIONS = 10;

export const MIN_PASSPHRASE_LENGTH = 12;
export const MAX_UPLOAD_BYTES = 1000 * 1024;

const BLOCKED_IMAGE_TYPES = new Set(["image/svg+xml", "text/html", "application/xhtml+xml"]);

export const validatePassphrase = (passphrase: string): string | null => {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    return `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`;
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((rule) =>
    rule.test(passphrase),
  ).length;
  if (classes < 2) {
    return "Use a mix of letters, numbers, or symbols.";
  }
  if (/^(.)\1{5,}$/.test(passphrase)) {
    return "Avoid repeating the same character.";
  }
  return null;
};

const readImageSignatures = (bytes: Uint8Array) => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
};

export const validateImageFile = async (file: File): Promise<string | null> => {
  if (BLOCKED_IMAGE_TYPES.has(file.type)) {
    return "SVG and HTML files are not allowed.";
  }
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = readImageSignatures(header);
  if (!detected) return "Only JPEG, PNG, GIF, or WebP images are allowed.";
  if (file.type.startsWith("image/") && file.type !== detected && file.type !== "image/jpg") {
    return "File content does not match its declared type.";
  }
  return null;
};

const TARGET_UPLOAD_BYTES = 900 * 1024;
const MAX_SELECTION = 20;

export const MAX_SELECTION_COUNT = MAX_SELECTION;

const renderJpeg = async (
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<Blob | null> => {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality),
  );
};

/** Compress large images client-side so encrypted payload stays under the 1 MB limit. */
export const prepareImageForUpload = async (
  file: File,
): Promise<{ file: File; compressed: boolean }> => {
  if (file.size <= TARGET_UPLOAD_BYTES) return { file, compressed: false };
  if (typeof createImageBitmap !== "function") {
    throw new Error(`"${file.name}" is too large and could not be compressed in this browser.`);
  }

  const bitmap = await createImageBitmap(file);
  let maxDim = Math.max(bitmap.width, bitmap.height);
  let blob: Blob | null = null;

  try {
    while (maxDim >= 320) {
      for (let quality = 0.85; quality >= 0.35; quality -= 0.1) {
        blob = await renderJpeg(bitmap, maxDim, quality);
        if (blob && blob.size <= TARGET_UPLOAD_BYTES) break;
      }
      if (blob && blob.size <= TARGET_UPLOAD_BYTES) break;
      maxDim = Math.round(maxDim * 0.75);
    }
  } finally {
    bitmap.close();
  }

  if (!blob || blob.size > TARGET_UPLOAD_BYTES) {
    throw new Error(`Could not compress "${file.name}" under 1 MB.`);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return {
    file: new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }),
    compressed: true,
  };
};

const allowedAssetHosts = () => {
  const hosts = new Set(["res.cloudinary.com", "localhost", "127.0.0.1"]);
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    try {
      hosts.add(new URL(apiUrl).hostname);
    } catch {
      /* ignore invalid env */
    }
  }
  return hosts;
};

const assertAllowedAssetUrl = (url: string) => {
  const parsed = new URL(url);
  const hosts = allowedAssetHosts();
  const allowed =
    hosts.has(parsed.hostname) || parsed.hostname.endsWith(".cloudinary.com");
  if (!allowed) throw new Error("Blocked asset URL");
};

const clampKdf = (params: KdfParams): KdfParams => ({
  type: "argon2id",
  memoryKiB: Math.min(Math.max(params.memoryKiB, 16384), MAX_KDF_MEMORY_KIB),
  iterations: Math.min(Math.max(params.iterations, 1), MAX_KDF_ITERATIONS),
  parallelism: Math.min(Math.max(params.parallelism, 1), 4),
  hashLength: 32,
});

// --- encoding helpers -------------------------------------------------------

export const randomBytes = (length: number): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(length));

export const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

export const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const utf8 = new TextEncoder();
const utf8Decoder = new TextDecoder();

// --- low-level AES-GCM ------------------------------------------------------

const importAesKey = (raw: Uint8Array): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", raw as BufferSource, GCM, false, ["encrypt", "decrypt"]);

interface Sealed {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

const seal = async (key: CryptoKey, data: Uint8Array): Promise<Sealed> => {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = await crypto.subtle.encrypt({ name: GCM, iv: iv as BufferSource }, key, data as BufferSource);
  return { iv, ciphertext: new Uint8Array(ciphertext) };
};

const open = async (key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> => {
  const plaintext = await crypto.subtle.decrypt(
    { name: GCM, iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new Uint8Array(plaintext);
};

// --- key derivation ---------------------------------------------------------

const deriveKek = async (
  passphrase: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<CryptoKey> => {
  const raw = await argon2id({
    password: passphrase,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memoryKiB,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return importAesKey(raw);
};

// --- master key management --------------------------------------------------

export interface WrappedMasterKey {
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyIv: string;
  kdf: string;
  recoveryWrappedKey?: string;
  recoverySalt?: string;
  recoveryIv?: string;
}

/** The unlocked master key, held in memory only for the duration of a session. */
export interface MasterKey {
  raw: Uint8Array;
  key: CryptoKey;
}

export const generateMasterKey = async (): Promise<MasterKey> => {
  const raw = randomBytes(KEY_BITS / 8);
  return { raw, key: await importAesKey(raw) };
};

const wrapWithSecret = async (
  masterKeyRaw: Uint8Array,
  secret: string,
  params: KdfParams,
): Promise<{ salt: string; iv: string; wrapped: string }> => {
  const salt = randomBytes(16);
  const kek = await deriveKek(secret, salt, params);
  const { iv, ciphertext } = await seal(kek, masterKeyRaw);
  return { salt: toBase64(salt), iv: toBase64(iv), wrapped: toBase64(ciphertext) };
};

/** Wrap the master key with the passphrase (and optionally a recovery code). */
export const wrapMasterKey = async (
  master: MasterKey,
  passphrase: string,
  recoveryCode?: string,
  params: KdfParams = DEFAULT_KDF,
): Promise<WrappedMasterKey> => {
  const primary = await wrapWithSecret(master.raw, passphrase.trim(), params);
  const result: WrappedMasterKey = {
    encryptedMasterKey: primary.wrapped,
    masterKeySalt: primary.salt,
    masterKeyIv: primary.iv,
    kdf: JSON.stringify(params),
  };

  if (recoveryCode) {
    const recovery = await wrapWithSecret(master.raw, recoveryCode, params);
    result.recoveryWrappedKey = recovery.wrapped;
    result.recoverySalt = recovery.salt;
    result.recoveryIv = recovery.iv;
  }

  return result;
};

const parseKdf = (raw: string): KdfParams => {
  try {
    const parsed = JSON.parse(raw) as Partial<KdfParams>;
    if (parsed && parsed.type === "argon2id") return clampKdf({ ...DEFAULT_KDF, ...parsed });
  } catch {
    /* fall through to default */
  }
  return DEFAULT_KDF;
};

/** Best-effort wipe of raw key bytes from memory. */
export const zeroMasterKey = (master: MasterKey | null) => {
  if (master?.raw) master.raw.fill(0);
};

/**
 * Unlock the master key with the passphrase. AES-GCM authentication means a
 * wrong passphrase fails to decrypt and throws, so this doubles as verification.
 */
export const unwrapMasterKey = async (
  passphrase: string,
  wrapped: Pick<WrappedMasterKey, "encryptedMasterKey" | "masterKeySalt" | "masterKeyIv" | "kdf">,
): Promise<MasterKey> => {
  const params = parseKdf(wrapped.kdf);
  const kek = await deriveKek(passphrase.trim(), fromBase64(wrapped.masterKeySalt), params);
  const raw = await open(kek, fromBase64(wrapped.masterKeyIv), fromBase64(wrapped.encryptedMasterKey));
  return { raw, key: await importAesKey(raw) };
};

/** Unlock the master key using the recovery code instead of the passphrase. */
export const unwrapMasterKeyWithRecovery = async (
  recoveryCode: string,
  wrapped: Pick<WrappedMasterKey, "recoveryWrappedKey" | "recoverySalt" | "recoveryIv" | "kdf">,
): Promise<MasterKey> => {
  if (!wrapped.recoveryWrappedKey || !wrapped.recoverySalt || !wrapped.recoveryIv) {
    throw new Error("Recovery is not available for this account");
  }
  const params = parseKdf(wrapped.kdf);
  const kek = await deriveKek(recoveryCode.trim().toUpperCase(), fromBase64(wrapped.recoverySalt), params);
  const raw = await open(
    kek,
    fromBase64(wrapped.recoveryIv),
    fromBase64(wrapped.recoveryWrappedKey),
  );
  return { raw, key: await importAesKey(raw) };
};

/** Human-friendly, high-entropy recovery code (~125 bits). */
export const generateRecoveryCode = (): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alphabetLen = alphabet.length;
  const maxUnbiased = Math.floor(256 / alphabetLen) * alphabetLen;
  const groups: string[] = [];
  let chunk = "";

  while (groups.length < 5) {
    const bytes = randomBytes(8);
    for (const byte of bytes) {
      if (byte >= maxUnbiased) continue;
      chunk += alphabet[byte % alphabetLen]!;
      if (chunk.length === 5) {
        groups.push(chunk);
        chunk = "";
        if (groups.length === 5) break;
      }
    }
  }

  return groups.join("-");
};

// --- per-photo encryption ---------------------------------------------------

export interface PhotoCiphertext {
  imageBlob: Blob;
  thumbBlob: Blob | null;
  metadata: {
    encryptedKey: string;
    keyIv: string;
    contentIv: string;
    encryptedFileName: string;
    fileNameIv: string;
    mimeType: string;
    thumbIv?: string;
  };
}

/** Downscale an image in a canvas to produce a small gallery thumbnail. */
export const makeThumbnail = async (file: File, maxDimension = 640): Promise<Blob | null> => {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.72),
    );
  } catch {
    return null;
  }
};

export const encryptPhoto = async (master: MasterKey, file: File): Promise<PhotoCiphertext> => {
  const dekRaw = randomBytes(KEY_BITS / 8);
  const dek = await importAesKey(dekRaw);

  const imageBytes = new Uint8Array(await file.arrayBuffer());
  const image = await seal(dek, imageBytes);

  const thumbSource = await makeThumbnail(file);
  let thumbBlob: Blob | null = null;
  let thumbIv: string | undefined;
  if (thumbSource) {
    const thumbBytes = new Uint8Array(await thumbSource.arrayBuffer());
    const thumb = await seal(dek, thumbBytes);
    thumbBlob = new Blob([thumb.ciphertext as BufferSource], { type: "application/octet-stream" });
    thumbIv = toBase64(thumb.iv);
  }

  const fileName = await seal(master.key, utf8.encode(file.name));
  const wrappedDek = await seal(master.key, dekRaw);

  return {
    imageBlob: new Blob([image.ciphertext as BufferSource], { type: "application/octet-stream" }),
    thumbBlob,
    metadata: {
      encryptedKey: toBase64(wrappedDek.ciphertext),
      keyIv: toBase64(wrappedDek.iv),
      contentIv: toBase64(image.iv),
      encryptedFileName: toBase64(fileName.ciphertext),
      fileNameIv: toBase64(fileName.iv),
      mimeType: file.type || "application/octet-stream",
      thumbIv,
    },
  };
};

interface DecryptSource {
  encryptedKey: string;
  keyIv: string;
}

const unwrapDek = async (master: MasterKey, source: DecryptSource): Promise<CryptoKey> => {
  const dekRaw = await open(master.key, fromBase64(source.keyIv), fromBase64(source.encryptedKey));
  return importAesKey(dekRaw);
};

export const decryptFileName = async (
  master: MasterKey,
  encryptedFileName: string,
  fileNameIv: string,
): Promise<string> => {
  const bytes = await open(master.key, fromBase64(fileNameIv), fromBase64(encryptedFileName));
  return utf8Decoder.decode(bytes);
};

/** Fetch encrypted bytes from a URL and decrypt them into a displayable Blob. */
export const decryptFromUrl = async (
  master: MasterKey,
  options: {
    url: string;
    encryptedKey: string;
    keyIv: string;
    iv: string; // content or thumbnail IV
    mimeType: string;
  },
): Promise<Blob> => {
  assertAllowedAssetUrl(options.url);
  const response = await fetch(options.url);
  if (!response.ok) throw new Error("Failed to download encrypted data");
  const ciphertext = new Uint8Array(await response.arrayBuffer());
  const dek = await unwrapDek(master, options);
  const plaintext = await open(dek, fromBase64(options.iv), ciphertext);
  return new Blob([plaintext as BufferSource], { type: options.mimeType || "application/octet-stream" });
};
