import { describe, expect, test } from "bun:test";
import { parseCryptoKeyInit, parseCryptoKeyRotate } from "./crypto-key.schema";

const validIv = Buffer.alloc(12, 1).toString("base64");
const validBlob = Buffer.from("ciphertext").toString("base64");
const validKdf = JSON.stringify({
  type: "argon2id",
  memoryKiB: 65536,
  iterations: 3,
  parallelism: 1,
  hashLength: 32,
});

const validPayload = {
  encryptedMasterKey: validBlob,
  masterKeySalt: validBlob,
  masterKeyIv: validIv,
  kdf: validKdf,
};

describe("parseCryptoKeyInit", () => {
  test("accepts valid wrapped key material", () => {
    const parsed = parseCryptoKeyInit(validPayload);
    expect(parsed.encryptedMasterKey).toBe(validBlob);
    expect(parsed.recoveryWrappedKey).toBeNull();
  });

  test("rejects empty encrypted master key", () => {
    expect(() => parseCryptoKeyInit({ ...validPayload, encryptedMasterKey: "" })).toThrow(
      "encryptedMasterKey is required",
    );
  });

  test("rejects invalid IV length", () => {
    expect(() =>
      parseCryptoKeyInit({
        ...validPayload,
        masterKeyIv: Buffer.alloc(8).toString("base64"),
      }),
    ).toThrow("masterKeyIv must be 12 bytes");
  });

  test("rejects oversized fields", () => {
    expect(() =>
      parseCryptoKeyInit({
        ...validPayload,
        encryptedMasterKey: "A".repeat(70000),
      }),
    ).toThrow("encryptedMasterKey is too large");
  });
});

describe("parseCryptoKeyRotate", () => {
  test("accepts rotation without recovery fields", () => {
    const parsed = parseCryptoKeyRotate(validPayload);
    expect(parsed.kdf).toBe(validKdf);
  });
});
