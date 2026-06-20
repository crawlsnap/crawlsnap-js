/**
 * Exception hierarchy for the CrawlSnap SDK.
 *
 *     CrawlSnapError                      base for everything thrown by the SDK
 *     ├── APIConnectionError              transport failed (no HTTP response)
 *     │   └── APITimeoutError             the request timed out
 *     └── APIStatusError                  the API returned a non-success status
 *         ├── BadRequestError             400  invalid input
 *         ├── AuthenticationError         401  missing / invalid API key
 *         ├── QuotaExceededError          402  out of credits / monthly quota
 *         ├── SubscriptionInactiveError   403  subscription not active
 *         ├── NotFoundError               404  no data for the indicator
 *         ├── RateLimitError              429  daily request limit exceeded
 *         └── ServerError                 5xx  server / upstream failure
 *
 * Catch `CrawlSnapError` to handle anything the SDK may throw; narrow with
 * `instanceof` for a specific status.
 */

/** Base class for all errors thrown by the CrawlSnap SDK. */
export class CrawlSnapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Restore the prototype chain so `instanceof` works after transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The request could not reach the API (DNS, connection, TLS, ...). */
export class APIConnectionError extends CrawlSnapError {
  /** The underlying transport error, when available. */
  readonly cause?: unknown;
  constructor(message = "Connection error.", options?: { cause?: unknown }) {
    super(message);
    this.cause = options?.cause;
  }
}

/** The request timed out before a response was received. */
export class APITimeoutError extends APIConnectionError {
  constructor(message = "Request timed out.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export interface APIStatusErrorOptions {
  statusCode: number;
  requestId?: string | null;
  /** The parsed response body (the BaseResponse envelope), when available. */
  body?: unknown;
}

/** The API responded with a non-success status code. */
export class APIStatusError extends CrawlSnapError {
  readonly statusCode: number;
  readonly requestId: string | null;
  readonly body: unknown;

  constructor(message: string, options: APIStatusErrorOptions) {
    super(message);
    this.statusCode = options.statusCode;
    this.requestId = options.requestId ?? null;
    this.body = options.body ?? null;
  }
}

export class BadRequestError extends APIStatusError {}
export class AuthenticationError extends APIStatusError {}
/** Out of credits, or the subscription's monthly quota is exceeded (402). */
export class QuotaExceededError extends APIStatusError {}
export class SubscriptionInactiveError extends APIStatusError {}
/** No data was found for the supplied indicator (404). */
export class NotFoundError extends APIStatusError {}
/** The API or an upstream enrichment service failed (5xx). */
export class ServerError extends APIStatusError {}

/** The API key's daily request limit has been exceeded (429). */
export class RateLimitError extends APIStatusError {
  /** Seconds to wait before retrying, parsed from the `Retry-After` header. */
  readonly retryAfter: number | null;
  constructor(message: string, options: APIStatusErrorOptions & { retryAfter?: number | null }) {
    super(message, options);
    this.retryAfter = options.retryAfter ?? null;
  }
}
