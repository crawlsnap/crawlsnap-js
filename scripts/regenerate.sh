#!/usr/bin/env bash
# Refresh the generated types in src/models.ts from the public OpenAPI contract.
#
# Only the typed models are generated; the hand-written facade (client.ts,
# resources.ts, base.ts, errors.ts, types.ts, index.ts) is never touched.
# `types.ts` re-exports friendly aliases over `models.ts`, so the facade is
# insulated from the generator's exact output shape.
#
# Source of truth: ../crawlsnap-contracts/crawlsnap/v1/openapi.yaml
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACTS="${CONTRACTS_DIR:-$REPO_ROOT/../crawlsnap-contracts}"
SPEC="$CONTRACTS/dist/crawlsnap-v1.yaml"

# 1. Bundle the contract (inlines the ioc-scan data schemas).
( cd "$CONTRACTS" && make bundle )

# 2. Regenerate the pure type file from the bundle (zero runtime, cast-only).
npx -y openapi-typescript@latest "$SPEC" -o "$REPO_ROOT/src/models.ts"

echo "==> Refreshed src/models.ts from $SPEC (facade left intact)"
