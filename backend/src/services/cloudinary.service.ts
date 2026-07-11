import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary";
import { HttpError } from "../utils/http-error";
import {
  deleteLocalAsset,
  isLocalStorage,
  readLocalAsset,
  uploadLocalBuffer,
} from "./local-storage.service";

export type CloudinaryUpload = Pick<UploadApiResponse, "public_id" | "secure_url">;

const mapCloudinaryError = (error: unknown): HttpError => {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : "Storage upload failed";

  if (message.includes("File size too large") || message.includes("Max file size")) {
    return new HttpError(413, "Encrypted file exceeds the 1 MB storage limit.");
  }
  if (message.includes("unsigned uploads")) {
    return new HttpError(
      413,
      "File is too large for your Cloudinary plan (1 MB limit). Use a smaller image or upgrade Cloudinary.",
    );
  }
  return new HttpError(502, `Storage upload failed: ${message}`);
};

/**
 * Upload an already-encrypted buffer to Cloudinary as an opaque `raw` asset.
 * In local development (placeholder Cloudinary credentials), files are stored
 * on disk and served from /local-assets instead.
 */
export const uploadEncryptedBuffer = (
  buffer: Buffer,
  folder = "photo-gallery-encrypted",
): Promise<CloudinaryUpload> => {
  if (isLocalStorage()) return uploadLocalBuffer(buffer, folder);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(mapCloudinaryError(error ?? new Error("Cloudinary upload failed")));
          return;
        }
        resolve({ public_id: result.public_id, secure_url: result.secure_url });
      },
    );
    stream.end(buffer);
  });
};

export const deleteEncryptedAsset = async (publicId: string): Promise<void> => {
  if (isLocalStorage()) {
    await deleteLocalAsset(publicId);
    return;
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
};

/**
 * Legacy delete for plaintext image assets uploaded before E2E encryption.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (isLocalStorage()) {
    await deleteLocalAsset(publicId);
    return;
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
};

export { readLocalAsset, isLocalStorage };
