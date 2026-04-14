import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { useStore } from "../store/useStore";
import { AuthButton } from "./AuthButton";
import { RepoDrawer } from "./RepoDrawer";
import { useRepoMetrics } from "../hooks/useRepoMetrics";
import type { LayoutNode } from "../types";
import type {
  HotspotFile,
  CouplingFile,
  ModuleCohesion,
  CircularDep,
  LanguageStat,
} from "../hooks/useRepoMetrics";

/* ═══════════════════════════════════════════════════════
   Sidebar — Linear-inspired design
   ═══════════════════════════════════════════════════════ */

export function Sidebar() {
  const selectedBuilding = useStore((s) => s.selectedBuilding);
  const hoveredBuilding = useStore((s) => s.hoveredBuilding);
  const showEdges = useStore((s) => s.showEdges);
  const showLabels = useStore((s) => s.showLabels);
  const toggleEdges = useStore((s) => s.toggleEdges);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const metrics = useRepoMetrics();
  const [showRepoDrawer, setShowRepoDrawer] = useState(false);

  const building = selectedBuilding || hoveredBuilding;

  return (
    <div className="w-[var(--sidebar-width)] bg-[linear-gradient(to_right,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.85)_100%)] border-r border-white/[0.06] flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <Header onAddRepo={() => setShowRepoDrawer(true)} />

      {showRepoDrawer && (
        <RepoDrawer onClose={() => setShowRepoDrawer(false)} />
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {metrics && <HealthOverview metrics={metrics} />}

        {building ? (
          <FileInspector building={building} />
        ) : (
          <EmptyState />
        )}

        {metrics && (
          <CodeIntelligence
            hotspots={metrics.hotspots}
            couplingTop={metrics.couplingTop}
            moduleCohesion={metrics.moduleCohesion}
            circularDeps={metrics.circularDeps}
          />
        )}

        <DisplayControls
          showEdges={showEdges}
          showLabels={showLabels}
          toggleEdges={toggleEdges}
          toggleLabels={toggleLabels}
        />

        {metrics && <LanguageBreakdown languages={metrics.languages} />}
      </div>

      {/* ── Footer: Auth ── */}
      <div className="px-5 py-3.5 border-t border-white/[0.06] shrink-0">
        <AuthButton />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════════ */

function Header({ onAddRepo }: { onAddRepo: () => void }) {
  return (
    <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-bold text-accent bg-accent/[0.08] border border-accent/[0.15] w-9 h-9 flex items-center justify-center rounded-lg shrink-0 select-none">
          {"</>"}
        </span>
        <div>
          <div className="font-mono text-[15px] font-bold text-text-primary leading-none tracking-[-0.01em]">
            CodeCity
          </div>
          <div className="text-xs text-text-muted tracking-[0.01em] mt-1">
            3D Codebase Explorer
          </div>
        </div>
      </div>
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-text-muted cursor-pointer transition-all duration-150 hover:bg-accent/[0.1] hover:border-accent/25 hover:text-accent"
        onClick={onAddRepo}
        title="Add repository"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Health Overview
   ═══════════════════════════════════════════════════════ */

function HealthOverview({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof useRepoMetrics>>;
}) {
  return (
    <SidebarSection>
      {/* Primary stats */}
      <div className="grid grid-cols-4 gap-px bg-white/[0.03] rounded-lg overflow-hidden border border-white/[0.06]">
        <StatCell value={metrics.totalFiles} label="Files" />
        <StatCell value={metrics.totalLoc.toLocaleString()} label="LOC" />
        <StatCell value={metrics.totalDeps} label="Deps" />
        <StatCell value={metrics.totalModules} label="Modules" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-px bg-white/[0.03] rounded-lg overflow-hidden border border-white/[0.06] mt-2.5">
        <StatCell value={metrics.avgComplexity.toFixed(1)} label="Avg Complexity" small />
        <StatCell value={Math.round(metrics.avgLocPerFile).toLocaleString()} label="Avg LOC/File" small />
        <StatCell value={metrics.totalFunctions} label="Functions" small />
      </div>

      {/* Highlight cards */}
      <div className="mt-3 space-y-2">
        {metrics.largestFile && (
          <HighlightCard
            label="Largest file"
            value={metrics.largestFile.fileNode.name}
            detail={`${metrics.largestFile.fileNode.loc.toLocaleString()} lines`}
            building={metrics.largestFile}
          />
        )}
        {metrics.maxComplexityFile && (
          <HighlightCard
            label="Most complex"
            value={metrics.maxComplexityFile.fileNode.name}
            detail={`Complexity ${metrics.maxComplexityFile.fileNode.complexity}`}
            building={metrics.maxComplexityFile}
            variant="warning"
          />
        )}
        {metrics.deepestNesting && (
          <HighlightCard
            label="Longest function"
            value={metrics.deepestNesting.building.fileNode.name}
            detail={`${metrics.deepestNesting.depth} lines span`}
            building={metrics.deepestNesting.building}
          />
        )}
      </div>
    </SidebarSection>
  );
}

function HighlightCard({
  label,
  value,
  detail,
  building,
  variant = "default",
}: {
  label: string;
  value: string;
  detail: string;
  building: LayoutNode;
  variant?: "default" | "warning";
}) {
  const flyTo = useStore((s) => s.flyTo);
  const accentClass =
    variant === "warning"
      ? "hover:border-amber-500/25 hover:bg-amber-500/[0.05]"
      : "hover:border-accent/25 hover:bg-accent/[0.05]";

  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer transition-all duration-150 text-left group ${accentClass}`}
      onClick={() => flyTo(building)}
    >
      <div className="min-w-0">
        <div className="text-[11px] text-text-muted uppercase tracking-[0.05em] mb-1 font-medium">
          {label}
        </div>
        <div className="font-mono text-[13px] text-text-secondary truncate group-hover:text-text-primary transition-colors duration-150">
          {value}
        </div>
      </div>
      <div className="text-xs text-text-muted font-mono shrink-0 ml-3">
        {detail}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   File Inspector
   ═══════════════════════════════════════════════════════ */

function FileInspector({ building }: { building: LayoutNode }) {
  const cityLayout = useStore((s) => s.cityLayout);
  const flyTo = useStore((s) => s.flyTo);

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

  const siblings =
    cityLayout?.buildings.filter(
      (b) => b.districtId === building.districtId && b.id !== building.id
    ) || [];

  const lang = building.fileNode.language || "unknown";

  return (
    <SidebarSection>
      {/* File header */}
      <div className="mb-3.5">
        <div className="font-mono text-[15px] font-semibold text-text-primary leading-snug">
          {building.fileNode.name}
        </div>
        <div className="font-mono text-xs text-text-muted mt-1.5 break-all leading-relaxed opacity-60">
          {building.fileNode.path}
        </div>
      </div>

      {/* Metrics strip */}
      <div className="flex items-stretch bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
        <MetricCell value={building.fileNode.loc} label="Lines" />
        <MetricDivider />
        <MetricCell value={building.fileNode.complexity} label="Complexity" highlight={building.fileNode.complexity > 20} />
        <MetricDivider />
        <MetricCell value={building.fileNode.functions.length} label="Funcs" />
        <MetricDivider />
        <MetricCell value={lang} label="Lang" accent />
      </div>

      {/* Functions */}
      {building.fileNode.functions.length > 0 && (
        <Collapsible
          title="Functions"
          count={building.fileNode.functions.length}
          defaultOpen={building.fileNode.functions.length <= 8}
        >
          <div className="space-y-px">
            {building.fileNode.functions
              .slice()
              .sort((a, b) => b.complexity - a.complexity)
              .map((fn) => {
                const level =
                  fn.complexity > 15 ? "high" : fn.complexity > 8 ? "medium" : "low";
                return (
                  <div
                    key={fn.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-md transition-colors duration-100 hover:bg-white/[0.04] group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          level === "high"
                            ? "bg-red-400"
                            : level === "medium"
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                      />
                      <span className="font-mono text-[13px] text-text-secondary truncate group-hover:text-text-primary transition-colors duration-100">
                        {fn.name}()
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-2">
                      <span className="font-mono text-xs text-text-muted">
                        {fn.loc}L
                      </span>
                      <span
                        className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                          level === "high"
                            ? "text-red-400 bg-red-400/[0.1]"
                            : level === "medium"
                            ? "text-amber-400 bg-amber-400/[0.1]"
                            : "text-text-muted"
                        }`}
                      >
                        C{fn.complexity}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </Collapsible>
      )}

      {/* Imports */}
      {imports.length > 0 && (
        <Collapsible title="Imports" count={imports.length} defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {imports.map((dep) => (
              <DepChip key={dep.id} building={dep} onClick={() => flyTo(dep)} direction="out" />
            ))}
          </div>
        </Collapsible>
      )}

      {/* Imported by */}
      {importedBy.length > 0 && (
        <Collapsible title="Imported by" count={importedBy.length} defaultOpen>
          <div className="flex flex-wrap gap-1.5">
            {importedBy.map((dep) => (
              <DepChip key={dep.id} building={dep} onClick={() => flyTo(dep)} direction="in" />
            ))}
          </div>
        </Collapsible>
      )}

      {/* Sibling files */}
      {siblings.length > 0 && (
        <Collapsible title={`Module: ${building.districtId.split("/").pop() || "root"}`} count={siblings.length}>
          <div className="space-y-px">
            {siblings.slice(0, 12).map((sib) => (
              <button
                key={sib.id}
                className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-md text-left transition-colors duration-100 hover:bg-white/[0.04] group cursor-pointer"
                onClick={() => flyTo(sib)}
              >
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: sib.color }}
                />
                <span className="font-mono text-[13px] text-text-muted truncate group-hover:text-text-secondary transition-colors duration-100">
                  {sib.fileNode.name}
                </span>
                <span className="font-mono text-xs text-text-muted/40 ml-auto shrink-0">
                  {sib.fileNode.loc}L
                </span>
              </button>
            ))}
            {siblings.length > 12 && (
              <div className="text-xs text-text-muted/40 px-2.5 py-1.5">
                +{siblings.length - 12} more files
              </div>
            )}
          </div>
        </Collapsible>
      )}
    </SidebarSection>
  );
}

/* ═══════════════════════════════════════════════════════
   Code Intelligence
   ═══════════════════════════════════════════════════════ */

function CodeIntelligence({
  hotspots,
  couplingTop,
  moduleCohesion,
  circularDeps,
}: {
  hotspots: HotspotFile[];
  couplingTop: CouplingFile[];
  moduleCohesion: ModuleCohesion[];
  circularDeps: CircularDep[];
}) {
  const flyTo = useStore((s) => s.flyTo);
  const hasData = hotspots.length > 0 || couplingTop.length > 0 || circularDeps.length > 0;
  if (!hasData) return null;

  return (
    <SidebarSection>
      <SectionLabel>Code Intelligence</SectionLabel>

      {/* Hotspots */}
      {hotspots.length > 0 && (
        <Collapsible title="Hotspots" count={hotspots.length} badge="risk">
          <div className="space-y-px">
            {hotspots.map((h, i) => (
              <button
                key={h.building.id}
                className="w-full flex items-center gap-2.5 py-1.5 px-2.5 rounded-md text-left transition-colors duration-100 hover:bg-white/[0.04] group cursor-pointer"
                onClick={() => flyTo(h.building)}
              >
                <span className="text-xs text-text-muted/40 font-mono w-4 shrink-0 text-right">
                  {i + 1}
                </span>
                <span className="font-mono text-[13px] text-text-secondary truncate group-hover:text-text-primary transition-colors duration-100">
                  {h.building.fileNode.name}
                </span>
                <span className="ml-auto shrink-0 flex items-center gap-1.5">
                  <span className="w-10 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-red-400/60 metric-bar-fill"
                      style={{ width: `${Math.min((h.score / hotspots[0].score) * 100, 100)}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs text-text-muted/50 w-6 text-right">
                    {h.score}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted/30 mt-2 px-2.5 leading-relaxed">
            Hotspot = complexity x connectivity. High scores indicate risky, hard-to-change files.
          </p>
        </Collapsible>
      )}

      {/* Most coupled */}
      {couplingTop.length > 0 && (
        <Collapsible title="Most Coupled" count={couplingTop.length}>
          <div className="space-y-px">
            {couplingTop.map((c) => (
              <button
                key={c.building.id}
                className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-md text-left transition-colors duration-100 hover:bg-white/[0.04] group cursor-pointer"
                onClick={() => flyTo(c.building)}
              >
                <span className="font-mono text-[13px] text-text-secondary truncate group-hover:text-text-primary transition-colors duration-100">
                  {c.building.fileNode.name}
                </span>
                <span className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="font-mono text-xs text-emerald-400/70" title="Inbound">
                    {c.inbound} in
                  </span>
                  <span className="font-mono text-xs text-accent/70" title="Outbound">
                    {c.outbound} out
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Collapsible>
      )}

      {/* Module cohesion */}
      {moduleCohesion.length > 0 && (
        <Collapsible title="Module Cohesion" count={moduleCohesion.length}>
          <div className="space-y-0.5">
            {moduleCohesion.slice(0, 8).map((m) => {
              const ratio = Math.round(m.cohesionRatio * 100);
              const color =
                ratio >= 60 ? "bg-emerald-400" : ratio >= 30 ? "bg-amber-400" : "bg-red-400";
              return (
                <div
                  key={m.districtId}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-md"
                >
                  <span className="font-mono text-[13px] text-text-muted truncate min-w-0 flex-1">
                    {m.districtName}/
                  </span>
                  <span className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                    <span
                      className={`block h-full rounded-full ${color} metric-bar-fill`}
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="font-mono text-xs text-text-muted/50 w-8 text-right shrink-0">
                    {ratio}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-muted/30 mt-2 px-2.5 leading-relaxed">
            Ratio of internal vs total dependencies. Higher = more self-contained module.
          </p>
        </Collapsible>
      )}

      {/* Circular deps */}
      {circularDeps.length > 0 && (
        <Collapsible title="Circular Dependencies" count={circularDeps.length} badge="issue">
          <div className="space-y-2">
            {circularDeps.slice(0, 5).map((cd, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/[0.04] border border-red-400/[0.1]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/60 shrink-0">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span className="font-mono text-[13px] text-red-300/70 truncate">
                  {cd.cycle.join(" → ")} → {cd.cycle[0]}
                </span>
              </div>
            ))}
          </div>
        </Collapsible>
      )}
    </SidebarSection>
  );
}

/* ═══════════════════════════════════════════════════════
   Display Controls
   ═══════════════════════════════════════════════════════ */

function DisplayControls({
  showEdges,
  showLabels,
  toggleEdges,
  toggleLabels,
}: {
  showEdges: boolean;
  showLabels: boolean;
  toggleEdges: () => void;
  toggleLabels: () => void;
}) {
  return (
    <SidebarSection>
      <SectionLabel>Display</SectionLabel>
      <div className="flex gap-2">
        <Toggle label="Dependencies" checked={showEdges} onChange={toggleEdges} />
        <Toggle label="Labels" checked={showLabels} onChange={toggleLabels} />
      </div>
    </SidebarSection>
  );
}

/* ═══════════════════════════════════════════════════════
   Language Breakdown
   ═══════════════════════════════════════════════════════ */

function LanguageBreakdown({ languages }: { languages: LanguageStat[] }) {
  if (languages.length === 0) return null;

  return (
    <SidebarSection>
      <Collapsible title="Languages" count={languages.length} defaultOpen>
        {/* GitHub-style stacked bar */}
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04] mb-3.5">
          {languages.map((l) => (
            <div
              key={l.language}
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.max(l.percentage, 0.5)}%`,
                background: l.color,
                opacity: 0.85,
              }}
              title={`${l.language}: ${l.percentage.toFixed(1)}%`}
            />
          ))}
        </div>

        {/* Detail rows */}
        <div className="space-y-0.5">
          {languages.map((l) => (
            <div
              key={l.language}
              className="flex items-center gap-2.5 py-1 px-1.5 rounded-md"
            >
              <span
                className="w-2.5 h-2.5 rounded shrink-0"
                style={{ background: l.color }}
              />
              <span className="text-[13px] text-text-secondary capitalize flex-1 min-w-0 truncate">
                {l.language}
              </span>
              <span className="font-mono text-xs text-text-muted/50 shrink-0">
                {l.fileCount} {l.fileCount === 1 ? "file" : "files"}
              </span>
              <span className="font-mono text-[13px] text-text-muted w-12 text-right shrink-0 font-medium">
                {l.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Key */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3.5 pt-3 border-t border-white/[0.04]">
          <KeyHint label="Height" value="complexity" />
          <KeyHint label="Width" value="lines of code" />
          <KeyHint label="Red cap" value="high complexity" variant="danger" />
        </div>
      </Collapsible>
    </SidebarSection>
  );
}

/* ═══════════════════════════════════════════════════════
   Empty State
   ═══════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <SidebarSection>
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-muted/30"
          >
            <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122M5.05 12.95l-2.122 2.122" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-text-muted/50 leading-relaxed">
            Click or hover a building
          </p>
          <p className="text-xs text-text-muted/25 mt-1">
            to inspect file details
          </p>
        </div>
      </div>
    </SidebarSection>
  );
}

/* ═══════════════════════════════════════════════════════
   Primitives
   ═══════════════════════════════════════════════════════ */

function Collapsible({
  title,
  count,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  badge?: "risk" | "issue";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, []);

  useEffect(() => {
    measure();
  }, [open, children, measure]);

  useEffect(() => {
    if (!open) return;
    const observer = new ResizeObserver(measure);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [open, measure]);

  const badgeClass =
    badge === "risk"
      ? "bg-amber-400/[0.1] text-amber-400/80"
      : badge === "issue"
      ? "bg-red-400/[0.1] text-red-400/80"
      : "bg-white/[0.05] text-text-secondary";

  return (
    <div className="mt-3.5">
      <button
        className="w-full flex items-center gap-2 mb-2 cursor-pointer group"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-text-muted/40 collapsible-chevron shrink-0"
          data-state={open ? "open" : "closed"}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-text-muted group-hover:text-text-secondary transition-colors duration-100">
          {title}
        </span>
        {count !== undefined && (
          <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
            {count}
          </span>
        )}
      </button>

      <div
        ref={contentRef}
        className="collapsible-content"
        data-state={open ? "open" : "closed"}
        style={{ maxHeight: open ? (height ?? "auto") : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

function SidebarSection({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-white/[0.06] sidebar-section">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.05em] text-text-muted mb-2.5">
      {children}
    </div>
  );
}

function StatCell({
  value,
  label,
  small = false,
}: {
  value: number | string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col items-center py-3 px-2 bg-black/25">
      <span
        className={`font-mono font-bold text-text-primary leading-none ${
          small ? "text-[15px]" : "text-lg"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-text-muted/50 uppercase tracking-[0.03em] mt-1.5">
        {label}
      </span>
    </div>
  );
}

function MetricCell({
  value,
  label,
  highlight = false,
  accent = false,
}: {
  value: number | string;
  label: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2">
      <span
        className={`font-mono font-bold leading-none ${
          highlight
            ? "text-red-400 text-[15px]"
            : accent
            ? "text-accent text-xs"
            : "text-text-primary text-[15px]"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-text-muted/40 uppercase tracking-[0.03em]">
        {label}
      </span>
    </div>
  );
}

function MetricDivider() {
  return <div className="w-px bg-white/[0.05] self-stretch my-2 shrink-0" />;
}

function DepChip({
  building,
  onClick,
  direction,
}: {
  building: LayoutNode;
  onClick: () => void;
  direction: "in" | "out";
}) {
  return (
    <button
      className="inline-flex items-center gap-1.5 bg-white/[0.02] border border-white/[0.06] text-text-muted font-mono text-[13px] py-1 px-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:border-accent/30 hover:text-accent hover:bg-accent/[0.05]"
      onClick={onClick}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-40"
      >
        {direction === "out" ? (
          <path d="M7 17l9.2-9.2M17 17V7H7" />
        ) : (
          <path d="M17 7l-9.2 9.2M7 7v10h10" />
        )}
      </svg>
      {building.fileNode.name}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`flex items-center gap-2 text-[13px] py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-150 border ${
        checked
          ? "border-accent/30 text-accent bg-accent/[0.08]"
          : "border-white/[0.06] text-text-muted bg-white/[0.02] hover:bg-white/[0.05]"
      }`}
      onClick={onChange}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 transition-all duration-150 ${
          checked ? "bg-accent shadow-[0_0_6px_var(--accent)]" : "bg-text-muted/30"
        }`}
      />
      <span>{label}</span>
    </button>
  );
}

function KeyHint({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger";
}) {
  return (
    <span className="text-xs text-text-muted/30">
      <span className={variant === "danger" ? "text-red-400/40" : ""}>{label}</span>
      <span className="mx-0.5">=</span>
      <span>{value}</span>
    </span>
  );
}
