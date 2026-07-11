import { existsSync } from "fs";
import { readFileSync } from "fs";
import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { cryptoKeyRouter } from "./routes/crypto-key.routes";
import { photoRouter } from "./routes/photo.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { prisma } from "./lib/prisma";
import { isLocalStorage, readLocalAsset } from "./services/cloudinary.service";

export const app = express();

app.use("/clerk/webhook", webhookRouter);
app.use(
  clerkMiddleware({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  }),
);

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (normalizeOrigin(origin) === normalizeOrigin(env.FRONTEND_URL)) {
        callback(null, origin);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", storage: isLocalStorage() ? "local" : "cloudinary" });
  } catch {
    res.status(503).json({ status: "degraded", database: "unreachable" });
  }
});

app.get("/local-assets/*assetPath", (req, res) => {
  if (!isLocalStorage()) {
    res.status(404).end();
    return;
  }

  const rawPath = req.params.assetPath;
  const publicId = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  if (!publicId) {
    res.status(400).json({ message: "Asset path is required" });
    return;
  }

  try {
    const filePath = readLocalAsset(publicId);
    if (!existsSync(filePath)) {
      res.status(404).json({ message: "Asset not found" });
      return;
    }
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(readFileSync(filePath));
  } catch {
    res.status(400).json({ message: "Invalid asset path" });
  }
});

app.use("/api/crypto", cryptoKeyRouter);
app.use("/api/photos", photoRouter);
app.use(errorHandler);
