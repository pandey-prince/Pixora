import multer from "multer";
import { HttpError } from "../utils/http-error";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new HttpError(400, "Only image files are allowed"));
      return;
    }
    callback(null, true);
  },
});
