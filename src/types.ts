/**
 * Friendly aliases for the typed response payloads.
 *
 * The shapes themselves are GENERATED from the public OpenAPI contract into
 * `models.ts` (never hand-edited); this module just re-exports them under
 * ergonomic names so callers can `import type { IocIpScanData } from "crawlsnap"`.
 *
 * Payload fields stay in the API's wire format (snake_case, e.g. `as_owner`,
 * `hash_id`) — like the OpenAI and Stripe SDKs, the SDK does not rewrite the
 * response shape. Only the SDK surface (clients, resources, methods, options)
 * is camelCase.
 */
import type { components } from "./models";

type Schemas = components["schemas"];

export type IocUrlScanData = Schemas["IocUrlScanData"];
export type IocHashScanData = Schemas["IocHashScanData"];
export type IocIpScanData = Schemas["IocIpScanData"];
export type IocDomainScanData = Schemas["IocDomainScanData"];

export type PulseUrlScanData = Schemas["PulseUrlScanData"];
export type PulseHashScanData = Schemas["PulseHashScanData"];
export type PulseIpScanData = Schemas["PulseIpScanData"];
export type PulseDomainScanData = Schemas["PulseDomainScanData"];

export type SubdoSnapScanData = Schemas["SubdoSnapScanData"];
/** A single enumerated subdomain entry, as yielded by `subdoSnap.scanIter`. */
export type Subdomain = NonNullable<SubdoSnapScanData["subdomains"]>[number];

// SportSnap — football (soccer) data payloads.
export type LivescoresData = Schemas["LivescoresData"];
export type MatchesData = Schemas["MatchesData"];
export type MatchData = Schemas["MatchData"];
export type CompetitionsData = Schemas["CompetitionsData"];
export type CompetitionDetailData = Schemas["CompetitionDetailData"];
export type CompetitionTablesData = Schemas["CompetitionTablesData"];
export type CompetitionTvRightsData = Schemas["CompetitionTvRightsData"];
export type CompetitionTwitterData = Schemas["CompetitionTwitterData"];
export type PopularTeamsData = Schemas["PopularTeamsData"];
export type AllTeamsData = Schemas["AllTeamsData"];
export type TeamDetailData = Schemas["TeamDetailData"];
export type ChannelsData = Schemas["ChannelsData"];
export type ChannelInfoData = Schemas["ChannelInfoData"];
export type ChannelRepeatsData = Schemas["ChannelRepeatsData"];
export type NewsListData = Schemas["NewsListData"];
export type NewsDetailData = Schemas["NewsDetailData"];
export type SearchData = Schemas["SearchData"];
export type PlayerData = Schemas["PlayerData"];

/** The response envelope, as returned when a call is made with `rawResponse: true`. */
export interface RawResponse<T = unknown> {
  statusCode: number;
  isSuccess: boolean;
  data: T;
  message: string;
  responseCode: number | null;
  requestId: string | null;
  headers: Record<string, string>;
}
