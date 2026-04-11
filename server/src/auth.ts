import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3001";
const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
/** Cross-origin SPA (e.g. Vercel) → API (e.g. Render): OAuth state cookie must be sent on credentialed requests; Lax often breaks this. See https://www.better-auth.com/docs/reference/errors/state_mismatch */
const crossOriginOAuthCookies =
  baseURL.startsWith("https://");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [clientURL],
  // Send OAuth error redirects (e.g. state_mismatch) to the SPA, not the API host
  onAPIError: {
    errorURL: clientURL,
  },
  ...(crossOriginOAuthCookies
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
          },
        },
      }
    : {}),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
