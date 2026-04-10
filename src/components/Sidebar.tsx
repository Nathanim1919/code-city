import { useStore } from "../store/useStore";
import type { LayoutNode } from "../types";

export function Sidebar() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const hoveredBuilding = useStore((s) => s.hoveredBuilding);
  const showEdges = useStore((s) => s.showEdges);
  const showLabels = useStore((s) => s.showLabels);
  const toggleEdges = useStore((s) => s.toggleEdges);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const cityLayout = useStore((s) => s.cityLayout);

  const building = selectedBuilding || hoveredBuilding;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">
          <span className="logo-icon">{"</>"}</span> CodeCity
        </h1>
        <p className="subtitle">3D Codebase Explorer</p>
      </div>

      {/* Controls */}
      <div className="section">
        <h3 className="section-title">View Controls</h3>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={toggleEdges}
          />
          <span>Show Dependencies</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={toggleLabels}
          />
          <span>Show Labels</span>
        </label>
      </div>

      {/* Stats */}
      {cityLayout && (
        <div className="section">
          <h3 className="section-title">Project Stats</h3>
          <div className="stat-grid">
            <StatCard
              label="Files"
              value={cityLayout.buildings.length}
            />
            <StatCard
              label="Dependencies"
              value={cityLayout.edges.length}
            />
            <StatCard
              label="Districts"
              value={cityLayout.districts.length}
            />
            <StatCard
              label="Total LOC"
              value={cityLayout.buildings.reduce(
                (s, b) => s + b.fileNode.loc,
                0
              )}
            />
          </div>
        </div>
      )}

      {/* File details */}
      {building && <BuildingDetails building={building} />}

      {/* Legend */}
      <div className="section">
        <h3 className="section-title">Legend</h3>
        <div className="legend">
          <LegendItem color="#3178c6" label="TypeScript" />
          <LegendItem color="#f7df1e" label="JavaScript" />
          <LegendItem color="#3776ab" label="Python" />
          <LegendItem color="#00add8" label="Go" />
          <LegendItem color="#dea584" label="Rust" />
          <LegendItem color="#b07219" label="Java" />
        </div>
        <div className="legend-note">
          <p>Height = complexity</p>
          <p>Width = lines of code</p>
          <p>Red top = high complexity</p>
        </div>
      </div>
    </div>
  );
}

function BuildingDetails({ building }: { building: LayoutNode }) {
  const cityLayout = useStore((s) => s.cityLayout);
  const flyTo = useStore((s) => s.flyTo);

  // Find connected files
  const connections =
    cityLayout?.edges.filter(
      (e) => e.source.id === building.id || e.target.id === building.id
    ) || [];

  const imports = connections
    .filter((e) => e.source.id === building.id)
    .map((e) => e.target);
  const importedBy = connections
    .filter((e) => e.target.id === building.id)
    .map((e) => e.source);

  return (
    <div className="section file-details">
      <h3 className="section-title">File Details</h3>
      <div className="file-name">{building.fileNode.name}</div>
      <div className="file-path">{building.fileNode.path}</div>

      <div className="stat-grid">
        <StatCard label="LOC" value={building.fileNode.loc} />
        <StatCard label="Complexity" value={building.fileNode.complexity} />
        <StatCard label="Functions" value={building.fileNode.functions.length} />
        <StatCard label="Language" value={building.fileNode.language || "?"} small />
      </div>

      {/* Functions list */}
      {building.fileNode.functions.length > 0 && (
        <div className="subsection">
          <h4>Functions</h4>
          <ul className="func-list">
            {building.fileNode.functions.map((fn) => (
              <li key={fn.id} className="func-item">
                <span className="func-name">{fn.name}()</span>
                <span className="func-loc">{fn.loc} lines</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Imports */}
      {imports.length > 0 && (
        <div className="subsection">
          <h4>Imports ({imports.length})</h4>
          <ul className="dep-list">
            {imports.map((dep) => (
              <li
                key={dep.id}
                className="dep-item"
                onClick={() => flyTo(dep)}
              >
                {dep.fileNode.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Imported by */}
      {importedBy.length > 0 && (
        <div className="subsection">
          <h4>Imported By ({importedBy.length})</h4>
          <ul className="dep-list">
            {importedBy.map((dep) => (
              <li
                key={dep.id}
                className="dep-item"
                onClick={() => flyTo(dep)}
              >
                {dep.fileNode.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: number | string;
  small?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${small ? "small" : ""}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <div className="legend-color" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
