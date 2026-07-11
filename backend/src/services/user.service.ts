import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";
import { deleteEncryptedAsset, deleteImage } from "./cloudinary.service";

export interface ClerkUserPayload {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: Array<{ id?: string; email_address?: string }>;
  primary_email_address_id?: string | null;
}

const getPrimaryEmail = (data: ClerkUserPayload) =>
  data.email_addresses?.find((item) => item.id === data.primary_email_address_id)?.email_address ??
  data.email_addresses?.[0]?.email_address;

export const upsertClerkUser = async (data: ClerkUserPayload) => {
  const clerkId = data.id;
  const email = getPrimaryEmail(data);
  if (!clerkId || !email) throw new HttpError(400, "Clerk payload is missing user ID or email");

  try {
    return await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
      },
      update: {
        email,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "A user with this email already exists");
    }
    throw error;
  }
};

export const deleteClerkUser = async (clerkId?: string) => {
  if (!clerkId) return;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      photos: { select: { publicId: true, thumbPublicId: true, encrypted: true } },
    },
  });
  if (!user) return;

  const results = await Promise.allSettled(
    user.photos.flatMap((photo) => {
      if (!photo.encrypted) return [deleteImage(photo.publicId)];
      const jobs = [deleteEncryptedAsset(photo.publicId)];
      if (photo.thumbPublicId) jobs.push(deleteEncryptedAsset(photo.thumbPublicId));
      return jobs;
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Cloudinary cleanup failed during user deletion", index, result.reason);
    }
  });

  await prisma.user.delete({ where: { id: user.id } });
};
