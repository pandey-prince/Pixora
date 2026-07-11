import { Router, raw } from "express";
import { handleClerkWebhook } from "../controllers/webhook.controller";
import { webhookRateLimit } from "../middleware/rate-limit.middleware";
import { asyncHandler } from "../utils/async-handler";

export const webhookRouter = Router();

webhookRouter.post(
  "/",
  webhookRateLimit,
  raw({ type: "application/json" }),
  asyncHandler(handleClerkWebhook),
);
