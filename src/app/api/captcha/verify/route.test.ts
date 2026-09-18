import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { claimAttempts } from "@/lib/db/schema";
import { POST } from "@/app/api/captcha/verify/route";
import { TURNSTILE_ACTION_CLAIM_FCFS } from "@/lib/turnstile";

const VALID_ADDRESS = "11111111111111111111111111111111";
const testClaimSeeds: string[] = [];

function testClaimSeed(): string {
  const seed = `vitest-captcha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  testClaimSeeds.push(seed);
  return seed;
}

function verifyRequest(body: unknown) {
  return new NextRequest("http://localhost/api/captcha/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const realFetch = globalThis.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Only intercepts the Cloudflare call — a blanket `fetch` stub would
  // also swallow the Neon driver's own HTTP calls to the real database
  // that `recordCaptchaVerification` needs (found the hard way: it
  // crashed reading `.ok` off an unconfigured mock response).
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === SITEVERIFY_URL) {
      throw new Error("fetchMock called with no queued response for this test");
    }
    return realFetch(input, init);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  for (const claimSeed of testClaimSeeds) {
    await db.delete(claimAttempts).where(eq(claimAttempts.claimSeed, claimSeed));
  }
});

describe("POST /api/captcha/verify — validation", () => {
  it("400s without a token", async () => {
    const res = await POST(verifyRequest({ claimSeed: "x" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400s without a claimSeed", async () => {
    const res = await POST(verifyRequest({ token: "tok" }));
    expect(res.status).toBe(400);
  });

  it("400s on an invalid walletAddress", async () => {
    const res = await POST(
      verifyRequest({ token: "tok", claimSeed: "x", walletAddress: "bad-address" }),
    );
    expect(res.status).toBe(400);
  });

  it("500s when CLOUDFLARE_SECRET isn't configured", async () => {
    vi.stubEnv("CLOUDFLARE_SECRET", "");
    const res = await POST(verifyRequest({ token: "tok", claimSeed: "x" }));
    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/captcha/verify — Cloudflare siteverify result", () => {
  it("403s when Cloudflare reports the token failed", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }));
    const res = await POST(verifyRequest({ token: "tok", claimSeed: testClaimSeed() }));
    expect(res.status).toBe(403);
  });

  it("403s when the action doesn't match this app's expected action", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, action: "some-other-action" }),
        { status: 200 },
      ),
    );
    const res = await POST(verifyRequest({ token: "tok", claimSeed: testClaimSeed() }));
    expect(res.status).toBe(403);
  });

  it("sends the secret + token to Cloudflare's siteverify endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, action: TURNSTILE_ACTION_CLAIM_FCFS }),
        { status: 200 },
      ),
    );
    await POST(verifyRequest({ token: "the-token", claimSeed: testClaimSeed() }));
    // fetchMock also sees the Neon driver's own DB call (passed through
    // for real, see the beforeEach comment) — find the Cloudflare call
    // specifically rather than assuming it's the only one.
    const siteverifyCall = fetchMock.mock.calls.find(([url]) => url === SITEVERIFY_URL);
    expect(siteverifyCall).toBeDefined();
    const [, init] = siteverifyCall!;
    const sentBody = new URLSearchParams(init.body as string);
    expect(sentBody.get("response")).toBe("the-token");
    expect(sentBody.get("secret")).toBeTruthy();
  });

  it("200s and records the verification in claim_attempts on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, action: TURNSTILE_ACTION_CLAIM_FCFS }),
        { status: 200 },
      ),
    );
    const claimSeed = testClaimSeed();
    const res = await POST(
      verifyRequest({ token: "tok", claimSeed, walletAddress: VALID_ADDRESS }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).verified).toBe(true);

    const rows = await db
      .select()
      .from(claimAttempts)
      .where(eq(claimAttempts.claimSeed, claimSeed));
    expect(rows).toHaveLength(1);
    expect(rows[0].captchaVerified).toBe(true);
    expect(rows[0].walletAddress).toBe(VALID_ADDRESS);
  });

  it("records a null walletAddress when the caller isn't authenticated yet", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ success: true, action: TURNSTILE_ACTION_CLAIM_FCFS }),
        { status: 200 },
      ),
    );
    const claimSeed = testClaimSeed();
    await POST(verifyRequest({ token: "tok", claimSeed }));

    const rows = await db
      .select()
      .from(claimAttempts)
      .where(eq(claimAttempts.claimSeed, claimSeed));
    expect(rows[0].walletAddress).toBeNull();
  });
});
