/**
 * Quickstart: enrich a few indicators, page subdomains, handle errors.
 *
 *   export CRAWLSNAP_API_KEY=sk-cs-...
 *   npx tsx examples/quickstart.ts
 */
import { CrawlSnap, NotFoundError, RateLimitError } from "crawlsnap";

const client = new CrawlSnap(); // reads CRAWLSNAP_API_KEY

async function main() {
  // Enrich several indicators concurrently.
  const [ip, domain] = await Promise.all([
    client.vectorSnap.ip("8.8.8.8"),
    client.vectorSnap.domain("google.com"),
  ]);
  console.log("ip:", ip.reputation, ip.as_owner);
  console.log("domain:", domain.reputation);

  // Stream every subdomain across all pages.
  for await (const subdomain of client.subdoSnap.scanIter("example.com")) {
    console.log("subdomain:", subdomain);
  }

  // Typed errors.
  try {
    await client.vectorSnap.hash("not-a-real-hash");
  } catch (err) {
    if (err instanceof NotFoundError) console.log("no data found");
    else if (err instanceof RateLimitError) console.log("retry after", err.retryAfter);
    else throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
