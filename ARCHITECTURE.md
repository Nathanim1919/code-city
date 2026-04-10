# CodeCity — Architecture & Vision

## What Is CodeCity?

CodeCity is a **3D codebase explorer** that visualizes any GitHub repository as an interactive city in the browser. Files become buildings, directories become districts, and import relationships become glowing bridges connecting them.

The goal: make codebases *spatial* and *navigable* — so you can understand architecture at a glance instead of reading file trees.

---

## How It Works (User Flow)

```
1. User lands on the app
2. Pastes a GitHub repo URL (or clicks "Explore Demo")
3. App fetches the repo tree + file contents via GitHub API
4. Parser extracts functions, imports, exports, complexity from each file
5. Layout engine maps code metrics → 3D city coordinates (treemap algorithm)
6. React Three Fiber renders the city with lighting, fog, stars
7. User orbits, clicks buildings, searches files, inspects dependencies
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Landing     │  │  3D Scene    │  │  Sidebar   │ │
│  │  Page        │  │  (R3F)       │  │  + Search  │ │
│  │  - URL input │  │  - Buildings │  │  - Stats   │ │
│  │  - Demo btn  │  │  - Edges     │  │  - Details │ │
│  └──────┬───────┘  │  - Districts │  │  - Legend  │ │
│         │          │  - Controls  │  └────────────┘ │
│         ▼          └──────▲───────┘                  │
│  ┌──────────────┐         │                          │
│  │ GitHub       │  ┌──────┴───────┐                  │
│  │ Fetcher      │  │ Layout       │                  │
│  │ - Tree API   │──▶ Engine       │                  │
│  │ - Raw content│  │ - Treemap    │                  │
│  └──────┬───────┘  │ - Metrics→3D │                  │
│         │          └──────▲───────┘                  │
│         ▼                 │                          │
│  ┌──────────────┐         │                          │
│  │ Code Parser  │─────────┘                          │
│  │ - Functions  │                                    │
│  │ - Imports    │    ┌──────────────┐                 │
│  │ - Complexity │    │ Zustand      │                 │
│  └──────────────┘    │ Store        │                 │
│                      │ (global      │                 │
│                      │  state)      │                 │
│                      └──────────────┘                 │
└─────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── main.tsx                    # Entry point, renders <App>
├── App.tsx                     # Root: shows LandingPage or CityScene
├── App.css                     # All styles (dark theme, landing, sidebar, etc.)
│
├── types/index.ts              # Core data types
│   FileNode, FunctionNode, DependencyEdge, CodeGraph,
│   LayoutNode, LayoutEdge, CityLayout, District
│
├── parser/
│   ├── codeParser.ts           # Regex-based AST parsing (functions, imports, complexity)
│   └── githubFetcher.ts        # GitHub API integration (tree + raw file fetching)
│
├── engine/
│   └── layoutEngine.ts         # Treemap algorithm: CodeGraph → CityLayout (3D coords)
│
├── store/
│   └── useStore.ts             # Zustand global state (data, UI state, actions)
│
├── components/
│   ├── LandingPage.tsx         # GitHub URL input, example repos, demo button
│   ├── CityScene.tsx           # Three.js canvas: lighting, stars, fog, camera controls
���   ├── Building.tsx            # Single 3D building (hover, select, complexity glow)
│   ├── DistrictGround.tsx      # Ground plane + label per directory
│   ├── DependencyEdges.tsx     # Bezier curves showing import relationships
│   ├── Sidebar.tsx             # File details panel, stats, legend, toggles
│   └── SearchBar.tsx           # Search files/functions with fly-to
```

---

## Key Design Decisions

### Visual Mapping

| Code Metric       | 3D Property        | Why                                    |
|-------------------|--------------------|----------------------------------------|
| Lines of code     | Building width     | Bigger files = wider buildings          |
| Complexity        | Building height    | Complex files = tall = attention needed |
| Language          | Building color     | Quick visual grouping                   |
| Directory         | District (ground)  | Spatial clustering by module            |
| Import            | Bezier arc         | Shows dependency flow                   |
| High complexity   | Red glowing top    | Immediate hotspot detection             |

### Tech Stack

| Layer      | Tech                      | Why                                          |
|------------|---------------------------|----------------------------------------------|
| Framework  | React + TypeScript + Vite | Fast dev, type safety, instant HMR            |
| 3D         | React Three Fiber + drei  | Declarative Three.js with React lifecycle     |
| State      | Zustand                   | Minimal boilerplate, works great with R3F     |
| Parser     | Regex-based (MVP)         | Runs in browser, no WASM needed. Upgrade path: Tree-sitter WASM |
| Layout     | Treemap (slice-and-dice)  | Efficient space usage, city-like appearance   |
| Data       | GitHub REST API           | No backend needed, works for any public repo  |

---

## Roadmap

### Completed (v0.1)
- [x] GitHub URL input → fetch repo → visualize
- [x] Code parser (functions, imports, exports, complexity)
- [x] Treemap layout engine
- [x] 3D city rendering (buildings, districts, dependency arcs)
- [x] Orbit/pan/zoom camera controls
- [x] Click buildings to inspect (functions, imports, stats)
- [x] Search files/functions with fly-to
- [x] Sample demo project
- [x] Dark theme UI with sidebar

### Completed (v0.2)
- [x] **Git history animation** — Fetches last 30 commits via GitHub API, builds timeline snapshots tracking file additions/modifications/deletions. Timeline scrubber with play/pause/step controls. Buildings animate (grow/shrink/glow green for added, amber for modified, fade for deleted).
- [x] **Code preview panel** — Click a building to see syntax-highlighted source code (PrismJS) in a right-side panel. Function jump bar lets you click any function name to scroll to its definition. Shows file stats, language badge, line numbers.

### Future (v0.3+)
- [ ] Smooth camera fly-to animations
- [ ] Hotspot detection (auto-highlight complex / highly-imported files)
- [ ] File upload (drag-and-drop local folder)
- [ ] GitHub auth for private repos
- [ ] Shareable URLs (`?repo=owner/repo`)
- [ ] Force-directed layout option (more organic city feel)
- [ ] VS Code extension integration
- [ ] AI-powered: "explain this module" using LLM + codebase context
- [ ] Deploy to Vercel

---

## How the 3D Mapping Works

```
                    CodeGraph                          CityLayout
          ┌──────────────────────┐           ┌──────────────────────────┐
          │                      │           │                          │
          │  FileNode[]          │  layout   │  LayoutNode[] (buildings)│
          │  - path, loc,        │──engine──▶│  - x, y, z position     │
          │    complexity,       │           │  - width, height, depth  │
          │    functions,        │           │  - color                 │
          │    imports           │           │                          │
          │                      │           │  District[] (grounds)    │
          │  DependencyEdge[]    │           │  - position, size        │
          │  - source → target   │           │                          │
          │                      │           │  LayoutEdge[] (arcs)     │
          └──────────────────────┘           └──────────────────────────┘

  Building Height = log2(LOC) * 0.8 + log2(complexity) * 1.5
  Building Width  = proportional to LOC (via treemap area)
  Building Color  = language (TS=blue, JS=yellow, Python=blue, Go=cyan...)
  Red Glow Top    = complexity > 15
```

---

## Contributing / Extending

**To add a new language**: Add the extension mapping in `parser/codeParser.ts` → `LANGUAGE_MAP` and add a color in `engine/layoutEngine.ts` → `LANGUAGE_COLORS`.

**To change the layout algorithm**: Modify `engine/layoutEngine.ts` → `computeLayout()`. The treemap can be swapped for force-directed or any spatial algorithm.

**To add a new visual feature**: Create a component in `components/`, add it to `CityScene.tsx`, wire state through `store/useStore.ts`.
