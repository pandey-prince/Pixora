import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/http-error";

export const requireApiAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const { userId } = getAuth(req);
  if (!userId) throw new HttpError(401, "Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, clerkId: true },
  });
  if (!user) throw new HttpError(403, "User profile is not synced yet");

  req.dbUser = user;
  next();
});
