import { CityScene } from "./components/CityScene";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import { LandingPage } from "./components/LandingPage";
import { useStore } from "./store/useStore";
import "./App.css";

export default function App() {
  const cityLayout = useStore((s) => s.cityLayout);

  // Show landing page until a project is loaded
  if (!cityLayout) {
    return <LandingPage />;
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <SearchBar />
        <CityScene />
        <Timeline />

        {/* Keyboard shortcuts hint */}
        <div className="shortcuts-hint">
          <span>Orbit: Left Click + Drag</span>
          <span>Pan: Right Click + Drag</span>
          <span>Zoom: Scroll</span>
        </div>
      </div>
    </div>
  );
}
