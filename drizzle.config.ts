import { defineConfig } from "drizzle-kit";

// Direct (unpooled) connection for schema migrations — the pooled
// DATABASE_URL routes through PgBouncer in transaction mode, which
// doesn't support the session-level operations drizzle-kit needs. See
// the Neon skill's "Pooled vs direct connections" gotcha.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
