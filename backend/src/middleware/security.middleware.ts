import type { RequestHandler } from "express";
import { env, isProduction } from "../config/env";

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API is called from the Vercel frontend (cross-site); same-site would block those responses.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (isProduction()) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
};

export const hideServerFingerprint: RequestHandler = (_req, res, next) => {
  res.removeHeader("X-Powered-By");
  next();
};
