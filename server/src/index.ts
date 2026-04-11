import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { serve } from "@hono/node-server";
import { auth } from "./auth.js";
import { db } from "./db/index.js";
import { accounts } from "./db/schema.js";
import { eq } from "drizzle-orm";

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

// Start server
const port = Number(process.env.PORT) || 3001;

serve({ fetch: app.fetch, port }, () => {
  console.log(`CodeCity API running on http://localhost:${port}`);
});
