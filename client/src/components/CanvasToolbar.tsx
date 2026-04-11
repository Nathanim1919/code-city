import { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export function CanvasToolbar() {
  const repoInfo = useStore((s) => s.repoInfo);
  const timeline = useStore((s) => s.timeline);
  const loadHistory = useStore((s) => s.loadHistory);

  if (!repoInfo) return null;

  const ctBtn = "h-[34px] flex items-center justify-center px-2.5 bg-black/70 backdrop-blur-[8px] border border-white/8 rounded-[9px] text-text-secondary cursor-pointer transition-all duration-150 hover:bg-black/85 hover:border-accent hover:text-accent";

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
      <BranchSelector />
      {!timeline.isLoaded && !timeline.isLoading && (
        <button className={ctBtn} onClick={() => loadHistory()} title="Load Git History">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      )}
      {timeline.isLoading && (
        <button className={`${ctBtn} pointer-events-none opacity-70`} disabled>
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

  useEffect(() => { if (open && !branchesLoaded) fetchBranches(); }, [open, branchesLoaded, fetchBranches]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false); };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!repoInfo) return null;

  const handleSwitch = async (branch: string) => {
    if (branch === repoInfo.branch) { setOpen(false); return; }
    setSwitching(true);
    setOpen(false);
    try { await switchBranch(branch); } finally { setSwitching(false); }
  };

  const filtered = filter ? branches.filter((b) => b.toLowerCase().includes(filter.toLowerCase())) : branches;

  const ctBtn = "h-[34px] flex items-center justify-center px-2.5 bg-black/70 backdrop-blur-[8px] border border-white/8 rounded-[9px] text-text-secondary cursor-pointer transition-all duration-150 hover:bg-black/85 hover:border-accent hover:text-accent";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`${ctBtn} gap-1.5 font-mono text-[0.72rem] ${switching ? "pointer-events-none opacity-70" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        title="Switch branch"
      >
        {switching ? (
          <div className="loading-spinner" style={{ width: 14, height: 14 }} />
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
        )}
        <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{repoInfo.branch}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 w-60 max-h-80 bg-bg-secondary border border-white/8 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-[slideUp_0.15s_ease-out]">
          <div className="flex items-center gap-2 py-2 px-3 border-b border-white/6 text-text-muted shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input type="text" placeholder="Filter branches..." value={filter} onChange={(e) => setFilter(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-text-primary font-mono text-[0.72rem] placeholder:text-text-muted" autoFocus />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {!branchesLoaded && <div className="flex items-center justify-center p-4 text-text-muted text-[0.75rem]"><div className="loading-spinner" style={{ width: 14, height: 14 }} /></div>}
            {branchesLoaded && filtered.length === 0 && <div className="flex items-center justify-center p-4 text-text-muted text-[0.75rem]">No branches found</div>}
            {filtered.map((b) => (
              <button
                key={b}
                className={`flex items-center gap-2 w-full py-2 px-3 bg-transparent border-none border-b border-white/3 font-mono text-[0.72rem] cursor-pointer text-left transition-[background] duration-100 hover:bg-white/4 hover:text-text-primary ${b === repoInfo.branch ? "text-accent" : "text-text-secondary"}`}
                onClick={() => handleSwitch(b)}
              >
                {b === repoInfo.branch && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>}
                <span>{b}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
