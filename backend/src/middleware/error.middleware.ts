import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import { HttpError } from "../utils/http-error";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof MulterError) {
    res.status(400).json({ message: error.message });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  res.status(500).json({ message: "Internal server error" });
};
