import { CityScene } from "./components/CityScene";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import { CodePreview } from "./components/CodePreview";
import { HelpButton } from "./components/HelpModal";
import { LandingPage } from "./components/LandingPage";
import { useStore } from "./store/useStore";
import "./App.css";

export default function App() {
  const cityLayout = useStore((s) => s.cityLayout);
  const codePreviewMode = useStore((s) => s.codePreviewMode);

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
      {codePreviewMode !== "full" && <Sidebar />}

      {codePreviewMode !== "full" && (
        <div className="main">
          <SearchBar />
          <HelpButton />
          <CityScene />
          <Timeline />
        </div>
      )}

      {codePreviewMode !== "closed" && <CodePreview />}
    </div>
  );
}
