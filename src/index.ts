/**
 * crawlsnap — official JavaScript / TypeScript SDK for the CrawlSnap data
 * intelligence platform.
 *
 * ```ts
 * import { CrawlSnap } from "crawlsnap";
 *
 * const client = new CrawlSnap({ apiKey: "sk-cs-..." }); // or $CRAWLSNAP_API_KEY
 * const ip = await client.vectorSnap.ip("8.8.8.8");
 * console.log(ip.reputation, ip.as_owner);
 * ```
 *
 * Every call resolves to the typed `data` payload and throws a typed error on
 * failure — you never inspect an `is_success` envelope. JavaScript is
 * async-by-default, so there is a single client; use `Promise.all` for
 * concurrency.
 */
export { CrawlSnap } from "./client";
export type { CrawlSnapOptions, RequestOptions } from "./client";
export { VectorSnap, PulseSnap, SubdoSnap, SportSnap } from "./resources";
export { VERSION } from "./version";

export {
  CrawlSnapError,
  APIConnectionError,
  APITimeoutError,
  APIStatusError,
  BadRequestError,
  AuthenticationError,
  QuotaExceededError,
  SubscriptionInactiveError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from "./errors";

export type {
  RawResponse,
  Subdomain,
  IocUrlScanData,
  IocHashScanData,
  IocIpScanData,
  IocDomainScanData,
  PulseUrlScanData,
  PulseHashScanData,
  PulseIpScanData,
  PulseDomainScanData,
  SubdoSnapScanData,
  ChannelData,
  ChannelScheduleData,
  MatchData,
  MatchStatus,
  CountryChannelsData,
  DailyScheduleData,
} from "./types";
