import { create } from "zustand";
import type { CityLayout, LayoutNode, LayoutEdge, CodeGraph } from "../types";
import { parseCodebase, generateSampleCodebase } from "../parser/codeParser";
import { computeLayout } from "../engine/layoutEngine";

interface AppState {
  // Data
  codeGraph: CodeGraph | null;
  cityLayout: CityLayout | null;

  // UI state
  selectedBuilding: LayoutNode | null;
  hoveredBuilding: LayoutNode | null;
  showEdges: boolean;
  showLabels: boolean;
  searchQuery: string;
  searchResults: LayoutNode[];
  cameraTarget: [number, number, number] | null;

  // Actions
  loadSampleProject: () => void;
  loadFiles: (files: Record<string, string>, rootPath?: string) => void;
  selectBuilding: (building: LayoutNode | null) => void;
  hoverBuilding: (building: LayoutNode | null) => void;
  toggleEdges: () => void;
  toggleLabels: () => void;
  search: (query: string) => void;
  flyTo: (building: LayoutNode) => void;
}

export const useStore = create<AppState>((set, get) => ({
  codeGraph: null,
  cityLayout: null,
  selectedBuilding: null,
  hoveredBuilding: null,
  showEdges: true,
  showLabels: true,
  searchQuery: "",
  searchResults: [],
  cameraTarget: null,

  loadSampleProject: () => {
    const files = generateSampleCodebase();
    const graph = parseCodebase(files, "sample-project");
    const layout = computeLayout(graph);
    set({ codeGraph: graph, cityLayout: layout, selectedBuilding: null });
  },

  loadFiles: (files, rootPath = "/") => {
    const graph = parseCodebase(files, rootPath);
    const layout = computeLayout(graph);
    set({ codeGraph: graph, cityLayout: layout, selectedBuilding: null });
  },

  selectBuilding: (building) => set({ selectedBuilding: building }),
  hoverBuilding: (building) => set({ hoveredBuilding: building }),
  toggleEdges: () => set((s) => ({ showEdges: !s.showEdges })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

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
}));
