import { useEffect, useRef } from "react";
import { useStore } from "../store/useStore";

export function Timeline() {
  const timeline = useStore((s) => s.timeline);
  const setTimelineIndex = useStore((s) => s.setTimelineIndex);
  const togglePlayback = useStore((s) => s.togglePlayback);
  const tickPlayback = useStore((s) => s.tickPlayback);
  const repoInfo = useStore((s) => s.repoInfo);
  const intervalRef = useRef<number | null>(null);

  // Playback tick
  useEffect(() => {
    if (timeline.isPlaying) {
      intervalRef.current = window.setInterval(() => {
        tickPlayback();
      }, 800);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeline.isPlaying, tickPlayback]);

  // Only show the expanded timeline bar when history is loaded
  if (!repoInfo || !timeline.isLoaded || timeline.commits.length === 0) return null;

  const current = timeline.commits[timeline.currentIndex];
  const snapshot = timeline.snapshots[timeline.currentIndex];
  const totalCommits = timeline.commits.length;

  const added = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "added").length : 0;
  const modified = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "modified").length : 0;
  const deleted = snapshot ? [...snapshot.fileChanges.values()].filter((v) => v === "deleted").length : 0;

  return (
    <div className="timeline-bar">
      <div className="timeline-controls">
        {/* Rewind */}
        <button
          className="timeline-btn"
          onClick={() => setTimelineIndex(0)}
          title="Go to first commit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        {/* Step back */}
        <button
          className="timeline-btn"
          onClick={() => setTimelineIndex(timeline.currentIndex - 1)}
          disabled={timeline.currentIndex <= 0}
          title="Previous commit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        {/* Play / Pause */}
        <button
          className="timeline-btn play-btn"
          onClick={togglePlayback}
          title={timeline.isPlaying ? "Pause" : "Play"}
        >
          {timeline.isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Step forward */}
        <button
          className="timeline-btn"
          onClick={() => setTimelineIndex(timeline.currentIndex + 1)}
          disabled={timeline.currentIndex >= totalCommits - 1}
          title="Next commit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        {/* Fast forward to end */}
        <button
          className="timeline-btn"
          onClick={() => setTimelineIndex(totalCommits - 1)}
          title="Go to latest commit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A1 1 0 0 0 5 3v18a1 1 0 0 0 .536.886z" />
          </svg>
        </button>
      </div>

      {/* Scrubber */}
      <div className="timeline-scrubber">
        <input
          type="range"
          min={0}
          max={totalCommits - 1}
          value={timeline.currentIndex}
          onChange={(e) => setTimelineIndex(Number(e.target.value))}
          className="timeline-slider"
        />
        {/* Commit dots */}
        <div className="timeline-dots">
          {timeline.commits.map((_, i) => (
            <div
              key={i}
              className={`timeline-dot ${i === timeline.currentIndex ? "active" : ""} ${i < timeline.currentIndex ? "past" : ""}`}
              style={{ left: `${(i / Math.max(totalCommits - 1, 1)) * 100}%` }}
              onClick={() => setTimelineIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Commit info */}
      <div className="timeline-info">
        <div className="timeline-commit-msg" title={current?.message}>
          {current?.message || ""}
        </div>
        <div className="timeline-meta">
          <span className="timeline-author">{current?.author}</span>
          <span className="timeline-date">
            {current?.date ? formatDate(current.date) : ""}
          </span>
          <span className="timeline-counter">
            {timeline.currentIndex + 1}/{totalCommits}
          </span>
        </div>
        {/* Change indicators */}
        <div className="timeline-changes">
          {added > 0 && <span className="change-badge added">+{added}</span>}
          {modified > 0 && <span className="change-badge modified">~{modified}</span>}
          {deleted > 0 && <span className="change-badge deleted">-{deleted}</span>}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
