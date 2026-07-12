import { existsSync, readFileSync } from "fs";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import { getAllowedOrigins, isAllowedOrigin } from "./config/allowed-origins";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { requireApiAuth } from "./middleware/auth.middleware";
import { globalRateLimit } from "./middleware/rate-limit.middleware";
import { hideServerFingerprint, securityHeaders } from "./middleware/security.middleware";
import { cryptoKeyRouter } from "./routes/crypto-key.routes";
import { photoRouter } from "./routes/photo.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { prisma } from "./lib/prisma";
import { isLocalStorage, readLocalAsset } from "./services/cloudinary.service";
import { userOwnsAsset } from "./services/photo.service";
import { asyncHandler } from "./utils/async-handler";
import { HttpError } from "./utils/http-error";

export const app = express();

app.set("trust proxy", 1);
app.use(hideServerFingerprint);
app.use(securityHeaders);

app.use("/clerk/webhook", webhookRouter);
app.use(
  clerkMiddleware({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, origin ?? true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(globalRateLimit);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.get(
  "/local-assets/*assetPath",
  requireApiAuth,
  asyncHandler(async (req, res) => {
    if (!isLocalStorage()) {
      res.status(404).end();
      return;
    }

    const rawPath = req.params.assetPath;
    const publicId = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
    if (!publicId) {
      throw new HttpError(400, "Asset path is required");
    }

    const ownsAsset = await userOwnsAsset(req.dbUser!.id, publicId);
    if (!ownsAsset) {
      throw new HttpError(404, "Asset not found");
    }

    const filePath = readLocalAsset(publicId);
    if (!existsSync(filePath)) {
      throw new HttpError(404, "Asset not found");
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.send(readFileSync(filePath));
  }),
);

app.use("/api/crypto", cryptoKeyRouter);
app.use("/api/photos", photoRouter);
app.use(errorHandler);
