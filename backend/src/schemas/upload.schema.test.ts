import { describe, expect, test } from "bun:test";
import { parseUploadMetadata } from "./upload.schema";

const validIv = Buffer.alloc(12, 1).toString("base64");
const validBlob = Buffer.from("ciphertext").toString("base64");

const validPayload = {
  encryptedKey: validBlob,
  keyIv: validIv,
  contentIv: validIv,
  encryptedFileName: validBlob,
  fileNameIv: validIv,
  mimeType: "image/png",
};

describe("parseUploadMetadata", () => {
  test("accepts valid metadata", () => {
    const parsed = parseUploadMetadata(JSON.stringify(validPayload));
    expect(parsed.mimeType).toBe("image/png");
  });

  test("rejects missing metadata string", () => {
    expect(() => parseUploadMetadata(undefined)).toThrow("Missing encryption metadata");
  });

  test("rejects invalid IV length", () => {
    expect(() =>
      parseUploadMetadata(
        JSON.stringify({ ...validPayload, keyIv: Buffer.alloc(8).toString("base64") }),
      ),
    ).toThrow("keyIv must be 12 bytes");
  });

  test("rejects invalid mime type", () => {
    expect(() =>
      parseUploadMetadata(JSON.stringify({ ...validPayload, mimeType: "not-a-mime" })),
    ).toThrow("Invalid mimeType");
  });
});
