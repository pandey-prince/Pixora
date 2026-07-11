import type { Request, Response } from "express";
import { createEncryptedPhoto, getPhotos, removePhoto } from "../services/photo.service";
import { HttpError } from "../utils/http-error";

interface UploadMetadata {
  encryptedKey?: string;
  keyIv?: string;
  contentIv?: string;
  encryptedFileName?: string;
  fileNameIv?: string;
  mimeType?: string;
  thumbIv?: string;
}

const parseMetadata = (raw: unknown): Required<Omit<UploadMetadata, "thumbIv">> & { thumbIv?: string } => {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new HttpError(400, "Missing encryption metadata");
  }

  let parsed: UploadMetadata;
  try {
    parsed = JSON.parse(raw) as UploadMetadata;
  } catch {
    throw new HttpError(400, "Invalid encryption metadata");
  }

  const { encryptedKey, keyIv, contentIv, encryptedFileName, fileNameIv, mimeType } = parsed;
  if (!encryptedKey || !keyIv || !contentIv || !encryptedFileName || !fileNameIv || !mimeType) {
    throw new HttpError(400, "Incomplete encryption metadata");
  }

  return {
    encryptedKey,
    keyIv,
    contentIv,
    encryptedFileName,
    fileNameIv,
    mimeType,
    thumbIv: parsed.thumbIv,
  };
};

export const uploadPhotos = async (req: Request, res: Response) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const imageFile = files?.image?.[0];
  const thumbFile = files?.thumbnail?.[0];

  if (!imageFile) {
    throw new HttpError(400, "Encrypted image is required");
  }

  const metadata = parseMetadata(req.body?.metadata);

  const photo = await createEncryptedPhoto(req.dbUser!.id, {
    imageBuffer: imageFile.buffer,
    thumbBuffer: thumbFile?.buffer,
    encryptedKey: metadata.encryptedKey,
    keyIv: metadata.keyIv,
    contentIv: metadata.contentIv,
    encryptedFileName: metadata.encryptedFileName,
    fileNameIv: metadata.fileNameIv,
    mimeType: metadata.mimeType,
    thumbIv: thumbFile ? metadata.thumbIv : undefined,
  });

  res.status(201).json({ photo });
};

export const listPhotos = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  res.json(await getPhotos(req.dbUser!.id, page, limit));
};

export const deletePhoto = async (req: Request, res: Response) => {
  const photoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!photoId) throw new HttpError(400, "Photo ID is required");
  await removePhoto(req.dbUser!.id, photoId);
  res.json({ success: true });
};
