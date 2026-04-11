import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

// ============================================
// better-auth required tables
// ============================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// Saved repos (non-owned repos a user explored)
// ============================================

export const savedRepos = pgTable(
  "saved_repos",
  {
    id: text("id").primaryKey(), // nanoid
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    branch: text("branch").notNull().default("main"),
    displayMeta: jsonb("display_meta").$type<{
      description?: string;
      language?: string;
      stars?: number;
      fileCount?: number;
      loc?: number;
    }>(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    lastOpenedAt: timestamp("last_opened_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("saved_repos_user_repo_idx").on(table.userId, table.owner, table.repo),
  ]
);

// Better Auth’s Drizzle adapter looks up singular model names (user, session, …).
// Table names in PostgreSQL stay plural; these are aliases for the adapter only.
export const user = users;
export const session = sessions;
export const account = accounts;
export const verification = verifications;
