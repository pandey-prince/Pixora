import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_AUTH_MODE: z.enum(["express", "jwt"]).optional(),
  WEBHOOK_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  FRONTEND_URL: z
    .string()
    .url()
    .default("http://localhost:5173")
    .transform((url) => url.replace(/\/$/, "")),
  /** Comma-separated extra browser origins allowed by CORS (optional). */
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_PHOTOS_PER_USER: z.coerce.number().int().positive().default(100),
  PORT: z.coerce.number().int().positive().default(4000),
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === "production") {
  const demoCreds =
    parsed.CLOUDINARY_API_KEY === "demo" || parsed.CLOUDINARY_CLOUD_NAME === "demo";
  if (demoCreds) {
    throw new Error("Demo Cloudinary credentials are not allowed in production");
  }
}

export const env = {
  ...parsed,
  CLERK_AUTH_MODE:
    parsed.CLERK_AUTH_MODE ??
    (parsed.CLERK_SECRET_KEY.includes("placeholder") ? ("jwt" as const) : ("express" as const)),
};

export const isProduction = () => env.NODE_ENV === "production";
