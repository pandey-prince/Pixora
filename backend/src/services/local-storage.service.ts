import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { env } from "../config/env";

const UPLOAD_ROOT = path.join(process.cwd(), ".local-uploads");

export const isLocalStorage = () =>
  env.CLOUDINARY_API_KEY === "demo" || env.CLOUDINARY_CLOUD_NAME === "demo";

const assetPath = (publicId: string) => {
  const resolved = path.resolve(UPLOAD_ROOT, publicId);
  if (!resolved.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid asset path");
  }
  return resolved;
};

const assetUrl = (publicId: string) =>
  `http://localhost:${env.PORT}/local-assets/${publicId.split("/").map(encodeURIComponent).join("/")}`;

export const uploadLocalBuffer = async (buffer: Buffer, folder = "photo-gallery-encrypted") => {
  const publicId = `${folder}/${randomUUID()}`;
  const filePath = assetPath(publicId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return { public_id: publicId, secure_url: assetUrl(publicId) };
};

export const deleteLocalAsset = async (publicId: string): Promise<void> => {
  await unlink(assetPath(publicId)).catch(() => undefined);
};

export const readLocalAsset = (publicId: string) => assetPath(publicId);
