import { useMemo } from "react";
import { useStore } from "../store/useStore";
import type { CityLayout, LayoutNode, LayoutEdge } from "../types";

/* ── Types ── */

export interface LanguageStat {
  language: string;
  color: string;
  fileCount: number;
  loc: number;
  percentage: number; // LOC-based
}

export interface HotspotFile {
  building: LayoutNode;
  score: number; // complexity × connectivity
}

export interface CouplingFile {
  building: LayoutNode;
  inbound: number;
  outbound: number;
  total: number;
}

export interface ModuleCohesion {
  districtId: string;
  districtName: string;
  totalDeps: number;
  internalDeps: number;
  cohesionRatio: number; // 0–1, higher = more cohesive
  fileCount: number;
}

export interface CircularDep {
  cycle: string[]; // file names forming the cycle
}

export interface RepoMetrics {
  totalFiles: number;
  totalLoc: number;
  totalDeps: number;
  totalModules: number;
  totalFunctions: number;
  avgComplexity: number;
  avgLocPerFile: number;
  maxComplexityFile: LayoutNode | null;
  largestFile: LayoutNode | null;
  deepestNesting: { building: LayoutNode; depth: number } | null;
  languages: LanguageStat[];
  hotspots: HotspotFile[];
  couplingTop: CouplingFile[];
  moduleCohesion: ModuleCohesion[];
  circularDeps: CircularDep[];
}

/* ── Language color map (matches layoutEngine) ── */

const LANG_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3776ab",
  go: "#00add8",
  rust: "#dea584",
  java: "#b07219",
  css: "#563d7c",
  json: "#718096",
  markdown: "#718096",
  unknown: "#4a5568",
};

/* ── Circular dependency detection (DFS) ── */

function findCircularDeps(
  buildings: LayoutNode[],
  edges: LayoutEdge[]
): CircularDep[] {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source.id) || [];
    list.push(e.target.id);
    adj.set(e.source.id, list);
  }

  const nameMap = new Map<string, string>();
  for (const b of buildings) nameMap.set(b.id, b.fileNode.name);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: CircularDep[] = [];
  const path: string[] = [];

  function dfs(node: string) {
    if (cycles.length >= 10) return; // cap at 10 cycles
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).map((id) => nameMap.get(id) || id);
          cycles.push({ cycle });
        }
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const b of buildings) {
    if (!visited.has(b.id)) dfs(b.id);
  }

  return cycles;
}

/* ── Compute deepest function nesting ── */

function computeDeepestNesting(buildings: LayoutNode[]) {
  let best: { building: LayoutNode; depth: number } | null = null;

  for (const b of buildings) {
    for (const fn of b.fileNode.functions) {
      const depth = fn.endLine - fn.startLine;
      if (!best || depth > best.depth) {
        best = { building: b, depth };
      }
    }
  }

  return best;
}

/* ── Main hook ── */

export function useRepoMetrics(): RepoMetrics | null {
  const cityLayout = useStore((s) => s.cityLayout);

  return useMemo(() => {
    if (!cityLayout) return null;

    const { buildings, edges, districts } = cityLayout;

    // ── Basic counts ──
    const totalFiles = buildings.length;
    const totalLoc = buildings.reduce((s, b) => s + b.fileNode.loc, 0);
    const totalDeps = edges.length;
    const totalModules = districts.length;
    const totalFunctions = buildings.reduce((s, b) => s + b.fileNode.functions.length, 0);

    // ── Averages ──
    const avgComplexity =
      totalFiles > 0
        ? buildings.reduce((s, b) => s + b.fileNode.complexity, 0) / totalFiles
        : 0;
    const avgLocPerFile = totalFiles > 0 ? totalLoc / totalFiles : 0;

    // ── Extremes ──
    const largestFile =
      buildings.length > 0
        ? buildings.reduce((max, b) => (b.fileNode.loc > max.fileNode.loc ? b : max))
        : null;

    const maxComplexityFile =
      buildings.length > 0
        ? buildings.reduce((max, b) =>
            b.fileNode.complexity > max.fileNode.complexity ? b : max
          )
        : null;

    // ── Deepest nesting ──
    const deepestNesting = computeDeepestNesting(buildings);

    // ── Language breakdown (by LOC) ──
    const langMap = new Map<string, { fileCount: number; loc: number }>();
    for (const b of buildings) {
      const lang = b.fileNode.language || "unknown";
      const existing = langMap.get(lang) || { fileCount: 0, loc: 0 };
      existing.fileCount++;
      existing.loc += b.fileNode.loc;
      langMap.set(lang, existing);
    }

    const languages: LanguageStat[] = Array.from(langMap.entries())
      .map(([language, data]) => ({
        language,
        color: LANG_COLORS[language] || LANG_COLORS.unknown,
        fileCount: data.fileCount,
        loc: data.loc,
        percentage: totalLoc > 0 ? (data.loc / totalLoc) * 100 : 0,
      }))
      .sort((a, b) => b.loc - a.loc);

    // ── Coupling scores ──
    const inbound = new Map<string, number>();
    const outbound = new Map<string, number>();
    for (const e of edges) {
      outbound.set(e.source.id, (outbound.get(e.source.id) || 0) + 1);
      inbound.set(e.target.id, (inbound.get(e.target.id) || 0) + 1);
    }

    const couplingAll: CouplingFile[] = buildings.map((b) => {
      const ib = inbound.get(b.id) || 0;
      const ob = outbound.get(b.id) || 0;
      return { building: b, inbound: ib, outbound: ob, total: ib + ob };
    });
    const couplingTop = couplingAll
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // ── Hotspots: high complexity × high connectivity ──
    const hotspots: HotspotFile[] = buildings
      .map((b) => {
        const connectivity = (inbound.get(b.id) || 0) + (outbound.get(b.id) || 0);
        const score = b.fileNode.complexity * Math.max(connectivity, 1);
        return { building: b, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // ── Module cohesion ──
    const districtBuildings = new Map<string, Set<string>>();
    for (const b of buildings) {
      const set = districtBuildings.get(b.districtId) || new Set();
      set.add(b.id);
      districtBuildings.set(b.districtId, set);
    }

    const moduleCohesion: ModuleCohesion[] = districts
      .map((d) => {
        const members = districtBuildings.get(d.id) || new Set();
        let internal = 0;
        let total = 0;

        for (const e of edges) {
          if (members.has(e.source.id) || members.has(e.target.id)) {
            total++;
            if (members.has(e.source.id) && members.has(e.target.id)) {
              internal++;
            }
          }
        }

        return {
          districtId: d.id,
          districtName: d.name,
          totalDeps: total,
          internalDeps: internal,
          cohesionRatio: total > 0 ? internal / total : 0,
          fileCount: members.size,
        };
      })
      .filter((m) => m.totalDeps > 0)
      .sort((a, b) => b.cohesionRatio - a.cohesionRatio);

    // ── Circular dependencies ──
    const circularDeps = findCircularDeps(buildings, edges);

    return {
      totalFiles,
      totalLoc,
      totalDeps,
      totalModules,
      totalFunctions,
      avgComplexity,
      avgLocPerFile,
      maxComplexityFile,
      largestFile,
      deepestNesting,
      languages,
      hotspots,
      couplingTop,
      moduleCohesion,
      circularDeps,
    };
  }, [cityLayout]);
}
