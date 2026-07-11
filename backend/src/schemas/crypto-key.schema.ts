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

const kdfSchema = z
  .string()
  .min(1)
  .max(512)
  .superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value) as { type?: string };
      if (parsed?.type !== "argon2id") {
        ctx.addIssue({ code: "custom", message: "kdf must describe argon2id" });
      }
    } catch {
      ctx.addIssue({ code: "custom", message: "kdf must be valid JSON" });
    }
  });

const optionalRecoveryField = (label: string) =>
  z.union([z.literal(null), z.literal(""), base64Field(label)]).optional();

export const cryptoKeyInitSchema = z.object({
  encryptedMasterKey: base64Field("encryptedMasterKey"),
  masterKeySalt: base64Field("masterKeySalt", 128),
  masterKeyIv: ivField("masterKeyIv"),
  kdf: kdfSchema,
  recoveryWrappedKey: optionalRecoveryField("recoveryWrappedKey"),
  recoverySalt: optionalRecoveryField("recoverySalt"),
  recoveryIv: optionalRecoveryField("recoveryIv"),
});

export const cryptoKeyRotateSchema = cryptoKeyInitSchema
  .partial({
    recoveryWrappedKey: true,
    recoverySalt: true,
    recoveryIv: true,
  })
  .required({
    encryptedMasterKey: true,
    masterKeySalt: true,
    masterKeyIv: true,
    kdf: true,
  });

export type CryptoKeyInitPayload = z.infer<typeof cryptoKeyInitSchema>;
export type CryptoKeyRotatePayload = z.infer<typeof cryptoKeyRotateSchema>;

const normalizeRecovery = <T extends CryptoKeyInitPayload | CryptoKeyRotatePayload>(payload: T) => ({
  ...payload,
  recoveryWrappedKey: payload.recoveryWrappedKey || null,
  recoverySalt: payload.recoverySalt || null,
  recoveryIv: payload.recoveryIv || null,
});

export const parseCryptoKeyInit = (body: unknown) => {
  const result = cryptoKeyInitSchema.safeParse(body ?? {});
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid key material";
    throw new HttpError(400, message);
  }
  return normalizeRecovery(result.data);
};

export const parseCryptoKeyRotate = (body: unknown) => {
  const result = cryptoKeyRotateSchema.safeParse(body ?? {});
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid key material";
    throw new HttpError(400, message);
  }
  return normalizeRecovery(result.data);
};
