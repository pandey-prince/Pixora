import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import {
  deleteEncryptedAsset,
  deleteImage,
  uploadEncryptedBuffer,
} from "./cloudinary.service";
import { userHasEncryptionKeys } from "./crypto-key.service";

export interface EncryptedPhotoInput {
  imageBuffer: Buffer;
  thumbBuffer?: Buffer;
  encryptedKey: string;
  keyIv: string;
  contentIv: string;
  encryptedFileName: string;
  fileNameIv: string;
  mimeType: string;
  thumbIv?: string;
}

const cleanupAssets = async (photo: {
  encrypted: boolean;
  publicId: string;
  thumbPublicId: string | null;
}) => {
  try {
    if (photo.encrypted) {
      await deleteEncryptedAsset(photo.publicId);
      if (photo.thumbPublicId) await deleteEncryptedAsset(photo.thumbPublicId);
    } else {
      await deleteImage(photo.publicId);
    }
  } catch (error) {
    console.error("Cloudinary cleanup failed for", photo.publicId, error);
  }
};

/**
 * Persist a single already-encrypted photo. The image bytes and thumbnail are
 * uploaded to Cloudinary as opaque `raw` assets; only wrapped keys and IVs are
 * stored in the database. If anything fails, uploaded assets are cleaned up so
 * we never leak orphaned blobs.
 */
export const createEncryptedPhoto = async (userId: string, input: EncryptedPhotoInput) => {
  if (!(await userHasEncryptionKeys(userId))) {
    throw new HttpError(409, "Set up encryption before uploading photos");
  }

  const uploadedPublicIds: string[] = [];

  try {
    const image = await uploadEncryptedBuffer(input.imageBuffer);
    uploadedPublicIds.push(image.public_id);

    let thumbUrl: string | null = null;
    let thumbPublicId: string | null = null;
    if (input.thumbBuffer && input.thumbIv) {
      const thumb = await uploadEncryptedBuffer(input.thumbBuffer, "photo-gallery-encrypted/thumbs");
      uploadedPublicIds.push(thumb.public_id);
      thumbUrl = thumb.secure_url;
      thumbPublicId = thumb.public_id;
    }

    return await prisma.photo.create({
      data: {
        userId,
        imageUrl: image.secure_url,
        publicId: image.public_id,
        fileName: "encrypted",
        encrypted: true,
        encryptedKey: input.encryptedKey,
        keyIv: input.keyIv,
        contentIv: input.contentIv,
        encryptedFileName: input.encryptedFileName,
        fileNameIv: input.fileNameIv,
        mimeType: input.mimeType,
        thumbUrl,
        thumbPublicId,
        thumbIv: input.thumbIv ?? null,
      },
    });
  } catch (error) {
    await Promise.allSettled(uploadedPublicIds.map((id) => deleteEncryptedAsset(id)));
    throw error;
  }
};

export const getPhotos = async (userId: string, page: number, limit: number) => {
  const [photos, total] = await prisma.$transaction([
    prisma.photo.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.photo.count({ where: { userId } }),
  ]);

  return {
    photos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const removePhoto = async (userId: string, photoId: string) => {
  const photo = await prisma.photo.findFirst({ where: { id: photoId, userId } });
  if (!photo) throw new HttpError(404, "Photo not found");

  await prisma.photo.delete({ where: { id: photo.id } });
  await cleanupAssets(photo);
};
