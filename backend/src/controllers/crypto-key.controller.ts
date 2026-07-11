import type { Request, Response } from "express";
import {
  getKeyStatus,
  initializeKeys,
  rotateKeys,
  type WrappedKeyPayload,
} from "../services/crypto-key.service";

const readInitPayload = (body: unknown): WrappedKeyPayload => {
  const data = (body ?? {}) as Record<string, unknown>;
  return {
    encryptedMasterKey: String(data.encryptedMasterKey ?? ""),
    masterKeySalt: String(data.masterKeySalt ?? ""),
    masterKeyIv: String(data.masterKeyIv ?? ""),
    kdf: typeof data.kdf === "string" ? data.kdf : JSON.stringify(data.kdf ?? ""),
    recoveryWrappedKey: data.recoveryWrappedKey ? String(data.recoveryWrappedKey) : null,
    recoverySalt: data.recoverySalt ? String(data.recoverySalt) : null,
    recoveryIv: data.recoveryIv ? String(data.recoveryIv) : null,
  };
};

/** Rotation payload: recovery fields are optional and omitted means "preserve". */
const readRotatePayload = (body: unknown): WrappedKeyPayload => {
  const data = (body ?? {}) as Record<string, unknown>;
  const payload: WrappedKeyPayload = {
    encryptedMasterKey: String(data.encryptedMasterKey ?? ""),
    masterKeySalt: String(data.masterKeySalt ?? ""),
    masterKeyIv: String(data.masterKeyIv ?? ""),
    kdf: typeof data.kdf === "string" ? data.kdf : JSON.stringify(data.kdf ?? ""),
  };

  if ("recoveryWrappedKey" in data) {
    payload.recoveryWrappedKey = data.recoveryWrappedKey ? String(data.recoveryWrappedKey) : null;
  }
  if ("recoverySalt" in data) {
    payload.recoverySalt = data.recoverySalt ? String(data.recoverySalt) : null;
  }
  if ("recoveryIv" in data) {
    payload.recoveryIv = data.recoveryIv ? String(data.recoveryIv) : null;
  }

  return payload;
};

export const readKeys = async (req: Request, res: Response) => {
  res.json(await getKeyStatus(req.dbUser!.id));
};

export const createKeys = async (req: Request, res: Response) => {
  await initializeKeys(req.dbUser!.id, readInitPayload(req.body));
  res.status(201).json({ success: true });
};

export const updateKeys = async (req: Request, res: Response) => {
  await rotateKeys(req.dbUser!.id, readRotatePayload(req.body));
  res.json({ success: true });
};
