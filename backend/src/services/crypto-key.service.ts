import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

/**
 * Wrapped key material stored on the server. Every value here is either
 * ciphertext or a public parameter (salt / IV / KDF description). The server
 * never receives the passphrase, the derived key-encryption key, or the raw
 * master key, so it cannot decrypt anything.
 */
export interface WrappedKeyPayload {
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyIv: string;
  kdf: string;
  recoveryWrappedKey?: string | null;
  recoverySalt?: string | null;
  recoveryIv?: string | null;
}

export interface KeyStatus {
  initialized: boolean;
  hasRecovery: boolean;
  encryptedMasterKey?: string;
  masterKeySalt?: string;
  masterKeyIv?: string;
  kdf?: string;
}

export const getKeyStatus = async (userId: string): Promise<KeyStatus> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      encryptedMasterKey: true,
      masterKeySalt: true,
      masterKeyIv: true,
      kdf: true,
      recoveryWrappedKey: true,
    },
  });

  if (!user || !user.encryptedMasterKey || !user.masterKeySalt || !user.masterKeyIv || !user.kdf) {
    return { initialized: false, hasRecovery: false };
  }

  return {
    initialized: true,
    hasRecovery: Boolean(user.recoveryWrappedKey),
    encryptedMasterKey: user.encryptedMasterKey,
    masterKeySalt: user.masterKeySalt,
    masterKeyIv: user.masterKeyIv,
    kdf: user.kdf,
  };
};

const assertPayload = (payload: WrappedKeyPayload) => {
  const { encryptedMasterKey, masterKeySalt, masterKeyIv, kdf } = payload;
  if (!encryptedMasterKey || !masterKeySalt || !masterKeyIv || !kdf) {
    throw new HttpError(400, "Missing wrapped key material");
  }
};

/**
 * First-time setup. Refuses to overwrite an existing master key so a second
 * device cannot silently lock the user out of previously encrypted photos.
 */
export const initializeKeys = async (userId: string, payload: WrappedKeyPayload) => {
  assertPayload(payload);

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedMasterKey: true },
  });
  if (existing?.encryptedMasterKey) {
    throw new HttpError(409, "Encryption is already set up for this account");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedMasterKey: payload.encryptedMasterKey,
      masterKeySalt: payload.masterKeySalt,
      masterKeyIv: payload.masterKeyIv,
      kdf: payload.kdf,
      recoveryWrappedKey: payload.recoveryWrappedKey ?? null,
      recoverySalt: payload.recoverySalt ?? null,
      recoveryIv: payload.recoveryIv ?? null,
    },
  });
};

/**
 * Passphrase rotation. The same master key is re-wrapped by a key derived from
 * the new passphrase, so already-encrypted photos stay readable without any
 * re-encryption of image data.
 */
export const rotateKeys = async (userId: string, payload: WrappedKeyPayload) => {
  assertPayload(payload);

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedMasterKey: true },
  });
  if (!existing?.encryptedMasterKey) {
    throw new HttpError(409, "Encryption has not been set up yet");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      encryptedMasterKey: payload.encryptedMasterKey,
      masterKeySalt: payload.masterKeySalt,
      masterKeyIv: payload.masterKeyIv,
      kdf: payload.kdf,
      recoveryWrappedKey: payload.recoveryWrappedKey ?? null,
      recoverySalt: payload.recoverySalt ?? null,
      recoveryIv: payload.recoveryIv ?? null,
    },
  });
};
