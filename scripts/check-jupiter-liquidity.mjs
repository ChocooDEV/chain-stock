// Manually triggers the same Jupiter liquidity check the daily Vercel
// cron runs in production (see src/app/api/cron/check-liquidity/route.ts
// and vercel.json) — a thin authenticated HTTP call, not a separate
// reimplementation, so there's only ever one place this logic actually
// lives (src/lib/liquidity.ts).
//
// Usage: node scripts/check-jupiter-liquidity.mjs [baseUrl]
//   Defaults to http://localhost:3000 (needs the dev server running).
//   Pass a deployed URL to check production instead, e.g.:
//   node scripts/check-jupiter-liquidity.mjs https://chain-stock.xyz
//   Requires CRON_SECRET in .env.local (must match whatever's set on the
//   target deployment, if checking anything other than local).

import { readFileSync } from "node:fs";

function loadEnvVar(name) {
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  if (!line) return undefined;
  return line.slice(name.length + 1).trim().replace(/^"|"$/g, "");
}

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const cronSecret = loadEnvVar("CRON_SECRET");
if (!cronSecret) {
  console.error("CRON_SECRET not found in .env.local");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/cron/check-liquidity`, {
  headers: { Authorization: `Bearer ${cronSecret}` },
});
const body = await res.json();

if (!res.ok) {
  console.error(`Request failed (${res.status}):`, body);
  process.exit(1);
}

console.log(`Checked ${body.checked} tickers.`);
console.log(
  body.untradable.length > 0
    ? `Untradable: ${body.untradable.join(", ")}`
    : "All checked tickers have a live route.",
);
if (body.inconclusive.length > 0) {
  console.log(
    `Inconclusive (rate-limited/transient — left unchanged in the DB): ${body.inconclusive.join(", ")}`,
  );
}
