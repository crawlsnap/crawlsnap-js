# crawlsnap

Official JavaScript / TypeScript SDK for [CrawlSnap](https://crawlsnap.com) — a
data intelligence platform that delivers structured, on-demand data through fast,
typed APIs. Authenticate once and call any CrawlSnap data product, with
first-class types, automatic retries, and pagination built in.

- Fully typed, idiomatic client built on the native `fetch` — **zero runtime dependencies**
- Works on Node 20+, Bun, Deno, Cloudflare Workers, and the browser
- Ships dual **ESM + CommonJS** with bundled `.d.ts` types
- Resource namespacing: `client.vectorSnap.ip(...)`
- Per-API version pinning with a **stable default** — your calls never silently jump to a new API version
- Returns typed data; throws typed errors — no envelope bookkeeping
- Built-in retries with exponential backoff, configurable timeout, `AbortSignal` support, auto-pagination

---

## Installation

```bash
npm install crawlsnap
```

Requires Node 20+ (or any runtime with a global `fetch` and `AbortSignal.any`).

## Authentication

Get an API key (`sk-cs-...`) from your CrawlSnap dashboard. Provide it via the
environment or explicitly:

```bash
export CRAWLSNAP_API_KEY=sk-cs-...
```

```ts
import { CrawlSnap } from "crawlsnap";

const client = new CrawlSnap();                       // reads CRAWLSNAP_API_KEY
const client = new CrawlSnap({ apiKey: "sk-cs-..." }); // or pass it explicitly
```

The key is sent as `Authorization: Bearer sk-cs-...`. Treat it like a password —
never embed it in client-side code or commit it to source control.

## Quick start

```ts
import { CrawlSnap } from "crawlsnap";

const client = new CrawlSnap({ apiKey: "sk-cs-..." });

const ip = await client.vectorSnap.ip("8.8.8.8");
console.log(ip.reputation, ip.as_owner, ip.country);
```

Each call resolves to the typed enrichment payload directly, and throws a typed
error on failure — you never inspect an `is_success` envelope yourself.

Payload fields use the API's wire format (snake_case, e.g. `as_owner`), like the
OpenAI and Stripe SDKs; only the SDK surface (client, resources, methods,
options) is camelCase.

## Concurrency

JavaScript is async by default, so there is a single client and every method
returns a `Promise`. Enrich many indicators at once with `Promise.all`:

```ts
const [ip, domain] = await Promise.all([
  client.vectorSnap.ip("8.8.8.8"),
  client.vectorSnap.domain("google.com"),
]);
console.log(ip.as_owner, domain.reputation);
```

## Resources

| Resource | Methods | Returns |
|----------|---------|---------|
| `vectorSnap` | `url` · `hash` · `ip` · `domain` | reputation, detections, categories, relationships |
| `pulseSnap`  | `url` · `hash` · `ip` · `domain` | threat-intelligence pulse (and sandbox) summary |
| `subdoSnap`  | `scan` · `scanIter` | enumerated subdomains (paginated) |
| `sportSnap`  | `channel` · `channelSchedule` · `match` · `countryChannels` · `dailySchedule` | live football TV listings: channels, schedules, match details |

```ts
const url    = await client.vectorSnap.url("https://example.com");
const file   = await client.vectorSnap.hash("44d88612fea8a8f36de82e1278abb02f");
const domain = await client.vectorSnap.domain("google.com");

const pulse  = await client.pulseSnap.ip("8.8.8.8");

const channel  = await client.sportSnap.channel("bein-connect-turkey");
const schedule = await client.sportSnap.channelSchedule("bein-connect-turkey");
const match    = await client.sportSnap.match(5542814);
const channels = await client.sportSnap.countryChannels("turkey");
const day      = await client.sportSnap.dailySchedule("2026-07-05"); // or a Date
```

Every method takes its lookup value as the first argument and an optional
per-call options object (`{ signal, timeout, maxRetries, rawResponse }`).

`sportSnap` covers live football (soccer) TV listings: TV channel metadata and
broadcast rights, channel broadcast schedules, match details with per-country
broadcast coverage (score, events, statistics, and lineups for finished
matches), country channel directories, and daily schedules grouped by
competition. `match.status` is `scheduled`, `live`, or `finished` and
discriminates how much of the payload is populated. Match ids are discovered
via `dailySchedule` and `channelSchedule` entries.

## API versioning

Each CrawlSnap data product is versioned **independently**, and the version is
just a value the SDK puts in the request path — not something baked into your
call site. A direct resource call targets that product's **stable default**
version for this SDK release:

```ts
await client.vectorSnap.ip("8.8.8.8");        // default VectorSnap version (stable)
```

The default is **pinned per SDK release and never moves on its own**: upgrading
the SDK does not silently retarget your calls at a newer API version. When a
product ships a new version, you opt in explicitly — per product, without
touching the others:

```ts
await client.vectorSnap.v1.ip("8.8.8.8");     // explicitly VectorSnap v1
await client.pulseSnap.url("https://x.com");   // unaffected — PulseSnap default
```

When a product's default version is bumped in a future SDK release, it ships as
a deliberate, documented change — so you upgrade at your own pace.

## Error handling

Failures throw a typed error instead of returning an error envelope. Narrow with
`instanceof`:

```ts
import {
  NotFoundError,
  RateLimitError,
  QuotaExceededError,
  AuthenticationError,
  CrawlSnapError,
} from "crawlsnap";

try {
  const res = await client.vectorSnap.domain("example.com");
} catch (err) {
  if (err instanceof NotFoundError) {
    // 404 — no data for this indicator
  } else if (err instanceof QuotaExceededError) {
    console.log(err.message); // 402 — out of credits / monthly quota
  } else if (err instanceof RateLimitError) {
    console.log(err.retryAfter); // 429 — daily limit; seconds to wait
  } else if (err instanceof AuthenticationError) {
    // 401 — missing / invalid key
  } else if (err instanceof CrawlSnapError) {
    console.error(err); // base class for every SDK error
  }
}
```

| HTTP | Error | Notes |
|------|-------|-------|
| 400 | `BadRequestError` | invalid indicator |
| 401 | `AuthenticationError` | missing / invalid key |
| 402 | `QuotaExceededError` | out of credits or monthly quota |
| 403 | `SubscriptionInactiveError` | subscription not active |
| 404 | `NotFoundError` | no data for the indicator |
| 429 | `RateLimitError` | daily limit; `.retryAfter` (seconds) |
| 5xx | `ServerError` | server / upstream failure |
| — | `APIConnectionError` / `APITimeoutError` | network failure / client timeout |

Every status error carries `.statusCode`, `.message`, `.requestId`, and `.body`
(share the request id with support to speed up debugging).

## Pagination

`subdoSnap` is paginated. Stream every subdomain across all pages — the cursor
is handled for you:

```ts
for await (const subdomain of client.subdoSnap.scanIter("example.com")) {
  console.log(subdomain);
}
```

Or page manually:

```ts
let page = await client.subdoSnap.scan("example.com");
while (page.cursor) {
  page = await client.subdoSnap.scan("example.com", { cursor: page.cursor });
}
```

## Configuration

```ts
const client = new CrawlSnap({
  apiKey: "sk-cs-...",
  baseURL: "https://api.crawlsnap.com",
  timeout: 30_000,   // ms
  maxRetries: 3,
  fetch: customFetch, // optional: proxies, custom runtimes, testing
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | `$CRAWLSNAP_API_KEY` | Your `sk-cs-` key |
| `baseURL` | `$CRAWLSNAP_BASE_URL` or `https://api.crawlsnap.com` | API host override |
| `timeout` | `30000` | Per-request timeout (ms) |
| `maxRetries` | `2` | Retries for 429 / 5xx / connection errors |
| `fetch` | global `fetch` | Custom fetch implementation |

Retries use exponential backoff and honor the `Retry-After` header on 429.

### Per-call options

Each method accepts an options object that overrides the client defaults and adds
an `AbortSignal` and a raw-response escape hatch:

```ts
const controller = new AbortController();

const ip = await client.vectorSnap.ip("8.8.8.8", {
  signal: controller.signal, // cancel the request (and any pending retry wait)
  timeout: 5_000,
  maxRetries: 0,
});
```

### Raw response

Pass `rawResponse: true` to get the full envelope (status, headers, request id)
instead of just the data:

```ts
const raw = await client.vectorSnap.ip("8.8.8.8", { rawResponse: true });
console.log(raw.statusCode, raw.requestId, raw.isSuccess, raw.data);
```

## Development

The types in `src/models.ts` are generated from the public OpenAPI contract; the
client facade is hand-written. To refresh the types after the contract changes:

```bash
npm run regenerate   # re-bundles the contract and regenerates src/models.ts
```

Build, typecheck, and test:

```bash
npm install
npm run build
npm run typecheck
npm test             # vitest, mocked fetch — no network
```
