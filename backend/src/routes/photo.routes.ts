import { Router } from "express";
import { deletePhoto, listPhotos, uploadPhotos } from "../controllers/photo.controller";
import { requireApiAuth } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const photoRouter = Router();

photoRouter.use(requireApiAuth);
photoRouter.get("/", asyncHandler(listPhotos));
photoRouter.post(
  "/upload",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  asyncHandler(uploadPhotos),
);
photoRouter.delete("/:id", asyncHandler(deletePhoto));
