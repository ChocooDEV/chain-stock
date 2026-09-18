import { existsSync } from "node:fs";

// Next.js loads .env.local automatically; a plain Vitest run doesn't, so
// integration tests hitting the real DB (see src/app/api/**/*.test.ts)
// need this to find DATABASE_URL etc. `process.loadEnvFile` is a Node
// built-in (20.6+) — no dotenv dependency needed for one line.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
