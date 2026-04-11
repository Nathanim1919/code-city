import { useState, useMemo } from "react";
import { useStore } from "../store/useStore";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children: TreeNode[];
}

export function FileTree() {
  const files = useStore((s) => s.files);
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const cityLayout = useStore((s) => s.cityLayout);
  const selectBuilding = useStore((s) => s.selectBuilding);

  const tree = useMemo(() => buildTree(Object.keys(files)), [files]);

  const handleFileClick = (path: string) => {
    const building = cityLayout?.buildings.find((b) => b.fileNode.path === path);
    if (building) selectBuilding(building);
  };

  const activePath = selectedBuilding?.fileNode.path || null;

  return (
    <div className="bg-bg-primary border-r border-border flex flex-col overflow-hidden">
      <div className="py-3 px-3.5 border-b border-border flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-text-muted shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Explorer</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin scrollbar-color-[var(--bg-tertiary)_transparent]">
        {tree.map((node) => (
          <TreeItem key={node.path} node={node} depth={0} activePath={activePath} onFileClick={handleFileClick} />
        ))}
      </div>
    </div>
  );
}

function TreeItem({ node, depth, activePath, onFileClick }: { node: TreeNode; depth: number; activePath: string | null; onFileClick: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = node.path === activePath;
  const isFolder = node.type === "folder";

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-[3px] px-2 cursor-pointer transition-[background] duration-100 select-none hover:bg-bg-secondary ${isActive ? "bg-[rgba(96,165,250,0.12)]" : ""}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => isFolder ? setExpanded(!expanded) : onFileClick(node.path)}
      >
        <span className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 text-text-muted ${isFolder ? "" : "invisible"}`}>
          {isFolder && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
        <span className="shrink-0 flex items-center">
          {isFolder ? (expanded ? <FolderOpenIcon /> : <FolderIcon />) : <FileIcon name={node.name} />}
        </span>
        <span className={`font-mono text-[0.75rem] whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? "text-accent" : "text-text-secondary"}`}>{node.name}</span>
      </div>
      {isFolder && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} activePath={activePath} onFileClick={onFileClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", type: "folder", children: [] };
  for (const path of paths.sort()) {
    const parts = path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partPath = parts.slice(0, i + 1).join("/");
      const isFile = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);
      if (!child) { child = { name: part, path: partPath, type: isFile ? "file" : "folder", children: [] }; current.children.push(child); }
      current = child;
    }
  }
  const sortChildren = (node: TreeNode) => {
    node.children.sort((a, b) => { if (a.type !== b.type) return a.type === "folder" ? -1 : 1; return a.name.localeCompare(b.name); });
    node.children.forEach(sortChildren);
  };
  sortChildren(root);
  return root.children;
}

const EXT_COLORS: Record<string, string> = { ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e", py: "#3776ab", go: "#00add8", rs: "#dea584", java: "#b07219", css: "#563d7c", json: "#292929", md: "#083fa1", html: "#e34c26", vue: "#42b883", svelte: "#ff3e00" };

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop() || "";
  const color = EXT_COLORS[ext] || "#64748b";
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}

function FolderIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}

function FolderOpenIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M5 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h9a2 2 0 0 1 2 2v1" /><path d="M20 12H8l-4 8h16l-4-8z" fill="rgba(245,158,11,0.1)" /></svg>;
}
