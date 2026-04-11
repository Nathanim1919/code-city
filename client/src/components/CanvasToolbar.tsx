import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export function CanvasToolbar() {
  const repoInfo = useStore((s) => s.repoInfo);
  const timeline = useStore((s) => s.timeline);
  const loadHistory = useStore((s) => s.loadHistory);

  // No toolbar for sample project
  if (!repoInfo) return null;

  return (
    <div className="canvas-toolbar">
      <BranchSelector />
      {/* Timeline trigger */}
      {!timeline.isLoaded && !timeline.isLoading && (
        <button
          className="ct-btn"
          onClick={() => loadHistory()}
          title="Load Git History"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      )}
      {timeline.isLoading && (
        <button className="ct-btn ct-btn--loading" disabled>
          <div className="loading-spinner" style={{ width: 16, height: 16 }} />
        </button>
      )}
    </div>
  );
}

function BranchSelector() {
  const repoInfo = useStore((s) => s.repoInfo);
  const branches = useStore((s) => s.branches);
  const branchesLoaded = useStore((s) => s.branchesLoaded);
  const fetchBranches = useStore((s) => s.fetchBranches);
  const switchBranch = useStore((s) => s.switchBranch);

  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch branches on first open
  useEffect(() => {
    if (open && !branchesLoaded) {
      fetchBranches();
    }
  }, [open, branchesLoaded, fetchBranches]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!repoInfo) return null;

  const handleSwitch = async (branch: string) => {
    if (branch === repoInfo.branch) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setOpen(false);
    try {
      await switchBranch(branch);
    } finally {
      setSwitching(false);
    }
  };

  const filtered = filter
    ? branches.filter((b) => b.toLowerCase().includes(filter.toLowerCase()))
    : branches;

  return (
    <div className="branch-selector" ref={dropdownRef}>
      <button
        className={`ct-btn ct-branch-btn ${switching ? "ct-btn--loading" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        title="Switch branch"
      >
        {switching ? (
          <div className="loading-spinner" style={{ width: 14, height: 14 }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        )}
        <span className="ct-branch-name">{repoInfo.branch}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="branch-dropdown">
          <div className="branch-dropdown-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Filter branches..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
          </div>
          <div className="branch-dropdown-list">
            {!branchesLoaded && (
              <div className="branch-dropdown-state">
                <div className="loading-spinner" style={{ width: 14, height: 14 }} />
              </div>
            )}
            {branchesLoaded && filtered.length === 0 && (
              <div className="branch-dropdown-state">No branches found</div>
            )}
            {filtered.map((b) => (
              <button
                key={b}
                className={`branch-item ${b === repoInfo.branch ? "branch-item--active" : ""}`}
                onClick={() => handleSwitch(b)}
              >
                {b === repoInfo.branch && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{b}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
