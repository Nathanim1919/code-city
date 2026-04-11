import { useState } from "react";
import { useStore } from "../store/useStore";
import { AuthButton } from "./AuthButton";
import { AddRepoModal } from "./AddRepoModal";
import type { LayoutNode } from "../types";

export function Sidebar() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const hoveredBuilding = useStore((s) => s.hoveredBuilding);
  const showEdges = useStore((s) => s.showEdges);
  const showLabels = useStore((s) => s.showLabels);
  const toggleEdges = useStore((s) => s.toggleEdges);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const cityLayout = useStore((s) => s.cityLayout);
  const [showAddRepo, setShowAddRepo] = useState(false);

  const building = selectedBuilding || hoveredBuilding;

  return (
    <div className="sb">
      {/* ── Top: Brand + Add repo (fixed) ── */}
      <div className="sb-top">
        <div className="sb-brand">
          <span className="sb-brand-icon">{"</>"}</span>
          <div>
            <div className="sb-brand-name">CodeCity</div>
            <div className="sb-brand-tag">3D Codebase Explorer</div>
          </div>
        </div>
        <button
          className="sb-add-btn"
          onClick={() => setShowAddRepo(true)}
          title="Load new repository"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showAddRepo && <AddRepoModal onClose={() => setShowAddRepo(false)} />}

      {/* ── Middle: Scrollable content ── */}
      <div className="sb-scroll">
        {/* Project overview */}
        {cityLayout && (
          <div className="sb-block">
            <div className="sb-stats">
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
          <div className="sb-block">
            <div className="sb-empty">
              <span className="sb-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122M5.05 12.95l-2.122 2.122" />
                </svg>
              </span>
              <p>Click or hover a building to inspect it</p>
            </div>
          </div>
        )}

        {/* View toggles */}
        <div className="sb-block">
          <div className="sb-label">Display</div>
          <div className="sb-toggles">
            <Toggle label="Dependencies" checked={showEdges} onChange={toggleEdges} />
            <Toggle label="Labels" checked={showLabels} onChange={toggleLabels} />
          </div>
        </div>

        {/* Language legend */}
        <div className="sb-block">
          <div className="sb-label">Languages</div>
          <div className="sb-langs">
            <Lang color="#3178c6" name="TypeScript" />
            <Lang color="#f7df1e" name="JavaScript" />
            <Lang color="#3776ab" name="Python" />
            <Lang color="#00add8" name="Go" />
            <Lang color="#dea584" name="Rust" />
            <Lang color="#b07219" name="Java" />
          </div>
          <div className="sb-mapping">
            <span>Height = complexity</span>
            <span>Width = lines of code</span>
            <span className="sb-mapping-hot">Red cap = high complexity</span>
          </div>
        </div>
      </div>

      {/* ── Bottom: Auth (fixed) ── */}
      <div className="sb-bottom">
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
    <div className="sb-block sb-inspector">
      {/* File header */}
      <div className="sb-file-header">
        <div className="sb-file-name">{building.fileNode.name}</div>
        <div className="sb-file-path">{building.fileNode.path}</div>
      </div>

      {/* Inline metrics */}
      <div className="sb-metrics">
        <div className="sb-metric">
          <span className="sb-metric-val">{building.fileNode.loc}</span>
          <span className="sb-metric-key">lines</span>
        </div>
        <div className="sb-metric-divider" />
        <div className="sb-metric">
          <span className="sb-metric-val">{building.fileNode.complexity}</span>
          <span className="sb-metric-key">complexity</span>
        </div>
        <div className="sb-metric-divider" />
        <div className="sb-metric">
          <span className="sb-metric-val">{building.fileNode.functions.length}</span>
          <span className="sb-metric-key">functions</span>
        </div>
        <div className="sb-metric-divider" />
        <div className="sb-metric">
          <span className="sb-metric-val sb-metric-lang">{lang}</span>
          <span className="sb-metric-key">lang</span>
        </div>
      </div>

      {/* Functions */}
      {building.fileNode.functions.length > 0 && (
        <div className="sb-section">
          <div className="sb-label">Functions</div>
          <div className="sb-fn-list">
            {building.fileNode.functions.map((fn) => (
              <div key={fn.id} className="sb-fn">
                <span className="sb-fn-name">{fn.name}()</span>
                <span className="sb-fn-meta">{fn.loc}L &middot; C{fn.complexity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {imports.length > 0 && (
        <div className="sb-section">
          <div className="sb-label">
            Imports <span className="sb-count">{imports.length}</span>
          </div>
          <div className="sb-dep-list">
            {imports.map((dep) => (
              <button key={dep.id} className="sb-dep" onClick={() => flyTo(dep)}>
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
        <div className="sb-section">
          <div className="sb-label">
            Imported by <span className="sb-count">{importedBy.length}</span>
          </div>
          <div className="sb-dep-list">
            {importedBy.map((dep) => (
              <button key={dep.id} className="sb-dep" onClick={() => flyTo(dep)}>
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
    <div className="sb-stat">
      <span className="sb-stat-val">{value}</span>
      <span className="sb-stat-label">{label}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button className={`sb-toggle ${checked ? "sb-toggle--on" : ""}`} onClick={onChange}>
      <span className="sb-toggle-dot" />
      <span>{label}</span>
    </button>
  );
}

function Lang({ color, name }: { color: string; name: string }) {
  return (
    <div className="sb-lang">
      <span className="sb-lang-dot" style={{ background: color }} />
      <span>{name}</span>
    </div>
  );
}
