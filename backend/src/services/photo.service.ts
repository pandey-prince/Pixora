import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { deleteImage, uploadImage } from "./cloudinary.service";

export const createPhotos = async (userId: string, files: Express.Multer.File[]) => {
  const uploaded: Array<{ publicId: string; imageUrl: string; fileName: string }> = [];

  try {
    for (const file of files) {
      const result = await uploadImage(file);
      uploaded.push({
        publicId: result.public_id,
        imageUrl: result.secure_url,
        fileName: file.originalname,
      });
    }

    return await prisma.$transaction(
      uploaded.map((photo) => prisma.photo.create({ data: { ...photo, userId } })),
    );
  } catch (error) {
    await Promise.allSettled(uploaded.map((photo) => deleteImage(photo.publicId)));
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

  await deleteImage(photo.publicId);
  await prisma.photo.delete({ where: { id: photo.id } });
};
