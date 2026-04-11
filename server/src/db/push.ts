/**
 * Custom push script that creates tables via Neon's HTTPS driver.
 * Use this instead of `drizzle-kit push` when TCP (port 5432) is blocked.
 *
 * Usage: npx tsx src/db/push.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const statements = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "email_verified" boolean NOT NULL DEFAULT false,
    "image" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token" text NOT NULL UNIQUE,
    "expires_at" timestamp NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "accounts" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "id_token" text,
    "password" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "verifications" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS "saved_repos" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "owner" text NOT NULL,
    "repo" text NOT NULL,
    "branch" text NOT NULL DEFAULT 'main',
    "display_meta" jsonb,
    "added_at" timestamp NOT NULL DEFAULT now(),
    "last_opened_at" timestamp NOT NULL DEFAULT now()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "saved_repos_user_repo_idx" ON "saved_repos" ("user_id", "owner", "repo")`,
];

async function push() {
  console.log("Connecting to Neon via HTTPS...");
  for (const stmt of statements) {
    const tableName = stmt.match(/"(\w+)"/)?.[1];
    await sql(stmt);
    console.log(`  ✓ ${tableName}`);
  }
  console.log("Done — all tables created.");
}

push().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
