# Changelog

All notable changes to the `crawlsnap` JavaScript/TypeScript SDK are documented
in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
While the SDK is pre-1.0, minor versions may carry breaking changes; those are
always called out under a `Breaking` heading.

Every entry records the `crawlsnap-contracts` version the release was generated
from, so an SDK version can always be traced back to the public API contract.

Releases before 0.5.0 are not listed here; see the
[git history](https://github.com/crawlsnap/crawlsnap-js/commits/master) for those.

## [Unreleased]

## [0.6.0] - 2026-09-08

Contract: `crawlsnap-contracts` v0.12.0

### Added

- **SerpApi** — new `client.serpApi` resource with a single method,
  `search(q, opts?)`, resolving to the typed `SerpSearchData`: ranked Google
  results for one result page plus the related searches Google suggests. Each
  result's `url` is the real target URL, already unwrapped from Google's
  redirector.

  Refinements (`count`, `page`, `language`, `country`, `safe`, `timeRange`,
  `site`, `filetype`) ride the same per-call options object as `signal` /
  `timeout` / `rawResponse`. Anything left undefined is omitted from the
  request so the API's own default applies — the SDK does not pin a default the
  API is free to move. `serpApi.v1` pins the version, like every other
  resource.

  New exported types: `SerpSearchData`, `SerpResult`, `SerpSearchOptions`.

## [0.5.0] - 2026-07-12

Contract: `crawlsnap-contracts` v0.10.0

### Breaking

- The `sportSnap` resource is rebuilt on the `sports/v1` 2.0.0 surface. The
  parsed-page methods shipped in 0.3.x/0.4.x (channel, channel schedule, match,
  country channels, date schedules) are gone; callers must move to the new
  methods.

### Added

- Full SportSnap surface: live scores, fixture lists, single-match views
  (detail, stats, commentaries, channels, extra broadcasts), competitions,
  teams, TV channel directories, news, search and player profiles.

### Changed

- Types regenerated from the `crawlsnap/v1` contract.

### Fixed

- The release workflow no longer breaks on the npm upgrade step: npm is pinned
  to the 11 line and the runner to Node 22, since `npm@latest` now requires a
  newer Node than the runner ships.

[Unreleased]: https://github.com/crawlsnap/crawlsnap-js/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/crawlsnap/crawlsnap-js/releases/tag/v0.5.0
