import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

const publishableKeySuffix = env.CLERK_PUBLISHABLE_KEY.replace(/^pk_(test|live)_/, "");

const clerkFrontendApi = Buffer.from(publishableKeySuffix, "base64")
  .toString("utf8")
  .replace(/\$$/, "");

const jwks = createRemoteJWKSet(new URL(`https://${clerkFrontendApi}/.well-known/jwks.json`));

export const isJwtAuthMode = () => env.CLERK_AUTH_MODE === "jwt";

const allowedAzp = new Set([
  env.FRONTEND_URL,
  env.CLERK_PUBLISHABLE_KEY,
  `https://${clerkFrontendApi}`,
]);

const assertAuthorizedParty = (payload: JWTPayload) => {
  const azp = payload.azp;
  if (typeof azp !== "string" || !allowedAzp.has(azp)) {
    throw new HttpError(401, "Unauthorized token origin");
  }
};

export const verifyClerkBearerToken = async (token: string): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://${clerkFrontendApi}`,
  });
  assertAuthorizedParty(payload);
  return payload;
};

export const emailFromClerkPayload = (payload: JWTPayload, clerkId: string) => {
  if (typeof payload.email === "string" && payload.email.includes("@")) return payload.email;
  return `${clerkId}@local.pixora.dev`;
};
