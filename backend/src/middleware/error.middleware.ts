import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { isAllowedOrigin } from "../config/allowed-origins";
import { HttpError } from "../utils/http-error";

const applyCorsHeaders = (req: Parameters<ErrorRequestHandler>[1], res: Parameters<ErrorRequestHandler>[2]) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  applyCorsHeaders(req, res);
  console.error(error);

  if (error instanceof MulterError) {
    res.status(400).json({ message: error.message });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  const detail =
    process.env.NODE_ENV !== "production" && error instanceof Error ? error.message : undefined;
  res.status(500).json({
    message: "Internal server error",
    ...(detail ? { detail } : {}),
  });
};
