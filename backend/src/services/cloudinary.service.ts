import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary";
import { env } from "../config/env";
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

  console.error("Storage upload failed:", message);
  return new HttpError(502, "Storage upload failed");
};

const AUTHENTICATED_TTL_SECONDS = 60 * 60;

export const signEncryptedAssetUrl = (publicId: string, authenticated = true): string => {
  if (isLocalStorage()) {
    return `http://localhost:${env.PORT}/local-assets/${publicId
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: authenticated ? "authenticated" : "upload",
    sign_url: authenticated,
    secure: true,
    ...(authenticated
      ? { expires_at: Math.floor(Date.now() / 1000) + AUTHENTICATED_TTL_SECONDS }
      : {}),
  });
};

/**
 * Upload an already-encrypted buffer to Cloudinary as an opaque authenticated `raw` asset.
 * In local development (placeholder Cloudinary credentials), files are stored on disk.
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
        type: "authenticated",
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(mapCloudinaryError(error ?? new Error("Cloudinary upload failed")));
          return;
        }
        resolve({
          public_id: result.public_id,
          secure_url: signEncryptedAssetUrl(result.public_id, true),
        });
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
