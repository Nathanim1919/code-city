# CodeCity

**See your codebase like you've never seen it before.**

CodeCity turns any GitHub repository into an interactive 3D city you can fly through in your browser. Every file becomes a building, every directory becomes a district, and every import becomes a glowing arc connecting them. It's a new way to understand, explore, and present codebases — no installation, no setup, just paste a URL and go.

I built this because reading flat file trees has always felt like trying to understand a city by looking at a spreadsheet of addresses. Code has shape. It has neighborhoods, highways, skyscrapers, and quiet corners. CodeCity makes that visible.

---

## What it looks like

**The city view** — each building is a source file. Height represents complexity, width represents lines of code, and color represents the programming language. Tall red-topped buildings? Those are your most complex files — the ones worth paying attention to.

**The dependency map** — glowing bezier arcs flow between buildings, showing which files import from which. Click a building and only its connections light up, so you can trace how data and logic flow through the system.

**The timeline** — load the git history and scrub through it. Watch the city grow over time. New buildings rise from the ground in green, modified ones glow amber, and deleted files fade away. It's your project's entire evolution in 30 seconds.

**The code view** — expand the panel to get a full IDE-like experience: file tree on the left, syntax-highlighted source code on the right, function jump bar at the top. Click through files without ever leaving the app.

---

## Getting started

```bash
git clone https://github.com/your-username/codecity.git
cd codecity
pnpm install
pnpm dev
```

Open `http://localhost:5173`, paste any public GitHub repo URL, and hit "Build City."

Some good ones to try:

- `expressjs/express` — a clean, mid-sized Node.js project
- `sindresorhus/got` — well-structured TypeScript HTTP client
- `tj/commander.js` — small enough to load fast, interesting dependency graph

Or click "Explore Demo Project" to see a built-in sample immediately.

---

## Features

### Paste any GitHub repo
Enter a URL like `https://github.com/expressjs/express` or just `expressjs/express`. CodeCity fetches the file tree and source code through the GitHub API — no backend, no tokens needed for public repos.

### 3D city visualization
Files are rendered as 3D buildings using a treemap layout algorithm. The visual encoding is intentional:

- **Height** = cyclomatic complexity (tall means complex, pay attention)
- **Width** = lines of code (wide means large)
- **Color** = programming language (blue for TypeScript, yellow for JavaScript, etc.)
- **Red glowing top** = complexity score above 15 (hotspot warning)
- **Districts** = directories, rendered as ground planes with labels

### Dependency arcs
Import relationships are drawn as curved bezier lines between buildings. Select a building to isolate its connections — see what it imports and what imports it.

### Search and fly-to
Search for any file or function name. Results appear in a dropdown — click one and the camera flies to that building in the city.

### Git history animation
Click "Load Git History" to fetch the last 30 commits. A timeline scrubber appears at the bottom with full playback controls:

- Play/pause auto-advance through commits
- Step forward and backward one commit at a time
- Scrub to any point in history
- Buildings glow green (added), amber (modified), or fade out (not yet created)
- Commit message, author, date, and change counts displayed in real time

### Code preview panel
Click any building to open a syntax-highlighted code panel on the right. It supports TypeScript, JavaScript, Python, Go, Rust, Java, CSS, JSON, and Markdown.

Expand it to full screen and you get an IDE-like view:

- **File tree** on the left with folder/file hierarchy, language-colored icons, and expand/collapse
- **Code viewer** on the right with line numbers, function jump bar, and smooth scrolling
- Click any file in the tree to switch what you're reading
- Shrink back to side panel or close entirely

### Interactive controls
- **Left click + drag** to orbit the camera
- **Right click + drag** to pan
- **Scroll** to zoom in and out
- **Click a building** to inspect it (functions, imports, stats in the sidebar)
- **Toggle switches** for dependency arcs and labels

---

## How it works under the hood

The pipeline has four stages:

**1. Fetch** — The GitHub fetcher hits the Trees API to get the full file list, filters to supported source files (skipping node_modules, dist, etc.), and fetches contents in parallel batches from `raw.githubusercontent.com`.

**2. Parse** — A regex-based parser runs over each file to extract functions, imports, exports, and an estimated cyclomatic complexity score. It works across JavaScript, TypeScript, Python, Go, Rust, and Java without needing language-specific tooling. (The upgrade path is Tree-sitter WASM for deeper AST analysis.)

**3. Layout** — A treemap algorithm converts the code graph into 3D coordinates. Files are grouped by directory into districts, then laid out using slice-and-dice partitioning. Code metrics map to building dimensions through logarithmic scaling so the city stays readable even with large variance in file sizes.

**4. Render** — React Three Fiber renders the scene with buildings (RoundedBox geometries), district ground planes, bezier dependency arcs, ambient + directional lighting, fog, a starfield, and an infinite grid. Zustand manages all state, and buildings animate smoothly using per-frame lerping.

---

## Tech stack

| What | Why |
|---|---|
| React + TypeScript | Type safety, component model, ecosystem |
| Vite | Fast builds, instant HMR |
| React Three Fiber | Declarative Three.js that plays well with React state |
| drei | Pre-built Three.js helpers (OrbitControls, Text, RoundedBox, Stars, Grid) |
| Zustand | Dead simple state management, no boilerplate |
| PrismJS | Lightweight syntax highlighting with good language coverage |
| GitHub REST API | No backend needed — everything runs client-side |

---

## Project structure

```
src/
  types/          Data types (FileNode, CodeGraph, CityLayout, etc.)
  parser/         Code analysis + GitHub API integration
  engine/         Treemap layout algorithm
  store/          Zustand global state
  components/     React + R3F components (city, buildings, sidebar, timeline, code preview, file tree)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full deep dive — data flow diagrams, visual mapping tables, and extension guides.

---

## Supported languages

TypeScript, JavaScript, Python, Go, Rust, Java, C, C++, C#, Swift, Kotlin, Ruby, PHP, CSS, HTML, Vue, Svelte, JSON, Markdown.

Adding a new language is two lines of code — one in the parser's extension map, one in the layout engine's color map.

---

## Limitations and known trade-offs

- **GitHub API rate limit**: 60 requests/hour without a token. Large repos with many commits may hit this. Auth token support is planned.
- **File cap**: Fetches up to 150 source files to keep the browser responsive. Very large repos will show a subset.
- **Parser depth**: The regex-based parser is good enough for structure extraction but won't catch every edge case. Tree-sitter WASM is the planned upgrade for production accuracy.
- **No private repos yet**: Currently works with public repositories only.

---

## What's next

- Smooth animated camera fly-to transitions
- Automatic hotspot detection (highlight most complex / most-imported files)
- Drag-and-drop local folder upload
- GitHub token input for private repos and higher rate limits
- Shareable URLs (`codecity.dev/?repo=owner/repo`)
- VS Code extension that syncs cursor position with the 3D view
- AI-powered module explanations using LLM context

---

## Running in production

```bash
pnpm build
pnpm preview
```

The build output is a static site in `dist/` — deploy it anywhere (Vercel, Netlify, GitHub Pages, S3).

---

## Contributing

The codebase is intentionally modular. Each concern lives in its own layer:

- Want to change how code is analyzed? Edit `src/parser/`
- Want to change the city layout? Edit `src/engine/`
- Want to add a new 3D element? Add a component in `src/components/` and wire it into `CityScene.tsx`
- Want to add new state? Extend the Zustand store in `src/store/`

If you're looking for ideas, the roadmap above has plenty of open items.

---

## License

MIT
