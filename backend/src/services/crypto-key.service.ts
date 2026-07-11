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
  recoveryWrappedKey?: string;
  recoverySalt?: string;
  recoveryIv?: string;
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
      recoverySalt: true,
      recoveryIv: true,
    },
  });

  if (!user || !user.encryptedMasterKey || !user.masterKeySalt || !user.masterKeyIv || !user.kdf) {
    return { initialized: false, hasRecovery: false };
  }

  const hasRecovery = Boolean(user.recoveryWrappedKey && user.recoverySalt && user.recoveryIv);

  return {
    initialized: true,
    hasRecovery,
    encryptedMasterKey: user.encryptedMasterKey,
    masterKeySalt: user.masterKeySalt,
    masterKeyIv: user.masterKeyIv,
    kdf: user.kdf,
    ...(hasRecovery
      ? {
          recoveryWrappedKey: user.recoveryWrappedKey!,
          recoverySalt: user.recoverySalt!,
          recoveryIv: user.recoveryIv!,
        }
      : {}),
  };
};

const assertPayload = (payload: WrappedKeyPayload) => {
  const { encryptedMasterKey, masterKeySalt, masterKeyIv, kdf } = payload;
  if (!encryptedMasterKey || !masterKeySalt || !masterKeyIv || !kdf) {
    throw new HttpError(400, "Missing wrapped key material");
  }
};

/**
 * First-time setup. Uses a conditional update so two concurrent requests cannot
 * both overwrite each other's master key.
 */
export const initializeKeys = async (userId: string, payload: WrappedKeyPayload) => {
  assertPayload(payload);

  const updated = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ encryptedMasterKey: null }, { encryptedMasterKey: "" }],
    },
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

  if (updated.count === 0) {
    throw new HttpError(409, "Encryption is already set up for this account");
  }
};

/**
 * Passphrase rotation. Omitted recovery fields are preserved so rotation does
 * not silently delete an existing recovery code.
 */
export const rotateKeys = async (userId: string, payload: WrappedKeyPayload) => {
  assertPayload(payload);

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      encryptedMasterKey: true,
      recoveryWrappedKey: true,
      recoverySalt: true,
      recoveryIv: true,
    },
  });
  if (!existing?.encryptedMasterKey) {
    throw new HttpError(409, "Encryption has not been set up yet");
  }

  const data: Record<string, string | null> = {
    encryptedMasterKey: payload.encryptedMasterKey,
    masterKeySalt: payload.masterKeySalt,
    masterKeyIv: payload.masterKeyIv,
    kdf: payload.kdf,
  };

  if (payload.recoveryWrappedKey !== undefined) data.recoveryWrappedKey = payload.recoveryWrappedKey;
  if (payload.recoverySalt !== undefined) data.recoverySalt = payload.recoverySalt;
  if (payload.recoveryIv !== undefined) data.recoveryIv = payload.recoveryIv;

  await prisma.user.update({ where: { id: userId }, data });
};

export const userHasEncryptionKeys = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedMasterKey: true },
  });
  return Boolean(user?.encryptedMasterKey);
};
