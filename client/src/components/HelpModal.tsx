import { useState, useEffect } from "react";

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="hb" onClick={() => setOpen(true)} title="Help">
        <span className="hb-ring" />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>

      {open && <HelpOverlay onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={`ho ${visible ? "ho--in" : ""}`} onClick={onClose}>
      <div className="ho-content" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="ho-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Hero */}
        <div className="ho-hero">
          <div className="ho-logo">
            <span className="ho-logo-glyph">{"</>"}</span>
          </div>
          <h2 className="ho-title">CodeCity</h2>
          <p className="ho-sub">Your codebase, as a city you can walk through</p>
        </div>

        {/* Navigation — visual key layout */}
        <div className="ho-nav">
          <div className="ho-nav-item" style={{ "--delay": "0.05s" } as React.CSSProperties}>
            <div className="ho-key-group">
              <span className="ho-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 1 0 10 10"/></svg>
              </span>
              <span className="ho-key-label">Left Drag</span>
            </div>
            <span className="ho-key-desc">Orbit</span>
          </div>
          <div className="ho-nav-item" style={{ "--delay": "0.1s" } as React.CSSProperties}>
            <div className="ho-key-group">
              <span className="ho-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9l4-4 4 4M5 15l4 4 4-4"/></svg>
              </span>
              <span className="ho-key-label">Right Drag</span>
            </div>
            <span className="ho-key-desc">Pan</span>
          </div>
          <div className="ho-nav-item" style={{ "--delay": "0.15s" } as React.CSSProperties}>
            <div className="ho-key-group">
              <span className="ho-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="6" height="10" rx="3"/><path d="M12 12v4"/></svg>
              </span>
              <span className="ho-key-label">Scroll</span>
            </div>
            <span className="ho-key-desc">Zoom</span>
          </div>
          <div className="ho-nav-item" style={{ "--delay": "0.2s" } as React.CSSProperties}>
            <div className="ho-key-group">
              <span className="ho-key">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 15l-2 5L9 9l11 4-5 2z"/></svg>
              </span>
              <span className="ho-key-label">Click</span>
            </div>
            <span className="ho-key-desc">Inspect</span>
          </div>
        </div>

        {/* Divider */}
        <div className="ho-divider" />

        {/* Visual mapping — the core concept */}
        <div className="ho-map">
          <p className="ho-map-intro">Every file is a building in the city</p>
          <div className="ho-map-grid">
            <MapCard
              delay="0.12s"
              visual={
                <div className="ho-viz ho-viz-height">
                  <div className="ho-bar" style={{ height: "30%" }} /><div className="ho-bar" style={{ height: "65%" }} /><div className="ho-bar ho-bar--accent" style={{ height: "100%" }} />
                </div>
              }
              label="Height"
              value="Complexity"
            />
            <MapCard
              delay="0.16s"
              visual={
                <div className="ho-viz ho-viz-width">
                  <div className="ho-block ho-block--sm" /><div className="ho-block ho-block--md" /><div className="ho-block ho-block--lg" />
                </div>
              }
              label="Width"
              value="Lines of code"
            />
            <MapCard
              delay="0.2s"
              visual={
                <div className="ho-viz ho-viz-color">
                  <span style={{ background: "#3178c6" }} /><span style={{ background: "#f7df1e" }} /><span style={{ background: "#3776ab" }} /><span style={{ background: "#00add8" }} />
                </div>
              }
              label="Color"
              value="Language"
            />
            <MapCard
              delay="0.24s"
              visual={
                <div className="ho-viz ho-viz-glow">
                  <div className="ho-glow-box"><div className="ho-glow-cap" /></div>
                </div>
              }
              label="Red top"
              value="High complexity"
            />
          </div>
        </div>

        {/* Footer tagline */}
        <div className="ho-foot">
          <span className="ho-foot-line" />
          <span className="ho-foot-text">paste a github url to begin</span>
          <span className="ho-foot-line" />
        </div>

      </div>
    </div>
  );
}

function MapCard({ visual, label, value, delay }: { visual: React.ReactNode; label: string; value: string; delay: string }) {
  return (
    <div className="ho-card" style={{ "--delay": delay } as React.CSSProperties}>
      <div className="ho-card-viz">{visual}</div>
      <div className="ho-card-text">
        <span className="ho-card-label">{label}</span>
        <span className="ho-card-value">{value}</span>
      </div>
    </div>
  );
}
