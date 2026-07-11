import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary";

export type CloudinaryUpload = Pick<UploadApiResponse, "public_id" | "secure_url">;

/**
 * Upload an already-encrypted buffer to Cloudinary as an opaque `raw` asset.
 * The bytes are ciphertext, so Cloudinary (and anyone with the URL) only ever
 * sees an unreadable blob. We use `raw` because image transformations cannot be
 * applied to encrypted data.
 */
export const uploadEncryptedBuffer = (
  buffer: Buffer,
  folder = "photo-gallery-encrypted",
): Promise<CloudinaryUpload> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ public_id: result.public_id, secure_url: result.secure_url });
      },
    );
    stream.end(buffer);
  });

export const deleteEncryptedAsset = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw", invalidate: true });
};

/**
 * Legacy delete for plaintext image assets uploaded before E2E encryption.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
};
