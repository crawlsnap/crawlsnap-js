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
    if (path === "/v1/sport-snap/livescores") {
      return ok({
        sport: "soccer",
        updated: "2026-07-05 15:04:05",
        matches: [{ id: "5542814", game: "Brazil 1 - 0 Norway", result: "1 - 0", status: "45", events: [] }],
      });
    }
    if (path === "/v1/sport-snap/matches") {
      return ok({
        competitions: [{
          competition: "Friendly",
          competition_url: "/competitions/world/friendly",
          fixtures: [{ fixture_id: "5542814", game: "Norway vs England", channels: [{ slug: "bein-connect-turkey", name: "beIN" }] }],
        }],
      });
    }
    if (path === "/v1/sport-snap/match/5542814") {
      return ok({
        competition: { competition: "Friendly", country: "World", url: "/competitions/world/friendly" },
        fixture: {
          fixture_id: "5542814",
          game: "Brazil vs Norway",
          status: "FT",
          result: "Y",
          team1_name: "Brazil",
          team2_name: "Norway",
          team1_result: "2",
          team2_result: "1",
          channels: [{ slug: "bein-connect-turkey", name: "beIN CONNECT Turkey" }],
        },
      });
    }
    if (path === "/v1/sport-snap/match/404") return err(404, "Unknown match id");
    if (path === "/v1/sport-snap/competitions") {
      return ok({
        competitions: {
          comp_popular: [{ name: "Premier League", slug: "premier-league", country: "England" }],
          comp_club_domestic: [{ country: "England", competitions: [{ name: "Premier League", slug: "premier-league" }] }],
        },
      });
    }
    if (path === "/v1/sport-snap/competitions/england/premier-league") {
      return ok({
        competition: { competition: "Premier League", country: "England", slug: "premier-league" },
        fixtures: [{ fixture_id: "1", game: "A vs B" }],
        tables: [],
      });
    }
    if (path === "/v1/sport-snap/countries/brazil") {
      return ok({
        team: { title: "Brazil", nat_team: "Y", slug: "brazil" },
        squad: [{ name: "Player One", url: "/player/player-one/1" }],
      });
    }
    if (path === "/v1/sport-snap/channels") {
      return ok({
        country: { name: "Turkey" },
        channels: [{ name: "beIN CONNECT Turkey", slug: "bein-connect-turkey", platform: "Stream" }],
      });
    }
    if (path === "/v1/sport-snap/channels/bein-connect-turkey/info") {
      return ok({
        channel: { slug: "bein-connect-turkey", name: "beIN CONNECT Turkey", platform: "Stream", coverage: "Turkey" },
        tv_rights: [{ name: "Premier League", slug: "premier-league" }],
      });
    }
    if (path === "/v1/sport-snap/news") {
      return ok({
        articles: [{ article_id: "42", title: "Transfer news", slug: "transfer-news", source: "Reporter" }],
        news_lang: "en",
      });
    }
    if (path === "/v1/sport-snap/search/all") {
      return ok({
        results: [{ type: "team", url: "/countries/brazil", title: "Brazil" }],
      });
    }
    if (path === "/v1/sport-snap/player/player-one/1") {
      return ok({
        profile: { id: "1", slug: "player-one", name: "Player One", position: "F" },
        team: { name: "Brazil", url: "/teams/brazil/selecao" },
        stats: { club_stats: [{ season: "2025/2026", goals: "12" }] },
      });
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

describe("SportSnap", () => {
  it("returns live scores", async () => {
    const { client } = makeClient();
    const board = await client.sportSnap.livescores();
    expect(board.sport).toBe("soccer");
    expect(board.matches[0]?.id).toBe("5542814");
    expect(board.matches[0]?.result).toBe("1 - 0");
  });

  it("returns fixtures grouped by competition", async () => {
    const { client } = makeClient();
    const fixtures = await client.sportSnap.matches();
    expect(fixtures.competitions[0]?.competition).toBe("Friendly");
    expect(fixtures.competitions[0]?.fixtures?.[0]?.fixture_id).toBe("5542814");
  });

  it("omits iso_code when not provided and sends it when set", async () => {
    let seen: string | null = null;
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      seen = url.searchParams.get("iso_code");
      return ok({ competitions: [] });
    };
    const client = new CrawlSnap({ apiKey: "sk-cs-test", fetch: fetchImpl });
    await client.sportSnap.matches();
    expect(seen).toBeNull();
    await client.sportSnap.matches("tr");
    expect(seen).toBe("tr");
  });

  it("returns a single match view with fixture detail", async () => {
    const { client } = makeClient();
    const match = await client.sportSnap.match(5542814);
    expect(match.fixture.status).toBe("FT");
    expect(match.fixture.team1_name).toBe("Brazil");
    expect(match.fixture.channels?.[0]?.slug).toBe("bein-connect-turkey");
    expect(match.competition.competition).toBe("Friendly");
  });

  it("throws NotFoundError for an unknown match id", async () => {
    const { client } = makeClient();
    await expect(client.sportSnap.match(404)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the competition catalog", async () => {
    const { client } = makeClient();
    const comps = await client.sportSnap.competitions();
    expect(comps.competitions.comp_popular?.[0]?.slug).toBe("premier-league");
  });

  it("returns competition detail by country/slug", async () => {
    const { client } = makeClient();
    const comp = await client.sportSnap.competition("england", "premier-league");
    expect(comp.competition.competition).toBe("Premier League");
    expect(comp.fixtures?.[0]?.game).toBe("A vs B");
  });

  it("returns a national team view", async () => {
    const { client } = makeClient();
    const team = await client.sportSnap.nationalTeam("brazil");
    expect(team.team.title).toBe("Brazil");
    expect(team.squad?.[0]?.name).toBe("Player One");
  });

  it("returns the curated channel list", async () => {
    const { client } = makeClient();
    const chans = await client.sportSnap.channels();
    expect(chans.country?.name).toBe("Turkey");
    expect(chans.channels[0]?.slug).toBe("bein-connect-turkey");
  });

  it("returns channel info with tv rights", async () => {
    const { client } = makeClient();
    const info = await client.sportSnap.channelInfo("bein-connect-turkey");
    expect(info.channel.name).toBe("beIN CONNECT Turkey");
    expect(info.tv_rights?.[0]?.name).toBe("Premier League");
  });

  it("returns the news feed", async () => {
    const { client } = makeClient();
    const news = await client.sportSnap.news();
    expect(news.articles[0]?.article_id).toBe("42");
    expect(news.articles[0]?.title).toBe("Transfer news");
  });

  it("runs full-text search", async () => {
    const { client } = makeClient();
    const results = await client.sportSnap.searchAll("brazil");
    expect(results.results[0]?.type).toBe("team");
    expect(results.results[0]?.url).toBe("/countries/brazil");
  });

  it("returns a player profile with stats", async () => {
    const { client } = makeClient();
    const p = await client.sportSnap.player("player-one", 1);
    expect(p.profile.name).toBe("Player One");
    expect(p.stats?.club_stats?.[0]?.goals).toBe("12");
  });

  it("pins v1 and caches the pinned instance", async () => {
    const { client } = makeClient();
    expect(client.sportSnap.v1).toBe(client.sportSnap.v1);
    const board = await client.sportSnap.v1.livescores();
    expect(board.sport).toBe("soccer");
  });
});
