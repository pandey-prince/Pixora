import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env";

const publishableKeySuffix = env.CLERK_PUBLISHABLE_KEY.replace(/^pk_(test|live)_/, "");

const clerkFrontendApi = Buffer.from(publishableKeySuffix, "base64")
  .toString("utf8")
  .replace(/\$$/, "");

const jwks = createRemoteJWKSet(new URL(`https://${clerkFrontendApi}/.well-known/jwks.json`));

export const isLocalClerkSecret = env.CLERK_SECRET_KEY.includes("placeholder");

export const verifyClerkBearerToken = async (token: string): Promise<JWTPayload> => {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://${clerkFrontendApi}`,
  });
  return payload;
};

export const emailFromClerkPayload = (payload: JWTPayload, clerkId: string) => {
  if (typeof payload.email === "string" && payload.email.includes("@")) return payload.email;
  return `${clerkId}@local.pixora.dev`;
};
