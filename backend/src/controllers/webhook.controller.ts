import type { Request, Response } from "express";
import { Webhook } from "svix";
import { env } from "../config/env";
import {
  deleteClerkUser,
  type ClerkUserPayload,
  upsertClerkUser,
} from "../services/user.service";
import { HttpError } from "../utils/http-error";

interface ClerkWebhookEvent {
  type?: string;
  data?: ClerkUserPayload;
}

export const handleClerkWebhook = async (req: Request, res: Response) => {
  const svixId = req.header("svix-id");
  const svixTimestamp = req.header("svix-timestamp");
  const svixSignature = req.header("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new HttpError(400, "Missing Svix headers");
  }

  let event: ClerkWebhookEvent;
  try {
    event = new Webhook(env.WEBHOOK_SECRET).verify(req.body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    throw new HttpError(401, "Invalid webhook signature");
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    await upsertClerkUser(event.data ?? {});
  } else if (event.type === "user.deleted") {
    await deleteClerkUser(event.data?.id);
  }

  res.json({ received: true });
};
