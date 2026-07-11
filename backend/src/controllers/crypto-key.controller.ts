import type { Request, Response } from "express";
import { parseCryptoKeyInit, parseCryptoKeyRotate } from "../schemas/crypto-key.schema";
import {
  getKeyStatus,
  initializeKeys,
  rotateKeys,
} from "../services/crypto-key.service";

export const readKeys = async (req: Request, res: Response) => {
  res.json(await getKeyStatus(req.dbUser!.id));
};

export const createKeys = async (req: Request, res: Response) => {
  await initializeKeys(req.dbUser!.id, parseCryptoKeyInit(req.body));
  res.status(201).json({ success: true });
};

export const updateKeys = async (req: Request, res: Response) => {
  await rotateKeys(req.dbUser!.id, parseCryptoKeyRotate(req.body));
  res.json({ success: true });
};
