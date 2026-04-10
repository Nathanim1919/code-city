// Core data types for CodeCity

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string;
  loc: number; // lines of code
  complexity: number; // cyclomatic complexity estimate
  children?: FileNode[];
  functions: FunctionNode[];
  imports: string[]; // paths this file imports
  exports: string[];
}

export interface FunctionNode {
  id: string;
  name: string;
  filePath: string;
  loc: number;
  complexity: number;
  calls: string[]; // function IDs this calls
  startLine: number;
  endLine: number;
}

export interface DependencyEdge {
  source: string; // file path
  target: string; // file path
  weight: number; // number of imports
}

export interface CodeGraph {
  nodes: FileNode[];
  edges: DependencyEdge[];
  rootPath: string;
}

// 3D layout types
export interface LayoutNode {
  id: string;
  fileNode: FileNode;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  districtId: string; // parent directory
}

export interface LayoutEdge {
  source: LayoutNode;
  target: LayoutNode;
  weight: number;
}

export interface CityLayout {
  buildings: LayoutNode[];
  edges: LayoutEdge[];
  districts: District[];
}

export interface District {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  children: string[]; // building IDs
}
