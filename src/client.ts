/**
 * The CrawlSnap client — the single entry point.
 *
 * `CrawlSnap` owns a `fetch`, applies Bearer auth, retries transient failures
 * with exponential backoff, unwraps the `BaseResponse` envelope, and throws
 * typed errors. Resource groups are exposed as properties:
 * `client.vectorSnap`, `client.pulseSnap`, `client.subdoSnap`.
 *
 * JavaScript is async-by-default, so there is a single client (no sync/async
 * twin): every method returns a `Promise`. Use `Promise.all` for concurrency.
 */
import {
  backoffDelay,
  buildHeaders,
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT,
  isRetryableStatus,
  processResponse,
  sleep,
} from "./base";
import { APIConnectionError, APITimeoutError, CrawlSnapError } from "./errors";
import { PulseSnap, SubdoSnap, VectorSnap } from "./resources";
import type { RawResponse } from "./types";

export interface CrawlSnapOptions {
  /** Your `sk-cs-` key. Falls back to `$CRAWLSNAP_API_KEY`. */
  apiKey?: string;
  /** Override the API host. Falls back to `$CRAWLSNAP_BASE_URL`, then the default. */
  baseURL?: string;
  /** Per-request timeout in milliseconds (default 30000). */
  timeout?: number;
  /** Retries for 429 / 5xx / connection errors, with exponential backoff (default 2). */
  maxRetries?: number;
  /** Supply a custom `fetch` (advanced: proxies, testing, non-standard runtimes). */
  fetch?: typeof fetch;
}

/** Per-call options, layered over the client defaults. */
export interface RequestOptions {
  /** Abort the request (and any pending retry wait) via an `AbortController`. */
  signal?: AbortSignal;
  /** Override the client timeout (ms) for this call. */
  timeout?: number;
  /** Override the client retry count for this call. */
  maxRetries?: number;
  /** Return the full envelope (status, headers, request id) instead of just `data`. */
  rawResponse?: boolean;
}

function env(name: string): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

function isAbortLike(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === "AbortError" || name === "TimeoutError";
}

function messageFrom(err: unknown): string {
  return (err instanceof Error && err.message) || "Connection error.";
}

export class CrawlSnap {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly timeout: number;
  readonly maxRetries: number;

  private readonly fetchImpl: typeof fetch;
  private readonly headers: Record<string, string>;

  readonly vectorSnap: VectorSnap;
  readonly pulseSnap: PulseSnap;
  readonly subdoSnap: SubdoSnap;

  constructor(options: CrawlSnapOptions = {}) {
    const apiKey = options.apiKey ?? env("CRAWLSNAP_API_KEY");
    if (!apiKey) {
      throw new CrawlSnapError(
        "No API key provided. Pass new CrawlSnap({ apiKey }) or set CRAWLSNAP_API_KEY.",
      );
    }
    this.apiKey = apiKey;
    this.baseURL = (options.baseURL ?? env("CRAWLSNAP_BASE_URL") ?? DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);

    const fetchImpl = options.fetch ?? (globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined);
    if (!fetchImpl) {
      throw new CrawlSnapError(
        "No fetch implementation available. Pass new CrawlSnap({ fetch }) or run on Node 20+.",
      );
    }
    this.fetchImpl = fetchImpl;
    this.headers = buildHeaders(apiKey);

    this.vectorSnap = new VectorSnap(this);
    this.pulseSnap = new PulseSnap(this);
    this.subdoSnap = new SubdoSnap(this);
  }

  private buildUrl(path: string, params: Record<string, unknown>): string {
    const url = new URL(this.baseURL + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private mergeSignal(userSignal: AbortSignal | undefined, timeout: number): AbortSignal | undefined {
    const signals: AbortSignal[] = [];
    if (userSignal) signals.push(userSignal);
    if (timeout > 0) signals.push(AbortSignal.timeout(timeout));
    if (signals.length === 0) return undefined;
    return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  }

  /**
   * The internal request pipeline: one GET, with retries on 429 / 5xx /
   * connection errors, then envelope unwrapping. Resources call this; it is not
   * part of the supported public surface.
   * @internal
   */
  async request<T>(
    path: string,
    params: Record<string, unknown>,
    opts: RequestOptions = {},
  ): Promise<T | RawResponse<T>> {
    const maxRetries = Math.max(0, opts.maxRetries ?? this.maxRetries);
    const timeout = opts.timeout ?? this.timeout;
    const rawResponse = opts.rawResponse ?? false;
    const userSignal = opts.signal;
    const url = this.buildUrl(path, params);

    let attempt = 0;
    for (;;) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: "GET",
          headers: this.headers,
          signal: this.mergeSignal(userSignal, timeout),
        });
      } catch (err) {
        // User-initiated cancellation is never retried — propagate it verbatim.
        if (userSignal?.aborted) throw userSignal.reason ?? err;
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt, null), userSignal);
          attempt++;
          continue;
        }
        if (isAbortLike(err)) {
          throw new APITimeoutError(`Request timed out after ${timeout}ms.`, { cause: err });
        }
        throw new APIConnectionError(messageFrom(err), { cause: err });
      }

      if (isRetryableStatus(response.status) && attempt < maxRetries) {
        await sleep(backoffDelay(attempt, response), userSignal);
        attempt++;
        continue;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return processResponse<T>(response, body, rawResponse);
    }
  }
}
