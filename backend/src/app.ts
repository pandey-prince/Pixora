import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { cryptoKeyRouter } from "./routes/crypto-key.routes";
import { photoRouter } from "./routes/photo.routes";
import { webhookRouter } from "./routes/webhook.routes";
import { prisma } from "./lib/prisma";

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
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", database: "unreachable" });
  }
});

app.use("/api/crypto", cryptoKeyRouter);
app.use("/api/photos", photoRouter);
app.use(errorHandler);
