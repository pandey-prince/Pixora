import type { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../lib/cloudinary";

export type CloudinaryUpload = Pick<UploadApiResponse, "public_id" | "secure_url">;

export const uploadImage = (file: Express.Multer.File): Promise<CloudinaryUpload> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "photo-gallery",
        resource_type: "image",
        use_filename: true,
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
    stream.end(file.buffer);
  });

export const deleteImage = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
};
