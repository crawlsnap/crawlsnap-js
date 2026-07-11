/**
 * Resource groups exposed on the client: `vectorSnap`, `pulseSnap`, `subdoSnap`,
 * `sportSnap`. Each method submits one lookup and resolves to the typed payload
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
  AllTeamsData,
  ChannelInfoData,
  ChannelRepeatsData,
  ChannelsData,
  CompetitionDetailData,
  CompetitionsData,
  CompetitionTablesData,
  CompetitionTvRightsData,
  CompetitionTwitterData,
  IocDomainScanData,
  IocHashScanData,
  IocIpScanData,
  IocUrlScanData,
  LivescoresData,
  MatchData,
  MatchesData,
  NewsDetailData,
  NewsListData,
  PlayerData,
  PopularTeamsData,
  PulseDomainScanData,
  PulseHashScanData,
  PulseIpScanData,
  PulseUrlScanData,
  RawResponse,
  SearchData,
  Subdomain,
  SubdoSnapScanData,
  TeamDetailData,
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

// --------------------------------------------------------------------------
// SportSnap — football (soccer) data: live scores, fixtures, match detail,
// competitions, teams, TV channels, news, search, and player profiles.
// --------------------------------------------------------------------------

/** Query values carrying `iso_code` only when it is non-empty. */
function isoParams(isoCode?: string): Record<string, unknown> {
  return isoCode ? { iso_code: isoCode } : {};
}

/** Query values carrying `start` only when it is > 0 (0 is the first page). */
function startParams(start?: number): Record<string, unknown> {
  return start && start > 0 ? { start: Math.trunc(start) } : {};
}

/**
 * Football (soccer) data. Exposes the full source surface: live scores with
 * in-match events, fixture lists, single-match views (detail, stats,
 * commentary, broadcasts), competition catalog and detail (fixtures,
 * standings, top scorers, TV rights), national and club teams, TV channel
 * directories and schedules, a news feed, full-text search across every entity
 * type, and player profiles. A direct call uses the stable default API
 * version; pin explicitly with `.v1`.
 *
 * Path segments (competition country/slug, team country/team, player slug/id)
 * come from the `url` fields in list, search, and detail payloads. `isoCode`
 * is a two-letter region code that resolves region-specific broadcast
 * channels; omit it (or pass an empty string) to use the server default.
 */
export class SportSnap extends Resource {
  /** Pin this product explicitly to v1; other products are unaffected. */
  get v1(): SportSnap {
    return this.pinned("v1");
  }

  /** @internal Issue a GET under the versioned `/vN/sport-snap` prefix. */
  private req<T>(
    path: string,
    params: Record<string, unknown>,
    opts?: RequestOptions,
  ): Promise<T | RawResponse<T>> {
    return this.client.request<T>(`/${this.version}/sport-snap${path}`, params, opts);
  }

  // --- Live scores & fixtures ----------------------------------------------

  /**
   * The live-score board for every tracked competition: score line, match
   * status, and structured in-match events.
   */
  livescores(opts?: DataOptions): Promise<LivescoresData>;
  livescores(opts: RawOptions): Promise<RawResponse<LivescoresData>>;
  livescores(opts?: RequestOptions): Promise<LivescoresData | RawResponse<LivescoresData>> {
    return this.req<LivescoresData>("/livescores", {}, opts);
  }

  /**
   * Upcoming/current fixtures grouped by competition, with the broadcast
   * channels available in the requested `isoCode` region. Omit `isoCode` for
   * the server-default region.
   */
  matches(isoCode?: string, opts?: DataOptions): Promise<MatchesData>;
  matches(isoCode: string | undefined, opts: RawOptions): Promise<RawResponse<MatchesData>>;
  matches(isoCode?: string, opts?: RequestOptions): Promise<MatchesData | RawResponse<MatchesData>> {
    return this.req<MatchesData>("/matches", isoParams(isoCode), opts);
  }

  /**
   * The extended fixture list: adds per-locale team-name translations and omits
   * per-fixture channels. `timestamp` is a unix-second watermark for
   * incremental fetches (omit or 0 returns everything).
   */
  matchesExtended(isoCode?: string, timestamp?: number, opts?: DataOptions): Promise<MatchesData>;
  matchesExtended(
    isoCode: string | undefined,
    timestamp: number | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<MatchesData>>;
  matchesExtended(
    isoCode?: string,
    timestamp?: number,
    opts?: RequestOptions,
  ): Promise<MatchesData | RawResponse<MatchesData>> {
    const params = isoParams(isoCode);
    if (timestamp && timestamp > 0) params.timestamp = Math.trunc(timestamp);
    return this.req<MatchesData>("/xmatches", params, opts);
  }

  // --- Single match --------------------------------------------------------

  /**
   * The full match view keyed by the numeric match id (fixture id from fixture
   * lists, live scores, or search): teams, kickoff, venue, lineups, structured
   * events, statistics, and broadcast channels.
   */
  match(id: number, opts?: DataOptions): Promise<MatchData>;
  match(id: number, opts: RawOptions): Promise<RawResponse<MatchData>>;
  match(id: number, opts?: RequestOptions): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/match/${Math.trunc(id)}`, {}, opts);
  }

  /**
   * The extended match view: adds `*_translations` maps for the competition and
   * team names.
   */
  matchExtended(id: number, opts?: DataOptions): Promise<MatchData>;
  matchExtended(id: number, opts: RawOptions): Promise<RawResponse<MatchData>>;
  matchExtended(id: number, opts?: RequestOptions): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/xmatch/${Math.trunc(id)}`, {}, opts);
  }

  /** The match view with statistics fields populated when the source provides them. */
  matchStats(id: number, opts?: DataOptions): Promise<MatchData>;
  matchStats(id: number, opts: RawOptions): Promise<RawResponse<MatchData>>;
  matchStats(id: number, opts?: RequestOptions): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/match/${Math.trunc(id)}/stats`, {}, opts);
  }

  /** The match view with the structured event feed populated when available. */
  matchCommentaries(id: number, opts?: DataOptions): Promise<MatchData>;
  matchCommentaries(id: number, opts: RawOptions): Promise<RawResponse<MatchData>>;
  matchCommentaries(id: number, opts?: RequestOptions): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/match/${Math.trunc(id)}/commentaries`, {}, opts);
  }

  /** The match view with broadcast channels resolved for the requested `isoCode` region. */
  matchChannels(id: number, isoCode?: string, opts?: DataOptions): Promise<MatchData>;
  matchChannels(
    id: number,
    isoCode: string | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<MatchData>>;
  matchChannels(
    id: number,
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/match/${Math.trunc(id)}/channels`, isoParams(isoCode), opts);
  }

  /**
   * The extended match view carrying additional broadcast options (repeats,
   * on-demand listings).
   */
  matchExtraBroadcasts(id: number, opts?: DataOptions): Promise<MatchData>;
  matchExtraBroadcasts(id: number, opts: RawOptions): Promise<RawResponse<MatchData>>;
  matchExtraBroadcasts(
    id: number,
    opts?: RequestOptions,
  ): Promise<MatchData | RawResponse<MatchData>> {
    return this.req<MatchData>(`/xmatch/${Math.trunc(id)}/extra_broadcasts`, {}, opts);
  }

  // --- Competitions --------------------------------------------------------

  /**
   * The competition catalog: popular competitions, domestic leagues grouped by
   * country, international club competitions, and tournaments.
   */
  competitions(isoCode?: string, opts?: DataOptions): Promise<CompetitionsData>;
  competitions(
    isoCode: string | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<CompetitionsData>>;
  competitions(
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<CompetitionsData | RawResponse<CompetitionsData>> {
    return this.req<CompetitionsData>("/competitions", isoParams(isoCode), opts);
  }

  /**
   * The competition detail: fixtures around the current date, standings, top
   * scorers, and broadcast-rights holders. `country`/`slug` come from
   * competition url values in other payloads.
   */
  competition(country: string, slug: string, opts?: DataOptions): Promise<CompetitionDetailData>;
  competition(
    country: string,
    slug: string,
    opts: RawOptions,
  ): Promise<RawResponse<CompetitionDetailData>>;
  competition(
    country: string,
    slug: string,
    opts?: RequestOptions,
  ): Promise<CompetitionDetailData | RawResponse<CompetitionDetailData>> {
    return this.req<CompetitionDetailData>(
      `/competitions/${encodeURIComponent(country)}/${encodeURIComponent(slug)}`,
      {},
      opts,
    );
  }

  /** The competition standings, grouped by stage. */
  competitionTables(
    country: string,
    slug: string,
    opts?: DataOptions,
  ): Promise<CompetitionTablesData>;
  competitionTables(
    country: string,
    slug: string,
    opts: RawOptions,
  ): Promise<RawResponse<CompetitionTablesData>>;
  competitionTables(
    country: string,
    slug: string,
    opts?: RequestOptions,
  ): Promise<CompetitionTablesData | RawResponse<CompetitionTablesData>> {
    return this.req<CompetitionTablesData>(
      `/competitions/${encodeURIComponent(country)}/${encodeURIComponent(slug)}/tables`,
      {},
      opts,
    );
  }

  /** The channels holding broadcast rights for the competition. */
  competitionTvRights(
    country: string,
    slug: string,
    opts?: DataOptions,
  ): Promise<CompetitionTvRightsData>;
  competitionTvRights(
    country: string,
    slug: string,
    opts: RawOptions,
  ): Promise<RawResponse<CompetitionTvRightsData>>;
  competitionTvRights(
    country: string,
    slug: string,
    opts?: RequestOptions,
  ): Promise<CompetitionTvRightsData | RawResponse<CompetitionTvRightsData>> {
    return this.req<CompetitionTvRightsData>(
      `/competitions/${encodeURIComponent(country)}/${encodeURIComponent(slug)}/tv_rights`,
      {},
      opts,
    );
  }

  /** Social feed items for the competition (often empty). */
  competitionTwitter(
    country: string,
    slug: string,
    opts?: DataOptions,
  ): Promise<CompetitionTwitterData>;
  competitionTwitter(
    country: string,
    slug: string,
    opts: RawOptions,
  ): Promise<RawResponse<CompetitionTwitterData>>;
  competitionTwitter(
    country: string,
    slug: string,
    opts?: RequestOptions,
  ): Promise<CompetitionTwitterData | RawResponse<CompetitionTwitterData>> {
    return this.req<CompetitionTwitterData>(
      `/competitions/${encodeURIComponent(country)}/${encodeURIComponent(slug)}/twitter`,
      {},
      opts,
    );
  }

  // --- Teams ---------------------------------------------------------------

  /** The popular-teams list. */
  popularTeams(opts?: DataOptions): Promise<PopularTeamsData>;
  popularTeams(opts: RawOptions): Promise<RawResponse<PopularTeamsData>>;
  popularTeams(opts?: RequestOptions): Promise<PopularTeamsData | RawResponse<PopularTeamsData>> {
    return this.req<PopularTeamsData>("/teams/popular", {}, opts);
  }

  /**
   * The full national-team catalog: per-country men's and women's team names
   * with the slugs used by {@link nationalTeam}.
   */
  allTeams(opts?: DataOptions): Promise<AllTeamsData>;
  allTeams(opts: RawOptions): Promise<RawResponse<AllTeamsData>>;
  allTeams(opts?: RequestOptions): Promise<AllTeamsData | RawResponse<AllTeamsData>> {
    return this.req<AllTeamsData>("/teams/all", {}, opts);
  }

  /**
   * The national-team view (profile, squad, competitions, fixtures) for a
   * country slug.
   */
  nationalTeam(slug: string, opts?: DataOptions): Promise<TeamDetailData>;
  nationalTeam(slug: string, opts: RawOptions): Promise<RawResponse<TeamDetailData>>;
  nationalTeam(
    slug: string,
    opts?: RequestOptions,
  ): Promise<TeamDetailData | RawResponse<TeamDetailData>> {
    return this.req<TeamDetailData>(`/countries/${encodeURIComponent(slug)}`, {}, opts);
  }

  /**
   * The club view (profile, squad, competitions, fixtures). `country`/`team`
   * come from team url values in other payloads (e.g. `spain`/`barcelona`).
   */
  clubTeam(country: string, team: string, opts?: DataOptions): Promise<TeamDetailData>;
  clubTeam(country: string, team: string, opts: RawOptions): Promise<RawResponse<TeamDetailData>>;
  clubTeam(
    country: string,
    team: string,
    opts?: RequestOptions,
  ): Promise<TeamDetailData | RawResponse<TeamDetailData>> {
    return this.req<TeamDetailData>(
      `/teams/${encodeURIComponent(country)}/${encodeURIComponent(team)}`,
      {},
      opts,
    );
  }

  // --- Channels ------------------------------------------------------------

  /** The full TV channel catalog for the `isoCode` region. */
  allChannels(isoCode?: string, opts?: DataOptions): Promise<ChannelsData>;
  allChannels(isoCode: string | undefined, opts: RawOptions): Promise<RawResponse<ChannelsData>>;
  allChannels(
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<ChannelsData | RawResponse<ChannelsData>> {
    return this.req<ChannelsData>("/all_channels", isoParams(isoCode), opts);
  }

  /** The curated (football-relevant) channel list for the `isoCode` region. */
  channels(isoCode?: string, opts?: DataOptions): Promise<ChannelsData>;
  channels(isoCode: string | undefined, opts: RawOptions): Promise<RawResponse<ChannelsData>>;
  channels(
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<ChannelsData | RawResponse<ChannelsData>> {
    return this.req<ChannelsData>("/channels", isoParams(isoCode), opts);
  }

  /**
   * Channel metadata (name, platform, website, coverage) and the channel's
   * broadcast rights for a channel slug.
   */
  channelInfo(slug: string, isoCode?: string, opts?: DataOptions): Promise<ChannelInfoData>;
  channelInfo(
    slug: string,
    isoCode: string | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<ChannelInfoData>>;
  channelInfo(
    slug: string,
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<ChannelInfoData | RawResponse<ChannelInfoData>> {
    return this.req<ChannelInfoData>(
      `/channels/${encodeURIComponent(slug)}/info`,
      isoParams(isoCode),
      opts,
    );
  }

  /**
   * The channel's repeat/upcoming broadcast schedule with paging cursors. An
   * empty fixtures array is a valid result, not an error.
   */
  channelRepeats(slug: string, isoCode?: string, opts?: DataOptions): Promise<ChannelRepeatsData>;
  channelRepeats(
    slug: string,
    isoCode: string | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<ChannelRepeatsData>>;
  channelRepeats(
    slug: string,
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<ChannelRepeatsData | RawResponse<ChannelRepeatsData>> {
    return this.req<ChannelRepeatsData>(
      `/channels/${encodeURIComponent(slug)}/repeat`,
      isoParams(isoCode),
      opts,
    );
  }

  // --- News ----------------------------------------------------------------

  /**
   * The news feed, paginated via `start` (omit or 0 for the first page), for
   * the `isoCode` region.
   */
  news(start?: number, isoCode?: string, opts?: DataOptions): Promise<NewsListData>;
  news(
    start: number | undefined,
    isoCode: string | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<NewsListData>>;
  news(
    start?: number,
    isoCode?: string,
    opts?: RequestOptions,
  ): Promise<NewsListData | RawResponse<NewsListData>> {
    return this.req<NewsListData>("/news", { ...startParams(start), ...isoParams(isoCode) }, opts);
  }

  /**
   * News carrying the given tag (e.g. `messi`, `world-cup`), paginated via
   * `start`.
   */
  newsByTag(tag: string, start?: number, opts?: DataOptions): Promise<NewsListData>;
  newsByTag(
    tag: string,
    start: number | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<NewsListData>>;
  newsByTag(
    tag: string,
    start?: number,
    opts?: RequestOptions,
  ): Promise<NewsListData | RawResponse<NewsListData>> {
    return this.req<NewsListData>("/news/tags", { tag, ...startParams(start) }, opts);
  }

  /** A single article (body HTML, tags, byline) plus related articles. */
  newsArticle(id: number, opts?: DataOptions): Promise<NewsDetailData>;
  newsArticle(id: number, opts: RawOptions): Promise<RawResponse<NewsDetailData>>;
  newsArticle(
    id: number,
    opts?: RequestOptions,
  ): Promise<NewsDetailData | RawResponse<NewsDetailData>> {
    return this.req<NewsDetailData>(`/news/${Math.trunc(id)}`, {}, opts);
  }

  /** News about a competition, paginated via `start`. */
  competitionNews(
    country: string,
    slug: string,
    start?: number,
    opts?: DataOptions,
  ): Promise<NewsListData>;
  competitionNews(
    country: string,
    slug: string,
    start: number | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<NewsListData>>;
  competitionNews(
    country: string,
    slug: string,
    start?: number,
    opts?: RequestOptions,
  ): Promise<NewsListData | RawResponse<NewsListData>> {
    return this.req<NewsListData>(
      `/news_about/competitions/${encodeURIComponent(country)}/${encodeURIComponent(slug)}`,
      startParams(start),
      opts,
    );
  }

  /** News about a national team, paginated via `start`. */
  nationalTeamNews(slug: string, start?: number, opts?: DataOptions): Promise<NewsListData>;
  nationalTeamNews(
    slug: string,
    start: number | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<NewsListData>>;
  nationalTeamNews(
    slug: string,
    start?: number,
    opts?: RequestOptions,
  ): Promise<NewsListData | RawResponse<NewsListData>> {
    return this.req<NewsListData>(
      `/news_about/countries/${encodeURIComponent(slug)}`,
      startParams(start),
      opts,
    );
  }

  /** News about a club team, paginated via `start`. */
  clubTeamNews(
    country: string,
    team: string,
    start?: number,
    opts?: DataOptions,
  ): Promise<NewsListData>;
  clubTeamNews(
    country: string,
    team: string,
    start: number | undefined,
    opts: RawOptions,
  ): Promise<RawResponse<NewsListData>>;
  clubTeamNews(
    country: string,
    team: string,
    start?: number,
    opts?: RequestOptions,
  ): Promise<NewsListData | RawResponse<NewsListData>> {
    return this.req<NewsListData>(
      `/news_about/teams/${encodeURIComponent(country)}/${encodeURIComponent(team)}`,
      startParams(start),
      opts,
    );
  }

  // --- Search --------------------------------------------------------------

  /**
   * Full-text search across teams, competitions, matches, and players. Result
   * url values feed the corresponding methods of this resource.
   */
  searchAll(q: string, opts?: DataOptions): Promise<SearchData>;
  searchAll(q: string, opts: RawOptions): Promise<RawResponse<SearchData>>;
  searchAll(q: string, opts?: RequestOptions): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/all", { q }, opts);
  }

  /** Full-text search over teams. */
  searchTeams(q: string, opts?: DataOptions): Promise<SearchData>;
  searchTeams(q: string, opts: RawOptions): Promise<RawResponse<SearchData>>;
  searchTeams(q: string, opts?: RequestOptions): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/teams", { q }, opts);
  }

  /** Full-text search over competitions. */
  searchCompetitions(q: string, opts?: DataOptions): Promise<SearchData>;
  searchCompetitions(q: string, opts: RawOptions): Promise<RawResponse<SearchData>>;
  searchCompetitions(
    q: string,
    opts?: RequestOptions,
  ): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/competitions", { q }, opts);
  }

  /** Full-text search over matches. */
  searchMatches(q: string, opts?: DataOptions): Promise<SearchData>;
  searchMatches(q: string, opts: RawOptions): Promise<RawResponse<SearchData>>;
  searchMatches(q: string, opts?: RequestOptions): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/matches", { q }, opts);
  }

  /**
   * Full-text search over players. Result url values carry the slug/id segments
   * used by {@link player}.
   */
  searchPlayers(q: string, opts?: DataOptions): Promise<SearchData>;
  searchPlayers(q: string, opts: RawOptions): Promise<RawResponse<SearchData>>;
  searchPlayers(q: string, opts?: RequestOptions): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/players", { q }, opts);
  }

  /** The currently popular search results. */
  popularSearches(opts?: DataOptions): Promise<SearchData>;
  popularSearches(opts: RawOptions): Promise<RawResponse<SearchData>>;
  popularSearches(opts?: RequestOptions): Promise<SearchData | RawResponse<SearchData>> {
    return this.req<SearchData>("/search/popular", {}, opts);
  }

  // --- Players -------------------------------------------------------------

  /**
   * The player profile, current team, and per-season statistics. The slug/id
   * pair comes from player url values in search results, lineups, and squads.
   */
  player(slug: string, id: number, opts?: DataOptions): Promise<PlayerData>;
  player(slug: string, id: number, opts: RawOptions): Promise<RawResponse<PlayerData>>;
  player(
    slug: string,
    id: number,
    opts?: RequestOptions,
  ): Promise<PlayerData | RawResponse<PlayerData>> {
    return this.req<PlayerData>(
      `/player/${encodeURIComponent(slug)}/${Math.trunc(id)}`,
      {},
      opts,
    );
  }
}
