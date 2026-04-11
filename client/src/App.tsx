import { useEffect, useRef } from "react";
import { CityScene } from "./components/CityScene";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { Timeline } from "./components/Timeline";
import { CodePreview } from "./components/CodePreview";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { useStore } from "./store/useStore";
import { fetchGitHubRepo } from "./parser/githubFetcher";

export default function App() {
  const cityLayout = useStore((s) => s.cityLayout);
  const codePreviewMode = useStore((s) => s.codePreviewMode);
  const repoInfo = useStore((s) => s.repoInfo);
  const loadSampleProject = useStore((s) => s.loadSampleProject);
  const loadFiles = useStore((s) => s.loadFiles);
  const setRepoInfo = useStore((s) => s.setRepoInfo);
  const initDone = useRef(false);

  // On mount: check URL for ?repo=owner/repo&branch=main
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const repoParam = params.get("repo");

    if (repoParam) {
      const match = repoParam.match(/^([^/]+)\/([^/]+)$/);
      if (match) {
        const [, owner, repo] = match;
        const branch = params.get("branch") || undefined;
        loadRepoFromUrl(owner, repo, branch);
        return;
      }
    }

    // No URL param — load demo
    if (!cityLayout) loadSampleProject();
  }, []);

  // Sync URL when repoInfo changes
  useEffect(() => {
    if (!repoInfo) {
      // Demo project — clean URL
      if (window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      return;
    }
    const params = new URLSearchParams();
    params.set("repo", `${repoInfo.owner}/${repoInfo.repo}`);
    if (repoInfo.branch && repoInfo.branch !== "main") {
      params.set("branch", repoInfo.branch);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [repoInfo]);

  async function loadRepoFromUrl(owner: string, repo: string, branch?: string) {
    try {
      const files = await fetchGitHubRepo(owner, repo, branch);
      if (Object.keys(files).length === 0) {
        loadSampleProject();
        return;
      }
      const ghInfo = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
        .then((r) => r.json())
        .catch(() => null);
      const resolvedBranch = branch || ghInfo?.default_branch || "main";
      setRepoInfo({ owner, repo, branch: resolvedBranch });
      loadFiles(files, `${owner}/${repo}`);
    } catch {
      // Fallback to demo on error
      loadSampleProject();
    }
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
          <CanvasToolbar />
          <CityScene />
          <Timeline />
        </div>
      )}

      {codePreviewMode !== "closed" && <CodePreview />}
    </div>
  );
}
