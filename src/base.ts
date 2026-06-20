/**
 * Shared, IO-free building blocks for the client.
 *
 * Everything here is pure (no network): header assembly, envelope unwrapping,
 * status-to-error mapping, retry/backoff math, and an abort-aware sleep. The
 * client (`client.ts`) owns the actual request loop but delegates the tricky
 * envelope handling here so it lives in exactly one place.
 */
import {
  APIStatusError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  QuotaExceededError,
  RateLimitError,
  ServerError,
  SubscriptionInactiveError,
} from "./errors";
import type { RawResponse } from "./types";
import { VERSION } from "./version";

export const DEFAULT_BASE_URL = "https://api.crawlsnap.com";
export const DEFAULT_TIMEOUT = 30_000; // ms
export const DEFAULT_MAX_RETRIES = 2;

// HTTP statuses worth retrying: rate limit + transient server/upstream failures.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_BASE_DELAY = 500; // ms
const RETRY_MAX_DELAY = 8_000; // ms

const STATUS_TO_ERROR: Record<number, new (message: string, opts: any) => APIStatusError> = {
  400: BadRequestError,
  401: AuthenticationError,
  402: QuotaExceededError,
  403: SubscriptionInactiveError,
  404: NotFoundError,
};

export function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "User-Agent": `crawlsnap-js/${VERSION}`,
  };
}

export function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  // HTTP-date form is not emitted by this API; ignore anything non-numeric.
  return Number.isFinite(seconds) ? Math.max(0, seconds) : null;
}

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

/**
 * Milliseconds to wait before the next attempt (exp. backoff + jitter, honoring
 * `Retry-After` on a 429). Pure — the caller does the actual sleeping.
 */
export function backoffDelay(attempt: number, response: Response | null): number {
  let delay = Math.min(RETRY_MAX_DELAY, RETRY_BASE_DELAY * 2 ** attempt);
  if (response && response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    if (retryAfter !== null) delay = retryAfter * 1000;
  }
  return delay + Math.random() * (RETRY_BASE_DELAY / 2); // jitter
}

/** Sleep that rejects (with the signal's reason) as soon as `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * Unwrap the `BaseResponse` envelope into typed data, or throw a typed error.
 * Contains no IO — the caller passes the already-awaited body.
 */
export function processResponse<T>(
  response: Response,
  body: unknown,
  rawResponse: boolean,
): T | RawResponse<T> {
  const requestId = response.headers.get("x-request-id");
  const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  // `is_success` in the body is authoritative; the HTTP status normally mirrors
  // it, but we honour the body's response_code defensively so a 2xx-wrapped
  // error (should not happen on the direct API) still throws.
  let ok = response.ok && envelope.is_success !== false;
  let effectiveStatus = response.status;
  if (!response.ok || envelope.is_success === false) {
    ok = false;
    const rc = envelope.response_code;
    if (typeof rc === "number" && rc >= 400) effectiveStatus = rc;
  }

  if (ok) {
    const data = envelope.data as T;
    if (rawResponse) {
      return {
        statusCode: response.status,
        isSuccess: true,
        data,
        message: typeof envelope.message === "string" ? envelope.message : "",
        responseCode: typeof envelope.response_code === "number" ? envelope.response_code : null,
        requestId,
        headers: headersToObject(response.headers),
      };
    }
    return data;
  }

  const message =
    (typeof envelope.message === "string" && envelope.message) ||
    (typeof envelope.error === "string" && envelope.error) ||
    `HTTP ${effectiveStatus}`;
  throw buildStatusError(effectiveStatus, message, requestId, body, response);
}

function buildStatusError(
  status: number,
  message: string,
  requestId: string | null,
  body: unknown,
  response: Response,
): APIStatusError {
  if (status === 429) {
    return new RateLimitError(message, {
      statusCode: status,
      requestId,
      body,
      retryAfter: parseRetryAfter(response.headers.get("retry-after")),
    });
  }
  const ErrorClass = STATUS_TO_ERROR[status];
  if (ErrorClass) return new ErrorClass(message, { statusCode: status, requestId, body });
  if (status >= 500) return new ServerError(message, { statusCode: status, requestId, body });
  return new APIStatusError(message, { statusCode: status, requestId, body });
}
