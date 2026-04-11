import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgresJs } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * For `*.neon.tech` we default to `@neondatabase/serverless` (HTTP to Neon’s API on 443).
 * If you see `fetch failed` / `ConnectTimeoutError` from that path, set
 * `DATABASE_USE_NEON_HTTP=0` to use `postgres.js` over TCP (5432) instead.
 * If TCP is blocked instead, keep the default or set `DATABASE_USE_NEON_HTTP=1`.
 */
function useNeonHttpDriver(url: string): boolean {
  if (process.env.DATABASE_USE_NEON_HTTP === "0") return false;
  if (process.env.DATABASE_USE_NEON_HTTP === "1") return true;
  return /\.neon\.tech/i.test(url);
}

export const db = useNeonHttpDriver(connectionString)
  ? drizzleNeonHttp(neon(connectionString), { schema })
  : drizzlePostgresJs(
      postgres(connectionString, {
        connect_timeout: 60,
      }),
      { schema },
    );
