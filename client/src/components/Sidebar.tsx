import { useState } from "react";
import { useStore } from "../store/useStore";
import { AuthButton } from "./AuthButton";
import { RepoDrawer } from "./RepoDrawer";
import type { LayoutNode } from "../types";

export function Sidebar() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const hoveredBuilding = useStore((s) => s.hoveredBuilding);
  const showEdges = useStore((s) => s.showEdges);
  const showLabels = useStore((s) => s.showLabels);
  const toggleEdges = useStore((s) => s.toggleEdges);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const cityLayout = useStore((s) => s.cityLayout);
  const [showRepoDrawer, setShowRepoDrawer] = useState(false);

  const building = selectedBuilding || hoveredBuilding;

  return (
    <div className="w-[var(--sidebar-width)] bg-[linear-gradient(to_right,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.8)_60%,rgba(0,0,0,0.45)_100%)] border-r border-white/4 flex flex-col overflow-hidden">
      {/* ── Top: Brand + Add repo (fixed) ── */}
      <div className="px-[18px] py-4 border-b border-white/4 flex items-center justify-between gap-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-bold text-accent bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.1)] w-8 h-8 flex items-center justify-center rounded-lg shrink-0">
            {"</>"}
          </span>
          <div>
            <div className="font-mono text-base font-bold text-text-primary leading-none">CodeCity</div>
            <div className="text-[0.6rem] text-text-muted tracking-[0.04em] mt-0.5">3D Codebase Explorer</div>
          </div>
        </div>
        <button
          className="w-[30px] h-[30px] flex items-center justify-center bg-white/4 border border-white/8 rounded-lg text-text-secondary cursor-pointer transition-all duration-150 hover:bg-[rgba(96,165,250,0.1)] hover:border-accent hover:text-accent"
          onClick={() => setShowRepoDrawer(true)}
          title="Add repository"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showRepoDrawer && <RepoDrawer onClose={() => setShowRepoDrawer(false)} />}

      {/* ── Middle: Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-color-[var(--bg-tertiary)_transparent]">
        {/* Project overview */}
        {cityLayout && (
          <div className="px-[18px] py-3.5 border-b border-white/4">
            <div className="grid grid-cols-4 gap-px bg-white/3 rounded-lg overflow-hidden border border-white/4">
              <Stat value={cityLayout.buildings.length} label="Files" />
              <Stat value={cityLayout.edges.length} label="Deps" />
              <Stat value={cityLayout.districts.length} label="Modules" />
              <Stat
                value={cityLayout.buildings.reduce((s, b) => s + b.fileNode.loc, 0).toLocaleString()}
                label="LOC"
              />
            </div>
          </div>
        )}

        {/* Selected file */}
        {building ? (
          <FileInspector building={building} />
        ) : (
          <div className="px-[18px] py-3.5 border-b border-white/4">
            <div className="flex flex-col items-center gap-2 py-5 text-text-muted text-center">
              <span className="opacity-40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122M5.05 12.95l-2.122 2.122" />
                </svg>
              </span>
              <p className="text-[0.75rem] leading-[1.4] max-w-[180px]">Click or hover a building to inspect it</p>
            </div>
          </div>
        )}

        {/* View toggles */}
        <div className="px-[18px] py-3.5 border-b border-white/4">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2 flex items-center gap-1.5">Display</div>
          <div className="flex gap-1.5">
            <Toggle label="Dependencies" checked={showEdges} onChange={toggleEdges} />
            <Toggle label="Labels" checked={showLabels} onChange={toggleLabels} />
          </div>
        </div>

        {/* Language legend */}
        <div className="px-[18px] py-3.5 border-b border-white/4">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2 flex items-center gap-1.5">Languages</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-[3px]">
            <Lang color="#3178c6" name="TypeScript" />
            <Lang color="#f7df1e" name="JavaScript" />
            <Lang color="#3776ab" name="Python" />
            <Lang color="#00add8" name="Go" />
            <Lang color="#dea584" name="Rust" />
            <Lang color="#b07219" name="Java" />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[0.55rem] text-text-muted opacity-70">
            <span>Height = complexity</span>
            <span>Width = lines of code</span>
            <span className="text-danger">Red cap = high complexity</span>
          </div>
        </div>
      </div>

      {/* ── Bottom: Auth (fixed) ── */}
      <div className="px-[18px] py-3.5 border-t border-white/4 shrink-0">
        <AuthButton />
      </div>
    </div>
  );
}

/* ── File Inspector ── */

function FileInspector({ building }: { building: LayoutNode }) {
  const cityLayout = useStore((s) => s.cityLayout);
  const flyTo = useStore((s) => s.flyTo);

  const connections =
    cityLayout?.edges.filter(
      (e) => e.source.id === building.id || e.target.id === building.id
    ) || [];

  const imports = connections.filter((e) => e.source.id === building.id).map((e) => e.target);
  const importedBy = connections.filter((e) => e.target.id === building.id).map((e) => e.source);

  const lang = building.fileNode.language || "unknown";

  return (
    <div className="px-[18px] py-3.5 pb-1 border-b border-white/4">
      {/* File header */}
      <div className="mb-2.5">
        <div className="font-mono text-[0.85rem] font-semibold text-text-primary">{building.fileNode.name}</div>
        <div className="font-mono text-[0.6rem] text-text-muted mt-0.5 break-all leading-[1.3]">{building.fileNode.path}</div>
      </div>

      {/* Inline metrics */}
      <div className="flex items-center bg-black/20 border border-white/4 rounded-md py-2">
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-mono text-[0.8rem] font-bold text-text-primary leading-none">{building.fileNode.loc}</span>
          <span className="text-[0.5rem] text-text-muted uppercase tracking-[0.04em]">lines</span>
        </div>
        <div className="w-px h-5 bg-white/6 shrink-0" />
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-mono text-[0.8rem] font-bold text-text-primary leading-none">{building.fileNode.complexity}</span>
          <span className="text-[0.5rem] text-text-muted uppercase tracking-[0.04em]">complexity</span>
        </div>
        <div className="w-px h-5 bg-white/6 shrink-0" />
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-mono text-[0.8rem] font-bold text-text-primary leading-none">{building.fileNode.functions.length}</span>
          <span className="text-[0.5rem] text-text-muted uppercase tracking-[0.04em]">functions</span>
        </div>
        <div className="w-px h-5 bg-white/6 shrink-0" />
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <span className="font-mono text-[0.6rem] font-bold text-accent leading-none">{lang}</span>
          <span className="text-[0.5rem] text-text-muted uppercase tracking-[0.04em]">lang</span>
        </div>
      </div>

      {/* Functions */}
      {building.fileNode.functions.length > 0 && (
        <div className="mt-3">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2 flex items-center gap-1.5">Functions</div>
          <div className="flex flex-col gap-px">
            {building.fileNode.functions.map((fn) => (
              <div key={fn.id} className="flex justify-between items-center py-[5px] px-2 rounded transition-[background] duration-100 hover:bg-white/3">
                <span className="font-mono text-[0.7rem] text-text-secondary">{fn.name}()</span>
                <span className="font-mono text-[0.55rem] text-text-muted">{fn.loc}L &middot; C{fn.complexity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {imports.length > 0 && (
        <div className="mt-3">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2 flex items-center gap-1.5">
            Imports <span className="bg-bg-tertiary px-[5px] rounded-[3px] text-[0.55rem] text-text-secondary font-bold tracking-normal">{imports.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {imports.map((dep) => (
              <button key={dep.id} className="inline-flex items-center gap-1 bg-black/20 border border-white/4 text-text-secondary font-mono text-[0.65rem] py-[3px] px-2 rounded cursor-pointer transition-all duration-[120ms] hover:border-accent hover:text-accent" onClick={() => flyTo(dep)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
                {dep.fileNode.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {importedBy.length > 0 && (
        <div className="mt-3">
          <div className="text-[0.6rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2 flex items-center gap-1.5">
            Imported by <span className="bg-bg-tertiary px-[5px] rounded-[3px] text-[0.55rem] text-text-secondary font-bold tracking-normal">{importedBy.length}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {importedBy.map((dep) => (
              <button key={dep.id} className="inline-flex items-center gap-1 bg-black/20 border border-white/4 text-text-secondary font-mono text-[0.65rem] py-[3px] px-2 rounded cursor-pointer transition-all duration-[120ms] hover:border-accent hover:text-accent" onClick={() => flyTo(dep)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
                {dep.fileNode.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Small components ── */

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center py-2.5 px-1 bg-black/20 first:rounded-l-lg last:rounded-r-lg">
      <span className="font-mono text-[0.95rem] font-bold text-text-primary leading-none">{value}</span>
      <span className="text-[0.55rem] text-text-muted uppercase tracking-[0.04em] mt-1">{label}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      className={`flex items-center gap-1.5 bg-black/20 border text-[0.7rem] py-[5px] px-2.5 rounded-md cursor-pointer transition-all duration-150 ${
        checked ? "border-accent text-accent" : "border-white/4 text-text-muted"
      }`}
      onClick={onChange}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-150 ${
          checked ? "bg-accent shadow-[0_0_4px_var(--accent)]" : "bg-text-muted"
        }`}
      />
      <span>{label}</span>
    </button>
  );
}

function Lang({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[0.65rem] text-text-muted">
      <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
      <span>{name}</span>
    </div>
  );
}
