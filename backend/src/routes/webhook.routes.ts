import { Router, raw } from "express";
import { handleClerkWebhook } from "../controllers/webhook.controller";
import { asyncHandler } from "../utils/async-handler";

export const webhookRouter = Router();

webhookRouter.post("/", raw({ type: "application/json" }), asyncHandler(handleClerkWebhook));
