import type { Request, Response } from "express";
import { parseUploadMetadata } from "../schemas/upload.schema";
import { createEncryptedPhoto, getPhotos, removePhoto } from "../services/photo.service";
import { HttpError } from "../utils/http-error";

const MAX_PAGE = 10_000;

export const uploadPhotos = async (req: Request, res: Response) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const imageFile = files?.image?.[0];
  const thumbFile = files?.thumbnail?.[0];

  if (!imageFile) {
    throw new HttpError(400, "Encrypted image is required");
  }

  const metadata = parseUploadMetadata(req.body?.metadata);
  if (thumbFile && !metadata.thumbIv) {
    throw new HttpError(400, "thumbIv is required when a thumbnail is uploaded");
  }

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
  const page = Math.min(MAX_PAGE, Math.max(1, Number(req.query.page) || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  res.json(await getPhotos(req.dbUser!.id, page, limit));
};

export const deletePhoto = async (req: Request, res: Response) => {
  const photoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!photoId) throw new HttpError(400, "Photo ID is required");
  await removePhoto(req.dbUser!.id, photoId);
  res.json({ success: true });
};
