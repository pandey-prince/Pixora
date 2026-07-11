import { z } from "zod";
import { HttpError } from "../utils/http-error";

const decodeBase64 = (value: string): Buffer => {
  try {
    return Buffer.from(value, "base64");
  } catch {
    throw new HttpError(400, "Invalid base64 field");
  }
};

const base64Field = (label: string, maxLength = 65536) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} is too large`)
    .superRefine((value, ctx) => {
      try {
        if (decodeBase64(value).length === 0) {
          ctx.addIssue({ code: "custom", message: `${label} is empty` });
        }
      } catch {
        ctx.addIssue({ code: "custom", message: `${label} is not valid base64` });
      }
    });

const ivField = (label: string) =>
  base64Field(label, 64).superRefine((value, ctx) => {
    try {
      if (decodeBase64(value).length !== 12) {
        ctx.addIssue({ code: "custom", message: `${label} must be 12 bytes` });
      }
    } catch {
      /* handled above */
    }
  });

export const uploadMetadataSchema = z.object({
  encryptedKey: base64Field("encryptedKey"),
  keyIv: ivField("keyIv"),
  contentIv: ivField("contentIv"),
  encryptedFileName: base64Field("encryptedFileName"),
  fileNameIv: ivField("fileNameIv"),
  mimeType: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[\w.+-]+\/[\w.+-]+$|^application\/octet-stream$/, "Invalid mimeType"),
  thumbIv: ivField("thumbIv").optional(),
});

export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

export const parseUploadMetadata = (raw: unknown): UploadMetadata => {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new HttpError(400, "Missing encryption metadata");
  }
  if (raw.length > 65536) {
    throw new HttpError(400, "Encryption metadata is too large");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid encryption metadata");
  }

  const result = uploadMetadataSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid encryption metadata";
    throw new HttpError(400, message);
  }

  return result.data;
};
