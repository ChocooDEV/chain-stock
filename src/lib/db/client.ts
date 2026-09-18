import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Pooled connection (the `-pooler` hostname) — the right choice for app
// query traffic, especially serverless/edge routes making one connection
// per request. Migrations use DATABASE_URL_UNPOOLED instead (see
// drizzle.config.ts) — never this client.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
