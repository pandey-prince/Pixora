import { prisma } from "../lib/prisma";
import { deleteImage } from "./cloudinary.service";

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
  if (!clerkId || !email) throw new Error("Clerk payload is missing user ID or email");

  return prisma.user.upsert({
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
};

export const deleteClerkUser = async (clerkId?: string) => {
  if (!clerkId) return;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { photos: { select: { publicId: true } } },
  });
  if (!user) return;

  await Promise.allSettled(user.photos.map((photo) => deleteImage(photo.publicId)));
  await prisma.user.delete({ where: { id: user.id } });
};
