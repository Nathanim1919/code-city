import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { serve } from "@hono/node-server";
import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { accounts, savedRepos } from "./db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// CORS — allow the Vite frontend
app.use(
  "/*",
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "codecity-api" }));

// better-auth handles all /api/auth/* routes
app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// Fetch authenticated user's GitHub repos
app.get("/api/github/repos", async (c) => {
  // Resolve session from the request
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Get the GitHub access token from the accounts table
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!account?.accessToken) {
    return c.json({ error: "No GitHub token found" }, 400);
  }

  // Fetch repos from GitHub API
  const page = Number(c.req.query("page") || "1");
  const res = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=30&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!res.ok) {
    return c.json(
      { error: "Failed to fetch repos from GitHub" },
      res.status as ContentfulStatusCode
    );
  }

  const repos = await res.json();
  return c.json(repos);
});

// ── Saved repos CRUD ──

// GET /api/saved-repos — list user's saved repos
app.get("/api/saved-repos", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const rows = await db
    .select()
    .from(savedRepos)
    .where(eq(savedRepos.userId, session.user.id))
    .orderBy(desc(savedRepos.lastOpenedAt));

  return c.json(rows);
});

// POST /api/saved-repos — save a repo (upsert: if exists, update lastOpenedAt + meta)
app.post("/api/saved-repos", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { owner, repo, branch, displayMeta } = body;

  if (!owner || !repo) return c.json({ error: "owner and repo required" }, 400);

  // Check if already saved
  const [existing] = await db
    .select()
    .from(savedRepos)
    .where(
      and(
        eq(savedRepos.userId, session.user.id),
        eq(savedRepos.owner, owner),
        eq(savedRepos.repo, repo)
      )
    )
    .limit(1);

  if (existing) {
    // Update lastOpenedAt and meta
    await db
      .update(savedRepos)
      .set({ lastOpenedAt: new Date(), displayMeta: displayMeta ?? existing.displayMeta, branch: branch ?? existing.branch })
      .where(eq(savedRepos.id, existing.id));
    return c.json({ ...existing, lastOpenedAt: new Date(), displayMeta: displayMeta ?? existing.displayMeta });
  }

  const row = {
    id: nanoid(),
    userId: session.user.id,
    owner,
    repo,
    branch: branch || "main",
    displayMeta: displayMeta || null,
    addedAt: new Date(),
    lastOpenedAt: new Date(),
  };

  await db.insert(savedRepos).values(row);
  return c.json(row, 201);
});

// DELETE /api/saved-repos/:id — remove a saved repo
app.delete("/api/saved-repos/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param("id");
  await db
    .delete(savedRepos)
    .where(and(eq(savedRepos.id, id), eq(savedRepos.userId, session.user.id)));

  return c.json({ ok: true });
});

// Start server
const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`CodeCity API running on http://localhost:${port}`);
});
