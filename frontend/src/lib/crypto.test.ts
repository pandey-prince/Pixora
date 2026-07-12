import { describe, expect, test } from "bun:test";
import {
  decryptFileName,
  generateMasterKey,
  generateRecoveryCode,
  MAX_UPLOAD_BYTES,
  prepareImageForUpload,
  unwrapMasterKey,
  unwrapMasterKeyWithRecovery,
  validatePassphrase,
  wrapMasterKey,
} from "./crypto";

const bytesEqual = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

describe("crypto", () => {
  test("validates passphrase strength", () => {
    expect(validatePassphrase("short")).toBeTruthy();
    expect(validatePassphrase("aaaaaaaaaaaa")).toBeTruthy();
    expect(validatePassphrase("PrincePandey12")).toBeNull();
  });

  test("wraps and unwraps master key with passphrase", async () => {
    const master = await generateMasterKey();
    const wrapped = await wrapMasterKey(master, "correct horse battery staple");
    const unwrapped = await unwrapMasterKey("correct horse battery staple", wrapped);
    expect(bytesEqual(master.raw, unwrapped.raw)).toBe(true);
  });

  test("rejects wrong passphrase", async () => {
    const master = await generateMasterKey();
    const wrapped = await wrapMasterKey(master, "correct horse battery staple");
    await expect(unwrapMasterKey("wrong passphrase", wrapped)).rejects.toThrow();
  });

  test("recovery code round-trip", async () => {
    const master = await generateMasterKey();
    const recoveryCode = generateRecoveryCode();
    const wrapped = await wrapMasterKey(master, "PrincePandey12", recoveryCode);
    const unwrapped = await unwrapMasterKeyWithRecovery(recoveryCode, {
      recoveryWrappedKey: wrapped.recoveryWrappedKey!,
      recoverySalt: wrapped.recoverySalt!,
      recoveryIv: wrapped.recoveryIv!,
      kdf: wrapped.kdf,
    });
    expect(bytesEqual(master.raw, unwrapped.raw)).toBe(true);
  });

  test("encrypts and decrypts file names via photo metadata", async () => {
    const master = await generateMasterKey();
    const { encryptPhoto } = await import("./crypto");
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], "vacation.png", {
      type: "image/png",
    });
    const ciphertext = await encryptPhoto(master, file);
    const name = await decryptFileName(
      master,
      ciphertext.metadata.encryptedFileName,
      ciphertext.metadata.fileNameIv,
    );
    expect(name).toBe("vacation.png");
  });

  test("prepareImageForUpload leaves small files unchanged", async () => {
    const bytes = new Uint8Array(2000);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    const file = new File([bytes], "small.jpg", { type: "image/jpeg" });
    const result = await prepareImageForUpload(file);
    expect(result.compressed).toBe(false);
    expect(result.file.size).toBeLessThan(MAX_UPLOAD_BYTES);
  });
});
