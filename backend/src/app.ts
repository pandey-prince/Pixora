import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { photoRouter } from "./routes/photo.routes";
import { webhookRouter } from "./routes/webhook.routes";

export const app = express();

app.use("/clerk/webhook", webhookRouter);
app.use(
  clerkMiddleware({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  }),
);

app.use(cors({ origin: "*" }));
//app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/photos", photoRouter);
app.use(errorHandler);
