import { describe, expect, test } from "bun:test";
import { isAllowedOrigin } from "./allowed-origins";

describe("isAllowedOrigin", () => {
  test("allows production custom domains and Vercel default", () => {
    expect(isAllowedOrigin("https://pixora-gallery.online")).toBe(true);
    expect(isAllowedOrigin("https://www.pixora-gallery.online")).toBe(true);
    expect(isAllowedOrigin("https://pixora-photogallery.vercel.app")).toBe(true);
  });

  test("rejects unknown origins", () => {
    expect(isAllowedOrigin("https://evil.example")).toBe(false);
  });

  test("allows missing origin (same-origin or server-to-server)", () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
  });
});
