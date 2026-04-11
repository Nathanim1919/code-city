import { useEffect } from "react";
import { CityScene } from "./components/CityScene";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import { CodePreview } from "./components/CodePreview";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { useStore } from "./store/useStore";
import "./App.css";

export default function App() {
  const cityLayout = useStore((s) => s.cityLayout);
  const codePreviewMode = useStore((s) => s.codePreviewMode);
  const loadSampleProject = useStore((s) => s.loadSampleProject);

  // Auto-load demo project on first mount
  useEffect(() => {
    if (!cityLayout) {
      loadSampleProject();
    }
  }, []);

  const layoutClass = [
    "app",
    codePreviewMode === "normal" && "app--code-open",
    codePreviewMode === "full" && "app--code-full",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={layoutClass}>
      {codePreviewMode !== "full" && <Sidebar />}

      {codePreviewMode !== "full" && (
        <div className="main">
          <SearchBar />
          <CanvasToolbar />
          <CityScene />
          <Timeline />
        </div>
      )}

      {codePreviewMode !== "closed" && <CodePreview />}
    </div>
  );
}
