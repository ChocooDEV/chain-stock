import { describe, expect, it } from "vitest";
import { EMAIL_RE, hashEmail, hashEmailHex, isValidEmail, normalizeEmail } from "@/lib/email";

describe("isValidEmail / EMAIL_RE", () => {
  it("accepts a well-formed email from any provider", () => {
    expect(isValidEmail("sam@example.com")).toBe(true);
    expect(isValidEmail("sam@gmail.com")).toBe(true);
    expect(isValidEmail("sam.jones+tag@company.co.uk")).toBe(true);
  });

  it("rejects missing @ or domain", () => {
    expect(isValidEmail("sam")).toBe(false);
    expect(isValidEmail("sam@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("sam@example")).toBe(false);
  });

  it("rejects embedded whitespace", () => {
    expect(isValidEmail("sam @example.com")).toBe(false);
    expect(isValidEmail("sam@ example.com")).toBe(false);
  });

  it("EMAIL_RE and isValidEmail agree", () => {
    expect(EMAIL_RE.test("sam@example.com")).toBe(isValidEmail("sam@example.com"));
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Sam@Example.com  ")).toBe("sam@example.com");
  });

  it("is a no-op on an already-normalized email", () => {
    expect(normalizeEmail("sam@example.com")).toBe("sam@example.com");
  });
});

describe("hashEmail / hashEmailHex", () => {
  it("hashes case/whitespace variants of the same email identically", async () => {
    const variants = ["sam@example.com", "  Sam@Example.com  ", "SAM@EXAMPLE.COM"];
    const hashes = await Promise.all(variants.map(hashEmailHex));
    expect(new Set(hashes).size).toBe(1);
  });

  it("hashEmail returns 32 raw bytes matching hashEmailHex", async () => {
    const bytes = await hashEmail("sam@example.com");
    const hex = await hashEmailHex("sam@example.com");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);
    expect(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")).toBe(hex);
  });

  it("matches a known sha256 vector for the normalized string", async () => {
    // sha256("sam@example.com") — cross-checked independently against
    // Node's own crypto module, not just against this file's own logic.
    expect(await hashEmailHex("sam@example.com")).toBe(
      "cd25a6171969f2a3c6e35c7667e3908ef1bd2424241db04411a0eec454ca6c16",
    );
  });

  it("different emails hash differently", async () => {
    expect(await hashEmailHex("sam@example.com")).not.toBe(
      await hashEmailHex("alex@example.com"),
    );
  });
});
