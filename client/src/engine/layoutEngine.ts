/**
 * Layout Engine - Converts a CodeGraph into a 3D CityLayout.
 *
 * Uses a treemap-inspired algorithm for district placement
 * and maps code metrics to building dimensions.
 */

import type {
  CodeGraph,
  FileNode,
  CityLayout,
  LayoutNode,
  LayoutEdge,
  District,
} from "../types";

// Color palette by language
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3776ab",
  go: "#00add8",
  rust: "#dea584",
  java: "#b07219",
  css: "#563d7c",
  json: "#292929",
  markdown: "#083fa1",
  unknown: "#6b7280",
};

const DISTRICT_COLORS = [
  "#0d0d0d", "#0f1a12", "#1a0f0f", "#0f0f1a", "#1a1a0f",
  "#120d1a", "#0d1a1a", "#1a120d", "#0d0d14", "#14120d",
];

interface TreemapRect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/**
 * Main layout function: transforms CodeGraph -> CityLayout
 */
export function computeLayout(graph: CodeGraph): CityLayout {
  // Group files by directory (district)
  const directories = groupByDirectory(graph.nodes);

  // Compute district positions using treemap layout
  const districts: District[] = [];
  const buildings: LayoutNode[] = [];
  const buildingMap = new Map<string, LayoutNode>();

  const dirEntries = Object.entries(directories);
  const totalArea = dirEntries.reduce(
    (sum, [, files]) => sum + files.reduce((s, f) => s + Math.max(f.loc, 10), 0),
    0
  );

  // Layout districts in a grid-like treemap
  const districtRects = layoutTreemap(
    dirEntries.map(([name, files]) => ({
      name,
      area: files.reduce((s, f) => s + Math.max(f.loc, 10), 0),
    })),
    { x: 0, z: 0, width: Math.sqrt(totalArea) * 0.8, depth: Math.sqrt(totalArea) * 0.8 }
  );

  dirEntries.forEach(([dirName, files], i) => {
    const rect = districtRects[i];
    const districtColor = DISTRICT_COLORS[i % DISTRICT_COLORS.length];

    const district: District = {
      id: dirName,
      name: dirName.split("/").pop() || dirName,
      x: rect.x,
      z: rect.z,
      width: rect.width,
      depth: rect.depth,
      color: districtColor,
      children: files.map((f) => f.id),
    };
    districts.push(district);

    // Layout buildings within the district
    const padding = 1.5;
    const innerRect: TreemapRect = {
      x: rect.x + padding,
      z: rect.z + padding,
      width: Math.max(rect.width - padding * 2, 4),
      depth: Math.max(rect.depth - padding * 2, 4),
    };

    const buildingRects = layoutTreemap(
      files.map((f) => ({ name: f.id, area: Math.max(f.loc, 5) })),
      innerRect
    );

    files.forEach((file, j) => {
      const bRect = buildingRects[j];
      const height = mapToHeight(file);
      const color = LANGUAGE_COLORS[file.language || "unknown"] || LANGUAGE_COLORS.unknown;

      const building: LayoutNode = {
        id: file.id,
        fileNode: file,
        x: bRect.x + bRect.width / 2,
        y: height / 2, // center Y
        z: bRect.z + bRect.depth / 2,
        width: Math.max(bRect.width * 0.85, 0.5),
        height,
        depth: Math.max(bRect.depth * 0.85, 0.5),
        color,
        districtId: dirName,
      };

      buildings.push(building);
      buildingMap.set(file.id, building);
    });
  });

  // Build edges between buildings
  const edges: LayoutEdge[] = [];
  for (const edge of graph.edges) {
    const source = buildingMap.get(edge.source);
    const target = buildingMap.get(edge.target);
    if (source && target) {
      edges.push({ source, target, weight: edge.weight });
    }
  }

  return { buildings, edges, districts };
}

/**
 * Group files by their parent directory.
 */
function groupByDirectory(nodes: FileNode[]): Record<string, FileNode[]> {
  const groups: Record<string, FileNode[]> = {};

  for (const node of nodes) {
    const parts = node.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "root";

    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(node);
  }

  return groups;
}

/**
 * Map file metrics to building height.
 * Complexity drives height more than LOC (tall = complex = attention needed).
 */
function mapToHeight(file: FileNode): number {
  const locFactor = Math.log2(Math.max(file.loc, 1)) * 0.8;
  const complexityFactor = Math.log2(Math.max(file.complexity, 1)) * 1.5;
  return Math.max(locFactor + complexityFactor, 1);
}

/**
 * Simple treemap layout using the slice-and-dice algorithm.
 */
function layoutTreemap(
  items: { name: string; area: number }[],
  rect: TreemapRect
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [rect];

  // Sort by area descending for better layout
  const sorted = items
    .map((item, i) => ({ ...item, originalIndex: i }))
    .sort((a, b) => b.area - a.area);

  const totalArea = sorted.reduce((s, item) => s + item.area, 0);
  const rects: { rect: TreemapRect; originalIndex: number }[] = [];

  // Use squarified treemap approach
  let currentRect = { ...rect };

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const ratio = totalArea > 0 ? item.area / totalArea : 1 / sorted.length;

    const isWide = currentRect.width >= currentRect.depth;

    if (i === sorted.length - 1) {
      // Last item gets the remaining space
      rects.push({ rect: { ...currentRect }, originalIndex: item.originalIndex });
    } else if (isWide) {
      const sliceWidth = currentRect.width * ratio;
      rects.push({
        rect: {
          x: currentRect.x,
          z: currentRect.z,
          width: Math.max(sliceWidth, 0.5),
          depth: currentRect.depth,
        },
        originalIndex: item.originalIndex,
      });
      currentRect = {
        x: currentRect.x + sliceWidth,
        z: currentRect.z,
        width: currentRect.width - sliceWidth,
        depth: currentRect.depth,
      };
    } else {
      const sliceDepth = currentRect.depth * ratio;
      rects.push({
        rect: {
          x: currentRect.x,
          z: currentRect.z,
          width: currentRect.width,
          depth: Math.max(sliceDepth, 0.5),
        },
        originalIndex: item.originalIndex,
      });
      currentRect = {
        x: currentRect.x,
        z: currentRect.z + sliceDepth,
        width: currentRect.width,
        depth: currentRect.depth - sliceDepth,
      };
    }
  }

  // Restore original order
  const result: TreemapRect[] = new Array(items.length);
  for (const { rect: r, originalIndex } of rects) {
    result[originalIndex] = r;
  }

  return result;
}
