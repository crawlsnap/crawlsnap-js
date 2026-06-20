/**
 * Resource groups exposed on the client: `vectorSnap`, `pulseSnap`, `subdoSnap`.
 * Each method submits one indicator and resolves to the typed enrichment payload
 * (the unwrapped `data`), or throws a typed error.
 *
 * Per-API versioning (the version is data, not a class hierarchy)
 * --------------------------------------------------------------
 * Every CrawlSnap data product is versioned independently, and the version is
 * carried as a value on the resource (`this.version`), interpolated into the
 * request path — not encoded as a separate class per version. A direct call uses
 * that product's **stable default** version:
 *
 *     client.vectorSnap.ip("8.8.8.8")          // default version (stable)
 *
 * The default is pinned per SDK release via `DEFAULT_VERSION` and never moves on
 * its own: upgrading the SDK does not silently retarget your calls at a newer API
 * version. Opt into a specific version explicitly with a version accessor, which
 * scopes to *one* product and leaves the others untouched:
 *
 *     client.vectorSnap.v1.ip("8.8.8.8")       // explicitly VectorSnap v1
 *     client.pulseSnap.url("https://x.com")     // unaffected — PulseSnap default
 *
 * Adding a new API version (e.g. VectorSnap v2): add a `v2` getter that returns
 * `this.pinned("v2")`, regenerate the typed models from the v2 contract, and —
 * only when ready to make v2 the default for unpinned callers — bump
 * `DEFAULT_VERSION` in a deliberate, changelogged SDK release.
 */
import type { CrawlSnap, RequestOptions } from "./client";
import type {
  IocDomainScanData,
  IocHashScanData,
  IocIpScanData,
  IocUrlScanData,
  PulseDomainScanData,
  PulseHashScanData,
  PulseIpScanData,
  PulseUrlScanData,
  RawResponse,
  Subdomain,
  SubdoSnapScanData,
} from "./types";

/** Per-call options that force the raw-envelope return type. */
type RawOptions = RequestOptions & { rawResponse: true };
/** Per-call options that keep the default (unwrapped data) return type. */
type DataOptions = RequestOptions & { rawResponse?: false };

/**
 * Base for a single data product, pinned to one API version. The version is a
 * value, not a subtype: a direct call uses `DEFAULT_VERSION` (stable, bumped
 * only by a deliberate SDK release); a `vN` accessor returns a lazily-cached
 * instance of the *same* resource type pinned to that version.
 */
abstract class Resource {
  /** Stable default API version for unpinned calls; does not move on its own. */
  protected static readonly DEFAULT_VERSION = "v1";

  protected readonly version: string;
  private readonly pins = new Map<string, this>();

  constructor(
    protected readonly client: CrawlSnap,
    version?: string,
  ) {
    this.version =
      version ?? (this.constructor as typeof Resource).DEFAULT_VERSION;
  }

  /** Lazily build and cache a sibling instance of this resource pinned to `version`. */
  protected pinned(version: string): this {
    let inst = this.pins.get(version);
    if (!inst) {
      const Ctor = this.constructor as new (client: CrawlSnap, version: string) => this;
      inst = new Ctor(this.client, version);
      this.pins.set(version, inst);
    }
    return inst;
  }
}

// --------------------------------------------------------------------------
// VectorSnap — IoC reputation enrichment for url / hash / ip / domain.
// --------------------------------------------------------------------------

export class VectorSnap extends Resource {
  /** Pin this product explicitly to v1; other products are unaffected. */
  get v1(): VectorSnap {
    return this.pinned("v1");
  }

  url(query: string, opts?: DataOptions): Promise<IocUrlScanData>;
  url(query: string, opts: RawOptions): Promise<RawResponse<IocUrlScanData>>;
  url(query: string, opts?: RequestOptions): Promise<IocUrlScanData | RawResponse<IocUrlScanData>> {
    return this.client.request<IocUrlScanData>(`/${this.version}/ioc/search/url`, { query }, opts);
  }

  hash(query: string, opts?: DataOptions): Promise<IocHashScanData>;
  hash(query: string, opts: RawOptions): Promise<RawResponse<IocHashScanData>>;
  hash(query: string, opts?: RequestOptions): Promise<IocHashScanData | RawResponse<IocHashScanData>> {
    return this.client.request<IocHashScanData>(`/${this.version}/ioc/search/hash`, { query }, opts);
  }

  ip(query: string, opts?: DataOptions): Promise<IocIpScanData>;
  ip(query: string, opts: RawOptions): Promise<RawResponse<IocIpScanData>>;
  ip(query: string, opts?: RequestOptions): Promise<IocIpScanData | RawResponse<IocIpScanData>> {
    return this.client.request<IocIpScanData>(`/${this.version}/ioc/search/ip`, { query }, opts);
  }

  domain(query: string, opts?: DataOptions): Promise<IocDomainScanData>;
  domain(query: string, opts: RawOptions): Promise<RawResponse<IocDomainScanData>>;
  domain(query: string, opts?: RequestOptions): Promise<IocDomainScanData | RawResponse<IocDomainScanData>> {
    return this.client.request<IocDomainScanData>(`/${this.version}/ioc/search/domain`, { query }, opts);
  }
}

// --------------------------------------------------------------------------
// PulseSnap — threat-intelligence pulse enrichment for url / hash / ip / domain.
// --------------------------------------------------------------------------

export class PulseSnap extends Resource {
  /** Pin this product explicitly to v1; other products are unaffected. */
  get v1(): PulseSnap {
    return this.pinned("v1");
  }

  url(query: string, opts?: DataOptions): Promise<PulseUrlScanData>;
  url(query: string, opts: RawOptions): Promise<RawResponse<PulseUrlScanData>>;
  url(query: string, opts?: RequestOptions): Promise<PulseUrlScanData | RawResponse<PulseUrlScanData>> {
    return this.client.request<PulseUrlScanData>(`/${this.version}/pulse-snap/scan/url`, { query }, opts);
  }

  hash(query: string, opts?: DataOptions): Promise<PulseHashScanData>;
  hash(query: string, opts: RawOptions): Promise<RawResponse<PulseHashScanData>>;
  hash(query: string, opts?: RequestOptions): Promise<PulseHashScanData | RawResponse<PulseHashScanData>> {
    return this.client.request<PulseHashScanData>(`/${this.version}/pulse-snap/scan/hash`, { query }, opts);
  }

  ip(query: string, opts?: DataOptions): Promise<PulseIpScanData>;
  ip(query: string, opts: RawOptions): Promise<RawResponse<PulseIpScanData>>;
  ip(query: string, opts?: RequestOptions): Promise<PulseIpScanData | RawResponse<PulseIpScanData>> {
    return this.client.request<PulseIpScanData>(`/${this.version}/pulse-snap/scan/ip`, { query }, opts);
  }

  domain(query: string, opts?: DataOptions): Promise<PulseDomainScanData>;
  domain(query: string, opts: RawOptions): Promise<RawResponse<PulseDomainScanData>>;
  domain(query: string, opts?: RequestOptions): Promise<PulseDomainScanData | RawResponse<PulseDomainScanData>> {
    return this.client.request<PulseDomainScanData>(`/${this.version}/pulse-snap/scan/domain`, { query }, opts);
  }
}

// --------------------------------------------------------------------------
// SubdoSnap — paginated subdomain enumeration for a domain.
// --------------------------------------------------------------------------

export class SubdoSnap extends Resource {
  /** Pin this product explicitly to v1; other products are unaffected. */
  get v1(): SubdoSnap {
    return this.pinned("v1");
  }

  /**
   * Fetch one page of subdomains. Pass `cursor` to page; see {@link scanIter}
   * to stream every subdomain automatically.
   */
  scan(query: string, opts?: DataOptions & { cursor?: string }): Promise<SubdoSnapScanData>;
  scan(query: string, opts: RawOptions & { cursor?: string }): Promise<RawResponse<SubdoSnapScanData>>;
  scan(
    query: string,
    opts: RequestOptions & { cursor?: string } = {},
  ): Promise<SubdoSnapScanData | RawResponse<SubdoSnapScanData>> {
    const { cursor, ...rest } = opts;
    const params: Record<string, unknown> = { query };
    if (cursor) params.cursor = cursor;
    return this.client.request<SubdoSnapScanData>(`/${this.version}/subdo-snap/scan`, params, rest);
  }

  /** Yield every subdomain across all pages, following the cursor for you. */
  async *scanIter(
    query: string,
    opts?: Omit<RequestOptions, "rawResponse">,
  ): AsyncGenerator<Subdomain> {
    let cursor: string | undefined;
    for (;;) {
      const page = await this.scan(query, { ...opts, cursor });
      for (const subdomain of page.subdomains ?? []) yield subdomain;
      cursor = page.cursor || undefined;
      if (!cursor) break;
    }
  }
}
