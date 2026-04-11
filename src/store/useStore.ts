import { create } from "zustand";
import type { CityLayout, LayoutNode, CodeGraph, CommitInfo, TimelineState } from "../types";
import { parseCodebase, generateSampleCodebase } from "../parser/codeParser";
import { computeLayout } from "../engine/layoutEngine";
import { fetchCommitHistory, type CommitHistoryItem } from "../parser/githubFetcher";

export interface GitHubRepoItem {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
}

interface AppState {
  // Data
  codeGraph: CodeGraph | null;
  cityLayout: CityLayout | null;
  files: Record<string, string>; // current loaded file contents
  repoInfo: { owner: string; repo: string; branch: string } | null;

  // Timeline / git history
  timeline: TimelineState;
  buildingStates: Map<string, "added" | "modified" | "deleted" | "unchanged">;

  // User's GitHub repos cache
  userRepos: GitHubRepoItem[];
  userReposLoaded: boolean;

  // UI state
  selectedBuilding: LayoutNode | null;
  hoveredBuilding: LayoutNode | null;
  showEdges: boolean;
  showLabels: boolean;
  searchQuery: string;
  searchResults: LayoutNode[];
  cameraTarget: [number, number, number] | null;

  // Code preview state
  codePreviewMode: "closed" | "normal" | "full"; // closed = hidden, normal = side panel, full = full width

  // Actions
  loadSampleProject: () => void;
  loadFiles: (files: Record<string, string>, rootPath?: string) => void;
  setRepoInfo: (info: { owner: string; repo: string; branch: string }) => void;
  selectBuilding: (building: LayoutNode | null) => void;
  hoverBuilding: (building: LayoutNode | null) => void;
  toggleEdges: () => void;
  toggleLabels: () => void;
  search: (query: string) => void;
  flyTo: (building: LayoutNode) => void;
  setCodePreviewMode: (mode: "closed" | "normal" | "full") => void;

  // User repos actions
  fetchUserRepos: (force?: boolean) => Promise<void>;

  // Timeline actions
  loadHistory: (onProgress?: (msg: string) => void) => Promise<void>;
  setTimelineIndex: (index: number) => void;
  togglePlayback: () => void;
  tickPlayback: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  codeGraph: null,
  cityLayout: null,
  files: {},
  repoInfo: null,

  timeline: {
    commits: [],
    snapshots: [],
    currentIndex: -1,
    isPlaying: false,
    isLoaded: false,
    isLoading: false,
  },
  buildingStates: new Map(),

  selectedBuilding: null,
  hoveredBuilding: null,
  showEdges: true,
  showLabels: true,
  searchQuery: "",
  searchResults: [],
  cameraTarget: null,
  codePreviewMode: "closed",

  userRepos: [],
  userReposLoaded: false,

  fetchUserRepos: async (force = false) => {
    if (!force && get().userReposLoaded) return;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    try {
      const res = await fetch(`${apiBase}/api/github/repos`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      set({ userRepos: data, userReposLoaded: true });
    } catch {
      // Silently fail — popup will show empty state
    }
  },

  loadSampleProject: () => {
    const files = generateSampleCodebase();
    const graph = parseCodebase(files, "sample-project");
    const layout = computeLayout(graph);
    set({
      codeGraph: graph,
      cityLayout: layout,
      files,
      selectedBuilding: null,
      repoInfo: null,
      timeline: { commits: [], snapshots: [], currentIndex: -1, isPlaying: false, isLoaded: false, isLoading: false },
      buildingStates: new Map(),
    });
  },

  loadFiles: (files, rootPath = "/") => {
    const graph = parseCodebase(files, rootPath);
    const layout = computeLayout(graph);
    set({
      codeGraph: graph,
      cityLayout: layout,
      files,
      selectedBuilding: null,
      timeline: { commits: [], snapshots: [], currentIndex: -1, isPlaying: false, isLoaded: false, isLoading: false },
      buildingStates: new Map(),
    });
  },

  setRepoInfo: (info) => set({ repoInfo: info }),

  selectBuilding: (building) => {
    const { files, codePreviewMode } = get();
    const hasCode = building && files[building.fileNode.path];
    set({
      selectedBuilding: building,
      // Auto-open code preview when selecting a building with code, auto-close when deselecting
      codePreviewMode: building && hasCode
        ? (codePreviewMode === "closed" ? "normal" : codePreviewMode)
        : "closed",
    });
  },
  hoverBuilding: (building) => set({ hoveredBuilding: building }),
  toggleEdges: () => set((s) => ({ showEdges: !s.showEdges })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setCodePreviewMode: (mode) => set({ codePreviewMode: mode }),

  search: (query) => {
    const layout = get().cityLayout;
    if (!layout || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    const q = query.toLowerCase();
    const results = layout.buildings.filter(
      (b) =>
        b.fileNode.name.toLowerCase().includes(q) ||
        b.fileNode.path.toLowerCase().includes(q) ||
        b.fileNode.functions.some((f) => f.name.toLowerCase().includes(q))
    );

    set({ searchQuery: query, searchResults: results });
  },

  flyTo: (building) => {
    set({
      cameraTarget: [building.x, building.height + 5, building.z + 10],
      selectedBuilding: building,
    });
  },

  // --- Timeline ---

  loadHistory: async (onProgress) => {
    const { repoInfo } = get();
    if (!repoInfo) return;

    set((s) => ({
      timeline: { ...s.timeline, isLoading: true },
    }));

    try {
      const history = await fetchCommitHistory(
        repoInfo.owner,
        repoInfo.repo,
        repoInfo.branch,
        30,
        onProgress
      );

      // Build commits list
      const commits: CommitInfo[] = history.map((h) => ({
        sha: h.sha,
        message: h.message,
        author: h.author,
        date: h.date,
        filesChanged: h.files
          .filter((f) => f.status !== "removed")
          .map((f) => f.path),
        filesDeleted: h.files
          .filter((f) => f.status === "removed")
          .map((f) => f.path),
      }));

      // Build snapshots: walk through commits and track which files exist
      const allFiles = new Set<string>();
      const snapshots = commits.map((commit, i) => {
        const changes = new Map<string, "added" | "modified" | "deleted">();

        for (const path of commit.filesChanged) {
          if (allFiles.has(path)) {
            changes.set(path, "modified");
          } else {
            changes.set(path, "added");
            allFiles.add(path);
          }
        }
        for (const path of commit.filesDeleted) {
          changes.set(path, "deleted");
          allFiles.delete(path);
        }

        return {
          commitIndex: i,
          commit,
          filePaths: new Set(allFiles),
          fileChanges: changes,
        };
      });

      set({
        timeline: {
          commits,
          snapshots,
          currentIndex: commits.length - 1, // start at latest
          isPlaying: false,
          isLoaded: true,
          isLoading: false,
        },
        buildingStates: new Map(), // no highlights at latest commit
      });
    } catch (err: any) {
      console.error("Failed to load history:", err);
      set((s) => ({
        timeline: { ...s.timeline, isLoading: false },
      }));
    }
  },

  setTimelineIndex: (index) => {
    const { timeline, cityLayout } = get();
    if (!timeline.isLoaded || !cityLayout) return;

    const clamped = Math.max(0, Math.min(index, timeline.snapshots.length - 1));
    const snapshot = timeline.snapshots[clamped];

    // Compute building states for this snapshot
    const states = new Map<string, "added" | "modified" | "deleted" | "unchanged">();
    for (const building of cityLayout.buildings) {
      const change = snapshot.fileChanges.get(building.fileNode.path);
      if (change) {
        states.set(building.id, change);
      } else if (snapshot.filePaths.has(building.fileNode.path)) {
        states.set(building.id, "unchanged");
      } else {
        // File doesn't exist at this point in history — treat as not yet added
        states.set(building.id, "deleted");
      }
    }

    set({
      timeline: { ...timeline, currentIndex: clamped },
      buildingStates: states,
    });
  },

  togglePlayback: () => {
    set((s) => ({
      timeline: { ...s.timeline, isPlaying: !s.timeline.isPlaying },
    }));
  },

  tickPlayback: () => {
    const { timeline } = get();
    if (!timeline.isPlaying || !timeline.isLoaded) return;

    const next = timeline.currentIndex + 1;
    if (next >= timeline.snapshots.length) {
      // Reached end, stop
      set((s) => ({
        timeline: { ...s.timeline, isPlaying: false, currentIndex: s.timeline.snapshots.length - 1 },
      }));
      return;
    }

    get().setTimelineIndex(next);
  },
}));
