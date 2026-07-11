import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import {
  emailFromClerkPayload,
  isJwtAuthMode,
  verifyClerkBearerToken,
} from "../lib/clerk-jwks";
import { prisma } from "../lib/prisma";
import { upsertClerkUser } from "../services/user.service";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/http-error";

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

const bearerToken = (header: string | undefined) => {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
};

const resolveDbUser = async (clerkId: string) => {
  let user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true },
  });

  if (user) return user;

  try {
    const clerkUser = await clerk.users.getUser(clerkId);
    const primaryEmail = clerkUser.emailAddresses.find(
      (item) => item.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) throw new HttpError(403, "User profile is not synced yet");

    const synced = await upsertClerkUser({
      id: clerkUser.id,
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      email_addresses: clerkUser.emailAddresses.map((item) => ({
        id: item.id,
        email_address: item.emailAddress,
      })),
      primary_email_address_id: clerkUser.primaryEmailAddressId,
    });

    return { id: synced.id, clerkId: synced.clerkId };
  } catch {
    throw new HttpError(403, "User profile is not synced yet");
  }
};

const resolveDbUserFromJwt = async (clerkId: string, email: string) => {
  const synced = await upsertClerkUser({
    id: clerkId,
    email_addresses: [{ id: "local", email_address: email }],
    primary_email_address_id: "local",
  });
  return { id: synced.id, clerkId: synced.clerkId };
};

export const requireApiAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  if (isJwtAuthMode()) {
    const token = bearerToken(req.headers.authorization);
    if (!token) throw new HttpError(401, "Unauthorized");

    const payload = await verifyClerkBearerToken(token);
    const clerkId = payload.sub;
    if (!clerkId) throw new HttpError(401, "Unauthorized");

    let user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true },
    });

    if (!user) {
      user = await resolveDbUserFromJwt(clerkId, emailFromClerkPayload(payload, clerkId));
    }

    req.dbUser = user;
    next();
    return;
  }

  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, "Unauthorized");

  req.dbUser = await resolveDbUser(userId);
  next();
});
