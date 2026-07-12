import { env } from "./env";

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

/** Built-in production frontends (custom domain + Vercel default). */
const BUILTIN_ORIGINS = [
  "https://pixora-gallery.online",
  "https://www.pixora-gallery.online",
  "https://pixora-photogallery.vercel.app",
];

export const getAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>([normalizeOrigin(env.FRONTEND_URL), ...BUILTIN_ORIGINS]);

  if (env.ALLOWED_ORIGINS) {
    for (const entry of env.ALLOWED_ORIGINS.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) origins.add(normalizeOrigin(trimmed));
    }
  }

  return origins;
};

export const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  return getAllowedOrigins().has(normalizeOrigin(origin));
};
