import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const userOrIpKey = (req: { dbUser?: { id: string }; ip?: string }) =>
  req.dbUser?.id ?? ipKeyGenerator(req.ip ?? "unknown");

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later." },
});

export const webhookRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many webhook requests." },
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads. Try again later." },
  keyGenerator: userOrIpKey,
});

export const cryptoRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many encryption requests. Try again later." },
  keyGenerator: userOrIpKey,
});

export const listRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many gallery requests. Try again later." },
  keyGenerator: userOrIpKey,
});
