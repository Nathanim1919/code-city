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
 * Neon TCP (5432) often hits CONNECT_TIMEOUT behind firewalls or strict networks.
 * The Neon serverless driver speaks HTTPS (port 443) and avoids that path.
 * Set DATABASE_USE_NEON_HTTP=0 to force TCP postgres.js anyway.
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
