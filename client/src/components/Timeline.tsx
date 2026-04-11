import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export function Timeline() {
  const timeline = useStore((s) => s.timeline);
  const setTimelineIndex = useStore((s) => s.setTimelineIndex);
  const togglePlayback = useStore((s) => s.togglePlayback);
  const tickPlayback = useStore((s) => s.tickPlayback);
  const repoInfo = useStore((s) => s.repoInfo);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeline.isPlaying) {
      intervalRef.current = window.setInterval(() => tickPlayback(), 800);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timeline.isPlaying, tickPlayback]);

  if (!repoInfo || !timeline.isLoaded || timeline.commits.length === 0) return null;

  const current = timeline.commits[timeline.currentIndex];
  const snapshot = timeline.snapshots[timeline.currentIndex];
  const totalCommits = timeline.commits.length;

  const added = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "added").length : 0;
  const modified = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "modified").length : 0;
  const deleted = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "deleted").length : 0;

  const tlBtn = "bg-transparent border-none text-text-muted cursor-pointer p-1.5 rounded-md flex items-center justify-center transition-all duration-150 hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="absolute bottom-[50px] left-4 right-4 bg-black/92 backdrop-blur-[12px] border border-bg-tertiary rounded-[14px] py-3 px-4 flex items-center gap-3.5 z-10">
      <div className="flex items-center gap-1 shrink-0">
        <button className={tlBtn} onClick={() => setTimelineIndex(0)} title="Go to first commit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
        </button>
        <button className={tlBtn} onClick={() => setTimelineIndex(timeline.currentIndex - 1)} disabled={timeline.currentIndex <= 0} title="Previous commit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
        </button>
        <button className="bg-accent text-[#0f172a] w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-none transition-all duration-150 hover:bg-accent-hover" onClick={togglePlayback} title={timeline.isPlaying ? "Pause" : "Play"}>
          {timeline.isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>
        <button className={tlBtn} onClick={() => setTimelineIndex(timeline.currentIndex + 1)} disabled={timeline.currentIndex >= totalCommits - 1} title="Next commit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <button className={tlBtn} onClick={() => setTimelineIndex(totalCommits - 1)} title="Go to latest commit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A1 1 0 0 0 5 3v18a1 1 0 0 0 .536.886z" /></svg>
        </button>
      </div>

      {/* Scrubber */}
      <div className="flex-1 relative h-6 flex items-center">
        <input
          type="range"
          min={0}
          max={totalCommits - 1}
          value={timeline.currentIndex}
          onChange={(e) => setTimelineIndex(Number(e.target.value))}
          className="timeline-slider"
        />
        <div className="absolute inset-0 pointer-events-none">
          {timeline.commits.map((_, i) => (
            <div
              key={i}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer pointer-events-auto transition-all duration-150 ${
                i === timeline.currentIndex ? "w-2 h-2 bg-accent shadow-[0_0_6px_var(--accent)]" :
                i < timeline.currentIndex ? "w-1.5 h-1.5 bg-accent opacity-40" :
                "w-1.5 h-1.5 bg-bg-tertiary"
              }`}
              style={{ left: `${(i / Math.max(totalCommits - 1, 1)) * 100}%` }}
              onClick={() => setTimelineIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Commit info */}
      <div className="shrink-0 max-w-[260px] min-w-[180px]">
        <div className="font-mono text-[0.75rem] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis mb-0.5" title={current?.message}>
          {current?.message || ""}
        </div>
        <div className="flex gap-2 text-[0.65rem] text-text-muted">
          <span className="text-accent">{current?.author}</span>
          <span>{current?.date ? formatDate(current.date) : ""}</span>
          <span className="font-mono">{timeline.currentIndex + 1}/{totalCommits}</span>
        </div>
        <div className="flex gap-1.5 mt-1">
          {added > 0 && <span className="font-mono text-[0.65rem] py-px px-1.5 rounded font-semibold text-success bg-success/15">+{added}</span>}
          {modified > 0 && <span className="font-mono text-[0.65rem] py-px px-1.5 rounded font-semibold text-[#f59e0b] bg-[rgba(245,158,11,0.15)]">~{modified}</span>}
          {deleted > 0 && <span className="font-mono text-[0.65rem] py-px px-1.5 rounded font-semibold text-danger bg-danger/15">-{deleted}</span>}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}
