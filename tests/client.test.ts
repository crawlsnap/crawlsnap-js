/** Facade tests using a mocked `fetch` — no network. */
import { describe, expect, it } from "vitest";

import {
  APITimeoutError,
  CrawlSnap,
  CrawlSnapError,
  NotFoundError,
  QuotaExceededError,
  RateLimitError,
} from "../src/index";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function ok(data: unknown): Response {
  return jsonResponse(
    200,
    { data, is_success: true, message: "Success", response_code: 200 },
    { "x-request-id": "req_ok" },
  );
}

function err(status: number, message: string): Response {
  return jsonResponse(
    status,
    { data: null, is_success: false, message, response_code: status },
    { "x-request-id": "req_err" },
  );
}

function makeFetch() {
  const state = { urlCalls: 0 };
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const path = url.pathname;
    const query = url.searchParams.get("query");

    if (path === "/v1/ioc/search/ip") {
      return ok({ hash_id: "h", search_type: "ip", ip: query, reputation: 3, as_owner: "GOOGLE", tags: ["dns"] });
    }
    if (path === "/v1/ioc/search/domain") return err(404, "No IoC data found");
    if (path === "/v1/ioc/search/hash") return err(402, "Monthly quota exceeded");
    if (path === "/v1/ioc/search/url") {
      state.urlCalls += 1;
      if (state.urlCalls === 1) {
        return jsonResponse(
          429,
          { data: null, is_success: false, message: "Daily limit", response_code: 429 },
          { "retry-after": "0", "x-request-id": "req_429" },
        );
      }
      return ok({ hash_id: "h", search_type: "url", url: query });
    }
    if (path === "/v1/subdo-snap/scan") {
      if (!url.searchParams.get("cursor")) {
        return ok({ hash_id: "h", search_type: "domain", subdomains: [{ subdomain: "a.example.com" }], cursor: "c1", count: 2 });
      }
      return ok({ hash_id: "h", search_type: "domain", subdomains: [{ subdomain: "b.example.com" }], cursor: "", count: 2 });
    }
    return jsonResponse(500, { data: null, is_success: false, message: `unexpected ${path}`, response_code: 500 });
  };
  return { fetchImpl, state };
}

function makeClient(maxRetries = 2) {
  const { fetchImpl, state } = makeFetch();
  const client = new CrawlSnap({ apiKey: "sk-cs-test", maxRetries, fetch: fetchImpl });
  return { client, state };
}

describe("CrawlSnap facade", () => {
  it("returns typed data on success", async () => {
    const { client } = makeClient();
    const ip = await client.vectorSnap.ip("8.8.8.8");
    expect(ip.as_owner).toBe("GOOGLE");
    expect(ip.ip).toBe("8.8.8.8");
    expect(ip.tags).toEqual(["dns"]);
  });

  it("pinned version hits the same endpoint and is cached", async () => {
    const { client } = makeClient();
    expect((await client.vectorSnap.v1.ip("8.8.8.8")).as_owner).toBe("GOOGLE");
    expect(client.vectorSnap.v1).toBe(client.vectorSnap.v1);
  });

  it("a direct call equals the explicit .v1 call (stable default), per product", async () => {
    const { client } = makeClient();
    const direct = await client.vectorSnap.ip("8.8.8.8");
    const pinned = await client.vectorSnap.v1.ip("8.8.8.8");
    expect(direct.as_owner).toBe(pinned.as_owner);
    // Pinning VectorSnap leaves PulseSnap untouched (it still resolves normally).
    expect(client.pulseSnap.v1).toBe(client.pulseSnap.v1);
  });

  it("throws NotFoundError on 404", async () => {
    const { client } = makeClient();
    await expect(client.vectorSnap.domain("nope.example")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws QuotaExceededError on 402 with status and request id", async () => {
    const { client } = makeClient();
    await expect(client.vectorSnap.hash("deadbeef")).rejects.toMatchObject({
      statusCode: 402,
      requestId: "req_err",
    });
    await expect(client.vectorSnap.hash("deadbeef")).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("retries a 429 then succeeds", async () => {
    const { client, state } = makeClient(2);
    const res = await client.vectorSnap.url("https://x.com");
    expect(res.url).toBe("https://x.com");
    expect(state.urlCalls).toBe(2); // one 429, then a retry that succeeded
  });

  it("surfaces RateLimitError when retries are exhausted", async () => {
    const { client } = makeClient(0);
    await expect(client.vectorSnap.url("https://x.com")).rejects.toMatchObject({ retryAfter: 0 });
    const { client: c2 } = makeClient(0);
    await expect(c2.vectorSnap.url("https://x.com")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("iterates all pages of subdomains", async () => {
    const { client } = makeClient();
    const out: unknown[] = [];
    for await (const sub of client.subdoSnap.scanIter("example.com")) out.push(sub);
    expect(out).toEqual([{ subdomain: "a.example.com" }, { subdomain: "b.example.com" }]);
  });

  it("returns the full envelope with rawResponse", async () => {
    const { client } = makeClient();
    const raw = await client.vectorSnap.ip("8.8.8.8", { rawResponse: true });
    expect(raw.statusCode).toBe(200);
    expect(raw.requestId).toBe("req_ok");
    expect(raw.isSuccess).toBe(true);
    expect((raw.data as { as_owner: string }).as_owner).toBe("GOOGLE");
  });

  it("throws on a missing API key", () => {
    delete process.env.CRAWLSNAP_API_KEY;
    expect(() => new CrawlSnap({ fetch: makeFetch().fetchImpl })).toThrow(CrawlSnapError);
  });

  it("times out and throws APITimeoutError", async () => {
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    const client = new CrawlSnap({ apiKey: "sk-cs-test", maxRetries: 0, timeout: 30, fetch: hangingFetch });
    await expect(client.vectorSnap.ip("8.8.8.8")).rejects.toBeInstanceOf(APITimeoutError);
  });

  it("propagates a user-initiated abort without retrying", async () => {
    let calls = 0;
    const hangingFetch: typeof fetch = (_input, init) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    };
    const client = new CrawlSnap({ apiKey: "sk-cs-test", maxRetries: 2, fetch: hangingFetch });
    const controller = new AbortController();
    const promise = client.vectorSnap.ip("8.8.8.8", { signal: controller.signal });
    controller.abort(new Error("cancelled"));
    await expect(promise).rejects.toThrow("cancelled");
    expect(calls).toBe(1); // not retried
  });
});
