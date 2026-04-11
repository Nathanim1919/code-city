# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CodeCity?

A 3D codebase visualizer that turns GitHub repositories into interactive cities in the browser. Files become buildings (height=complexity, width=LOC, color=language), directories become districts, and imports become glowing arcs. Built with React Three Fiber + Zustand.

## Project Structure

Monorepo with two packages:
- `client/` — React + Vite frontend
- `server/` — Hono + Drizzle backend

Each has its own `package.json` and `node_modules`. Run `pnpm install` in each directory.

## Commands

### Frontend (`client/` directory)
- `pnpm install` — install dependencies
- `pnpm dev` — start Vite dev server (http://localhost:5173)
- `pnpm build` — typecheck with `tsc` then build with Vite
- `pnpm preview` — preview production build

### Backend (`server/` directory)
- `pnpm dev` — start Hono server with tsx watch
- `pnpm build` — typecheck server code
- `pnpm db:push:http` — push schema to Neon via HTTPS (preferred, TCP is blocked)
- `pnpm db:push` — push Drizzle schema via TCP (may fail behind firewalls)
- `pnpm db:migrate` — run Drizzle migrations
- `pnpm db:studio` — open Drizzle Studio

## Architecture

### Data Pipeline (4 stages)
1. **Fetch** (`client/src/parser/githubFetcher.ts`) — GitHub Trees API → file list → parallel raw content fetch
2. **Parse** (`client/src/parser/codeParser.ts`) — Regex-based extraction of functions, imports, exports, complexity per file
3. **Layout** (`client/src/engine/layoutEngine.ts`) — Treemap algorithm: CodeGraph → CityLayout (3D coordinates, building dimensions, colors)
4. **Render** (`client/src/components/CityScene.tsx`) — React Three Fiber scene with buildings, districts, arcs, lighting, fog

### State Management
Single Zustand store at `client/src/store/useStore.ts` manages all app state: code graph data, layout, UI state (selection, hover, search), timeline/git history, branch data, user repos cache, and code preview mode. All actions (fetch repo, load demo, select building, switch branch, etc.) are store methods.

### Key Data Types (`client/src/types/index.ts`)
- `CodeGraph` = `FileNode[]` + `DependencyEdge[]` (parsed code)
- `CityLayout` = `LayoutNode[]` + `LayoutEdge[]` + `District[]` (3D positions)
- `LayoutNode` extends `FileNode` with x/y/z, width/height/depth, color

### Server (`server/`)
Hono backend with Neon PostgreSQL via Drizzle ORM. Auth handled by better-auth (`server/src/auth.ts`). Database schema in `server/src/db/schema.ts`. GitHub repos endpoint at `/api/github/repos` proxies user's GitHub token from the accounts table.

## Extending

- **Add a language**: Add extension in `client/src/parser/codeParser.ts` → `LANGUAGE_MAP`, add color in `client/src/engine/layoutEngine.ts` → `LANGUAGE_COLORS`
- **Add a 3D element**: Create component in `client/src/components/`, add to `CityScene.tsx`, wire state through `client/src/store/useStore.ts`
- **Change layout algorithm**: Modify `client/src/engine/layoutEngine.ts` → `computeLayout()`
