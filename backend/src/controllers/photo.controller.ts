import type { Request, Response } from "express";
import { createPhotos, getPhotos, removePhoto } from "../services/photo.service";
import { HttpError } from "../utils/http-error";

export const uploadPhotos = async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    throw new HttpError(400, "At least one image is required");
  }
  const photos = await createPhotos(req.dbUser!.id, req.files);
  res.status(201).json({ photos });
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
