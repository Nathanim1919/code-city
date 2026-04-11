# CodeCity Roadmap

> Goal: Turn CodeCity from a "cool demo" into a tool real companies and engineers rely on weekly.

---

## Tier 1 — Remove the Toy Ceiling (Must-Have)

These are blockers. Without them, no serious engineer will use CodeCity on their real codebase.

- [ ] **Tree-sitter WASM Parser**
  - Replace regex-based parser with Tree-sitter compiled to WASM
  - Accurate function extraction, real cyclomatic complexity, proper scope resolution
  - Why: Engineers won't trust data they can spot-check as wrong. Trust is everything.

- [ ] **Remove 150 File Cap (Scale to Real Repos)**
  - Implement LOD (Level of Detail) rendering — districts as blocks when zoomed out, expand into buildings on zoom
  - Offload parsing to WebWorkers so the browser doesn't freeze
  - Target: handle 5k-50k file repos smoothly
  - Why: Real repos are large. A tool that can't handle your actual codebase is a toy.

- [ ] **Private Repository Support**
  - Use existing GitHub OAuth token for API calls to private repos
  - Add a "paste your token" flow for unauthenticated users
  - Why: Every company's code is private. This is a hard blocker for adoption.

- [ ] **Shareable URLs**
  - Encode view state in URL params: `codecity.dev/view?repo=owner/repo&file=path&branch=main`
  - Support linking to a specific file/building, camera angle, and branch
  - Why: "Hey look at this hotspot" needs to be one click, not a walkthrough.

---

## Tier 2 — Solve Real Engineering Problems

This is where CodeCity goes from "visualizer" to "tool engineers open weekly."

- [ ] **Hotspot Detection Dashboard**
  - Rank files by: complexity x change frequency x number of authors
  - Surface the top 10 riskiest files in a sidebar panel
  - Why: "Which files are the riskiest?" is the #1 question engineering managers ask.

- [ ] **PR Diff Visualization**
  - Show a pull request as a city diff — new buildings glow green, modified glow amber, deleted fade out
  - Accept a PR number or compare two branches
  - Why: Spatial PR review. Nobody else does this. This is the killer feature.

- [ ] **Team Ownership Overlay (CODEOWNERS)**
  - Parse CODEOWNERS file and color buildings by team
  - Show which team owns the most complexity, where ownership is messy
  - Why: Lets managers see architectural ownership at a glance.

- [ ] **Dependency Health Analysis**
  - Detect and highlight circular dependencies
  - Flag deeply nested import chains
  - Flag files with excessive imports (50+)
  - Why: These are the real architectural smells that cause incidents.

- [ ] **Historical Complexity Trends**
  - Complexity over time per district/file — not just timeline playback, but trend lines
  - "Is this area getting better or worse?"
  - Why: Helps teams measure refactoring progress and spot decay early.

---

## Tier 3 — Make It Stick (Retention & Distribution)

Features that get CodeCity into daily/weekly workflows.

- [ ] **GitHub App / CI Integration**
  - Auto-generate a city snapshot on every PR
  - Post a comment with a link to the diff view
  - Why: This is how you get into team workflows without asking anyone to change behavior.

- [ ] **VS Code Extension**
  - "Show this file in CodeCity" — one click from editor to spatial context
  - Bidirectional: click a building, open in VS Code
  - Why: Meet engineers where they already are.

- [ ] **Embeddable Widget**
  - iframe/component that teams can put in dashboards, READMEs, wiki pages
  - Why: Visibility without extra tooling.

- [ ] **Saved Views & Annotations**
  - Let teams annotate districts: "This is our payment system, don't touch before Q3"
  - Save and name camera positions
  - Why: Turns the city into a shared mental model of the codebase.

- [ ] **Branch Comparison Mode**
  - Side-by-side city view of two branches
  - Before/after a refactor, visually
  - Why: "Did our refactor actually reduce complexity?" — answered in one screenshot.

---

## Build Order (Recommended)

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 1 | Tree-sitter WASM Parser | High | Medium |
| 2 | Remove 150 File Cap (LOD + WebWorkers) | High | High |
| 3 | Private Repo Support | High | Low |
| 4 | Shareable URLs | High | Low |
| 5 | PR Diff Visualization | Very High | Medium |
| 6 | Hotspot Detection Dashboard | High | Medium |
| 7 | GitHub App / CI Integration | High | Medium |
| 8 | Dependency Health Analysis | Medium | Medium |
| 9 | Team Ownership Overlay | Medium | Low |
| 10 | Historical Complexity Trends | Medium | High |
| 11 | VS Code Extension | Medium | High |
| 12 | Saved Views & Annotations | Medium | Medium |
| 13 | Branch Comparison Mode | Medium | Medium |
| 14 | Embeddable Widget | Low | Medium |

---

## Positioning

> Don't compete with SonarQube/CodeClimate on metrics. Compete on **spatial intuition**.
>
> "SonarQube tells you file X has complexity 47. CodeCity shows you that file X is a skyscraper
> in the middle of a district with 30 dependency arcs pointing at it, surrounded by other tall
> buildings your team touches every sprint."
>
> Humans think spatially. Code tools don't. CodeCity bridges that gap.
