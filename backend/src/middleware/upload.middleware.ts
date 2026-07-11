import multer from "multer";

/**
 * Uploads are already encrypted on the client, so the payload is opaque
 * ciphertext (application/octet-stream), not an image. We therefore cannot
 * validate the MIME type here. Size and field limits still apply; the encrypted
 * blob is slightly larger than the original because of the GCM auth tag.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1048576, files: 2 },
});
