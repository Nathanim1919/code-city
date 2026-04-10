import { CityScene } from "./components/CityScene";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import { CodePreview } from "./components/CodePreview";
import { LandingPage } from "./components/LandingPage";
import { useStore } from "./store/useStore";
import "./App.css";

export default function App() {
  const cityLayout = useStore((s) => s.cityLayout);
  const codePreviewMode = useStore((s) => s.codePreviewMode);

  // Show landing page until a project is loaded
  if (!cityLayout) {
    return <LandingPage />;
  }

  const layoutClass = [
    "app",
    codePreviewMode === "normal" && "app--code-open",
    codePreviewMode === "full" && "app--code-full",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={layoutClass}>
      {/* Column 1: Sidebar (hidden in full-screen code mode) */}
      {codePreviewMode !== "full" && <Sidebar />}

      {/* Column 2: 3D City (hidden in full-screen code mode) */}
      {codePreviewMode !== "full" && (
        <div className="main">
          <SearchBar />
          <CityScene />
          <Timeline />
          <div className="shortcuts-hint">
            <span>Orbit: Left Click + Drag</span>
            <span>Pan: Right Click + Drag</span>
            <span>Zoom: Scroll</span>
          </div>
        </div>
      )}

      {/* Column 3: Code Preview (visible when open or full) */}
      {codePreviewMode !== "closed" && <CodePreview />}
    </div>
  );
}
