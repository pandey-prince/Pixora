import { createClerkClient } from "@clerk/backend";
import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { upsertClerkUser } from "../services/user.service";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/http-error";

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

export const requireApiAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, "Unauthorized");

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, clerkId: true },
  });

  if (!user) {
    try {
      const clerkUser = await clerk.users.getUser(userId);
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

      user = { id: synced.id, clerkId: synced.clerkId };
    } catch {
      throw new HttpError(403, "User profile is not synced yet");
    }
  }

  req.dbUser = user;
  next();
});
